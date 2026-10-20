// scripts/import.js
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SUBJECT_MAP = (num) => {
  if (num <= 20) return '소프트웨어 설계';
  if (num <= 40) return '소프트웨어 개발';
  if (num <= 60) return '데이터베이스 구축';
  if (num <= 80) return '프로그래밍 언어 활용';
  return '정보시스템 구축 관리';
};

async function main() {
  const text = fs.readFileSync('raw_questions.txt', 'utf-8');

  // 회차 분할
  const rawParts = text.split(/정보처리기사\s+(?:필기\s+최신\s+)?기출문제/);
  const sessionTexts = rawParts.filter(p => p.trim().length > 100);

  const allQuestions = [];

  sessionTexts.forEach((st, sIdx) => {
    const session = sIdx + 1;

    // 1. 정답 맵 추출
    const ansMap = {};
    const ansMatches = [...st.matchAll(/(\d{1,3})\s+([①②③④])/g)];
    const numChar = { '①': 1, '②': 2, '③': 3, '④': 4 };
    ansMatches.forEach(m => {
      const qn = parseInt(m[1], 10);
      if (qn >= 1 && qn <= 100) ansMap[qn] = numChar[m[2]];
    });

    // 2. 해설 맵 추출
    const expMap = {};
    const expBlocks = st.split(/\n(?=\d{2,3}\s+[①②③④])/);
    expBlocks.forEach(b => {
      const m = b.match(/^(\d{2,3})\s+[①②③④]\s*([\s\S]*)/);
      if (m) {
        const qn = parseInt(m[1], 10);
        expMap[qn] = m[2].trim();
      }
    });

    // 3. 문제 본문 및 보기 추출
    for (let i = 1; i <= 100; i++) {
      const cur = String(i).padStart(2, '0');
      const next = String(i + 1).padStart(2, '0');
      const reg = new RegExp(`(?:^|\\n)${cur}[\\s.]([\\s\\S]*?)(?=(?:\\n${next}[\\s.])|필기|최신|정답|$)`);
      const match = st.match(reg);

      if (match) {
        const fullQ = match[1].trim();
        const splitOpts = fullQ.split(/[①②③④]/);
        if (splitOpts.length >= 5) {
          const qText = splitOpts[0].trim();
          const options = splitOpts.slice(1, 5).map(o => o.trim());

          allQuestions.push({
            session: session,
            number: i,
            subject: SUBJECT_MAP(i),
            question: qText,
            options: options,
            answer: ansMap[i] || 1,
            explanation: expMap[i] || ''
          });
        }
      }
    }
  });

  console.log(`파싱 완료된 총 문제 수: ${allQuestions.length}개`);

  if (allQuestions.length === 0) {
    console.error('문제가 추출되지 않았습니다. 텍스트 포맷을 확인하세요.');
    return;
  }

  // Supabase에 50개씩 나눠서 Upsert
  for (let i = 0; i < allQuestions.length; i += 50) {
    const chunk = allQuestions.slice(i, i + 50);
    const { error } = await supabase
      .from('cbt_questions')
      .upsert(chunk, { onConflict: 'session,number' });
    
    if (error) {
      console.error(`청크 주입 실패 [${i}]:`, error.message);
    } else {
      console.log(`주입 진행 중... ${i + chunk.length} / ${allQuestions.length}`);
    }
  }

  console.log('🎉 전체 기출문제 DB 업로드 완료!');
}

main();