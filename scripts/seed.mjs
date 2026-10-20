// scripts/seed.mjs
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('.env.local에 Supabase 환경 변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUBJECT_MAP = {
  1: '소프트웨어 설계',
  2: '소프트웨어 개발',
  3: '데이터베이스 구축',
  4: '프로그래밍 언어 활용',
  5: '정보시스템 구축 관리'
};

function getSubject(number) {
  if (number <= 20) return SUBJECT_MAP[1];
  if (number <= 40) return SUBJECT_MAP[2];
  if (number <= 60) return SUBJECT_MAP[3];
  if (number <= 80) return SUBJECT_MAP[4];
  return SUBJECT_MAP[5];
}

async function run() {
  const content = fs.readFileSync('raw_questions.txt', 'utf8');
  
  // 회차 단위 분할
  const rawSessions = content.split(/정보처리기사 (?:필기 최신 )?기출문제/g).filter(Boolean);
  const parsedRecords = [];

  for (let sIdx = 0; sIdx < rawSessions.length; sIdx++) {
    const sessionText = rawSessions[sIdx];
    const sessionNum = sIdx + 1; // 1회, 2회, 3회

    // 정답표 영역 분리
    const answerTableMatch = sessionText.match(/(?:필기 기출문제 정답|최신 기출문제 정답)[\s\S]*?(?=\d{2}\s+[①②③④]|$)/);
    const answers = {};

    // 01 ② 형식 정답 파싱
    const ansMatches = [...sessionText.matchAll(/(\d{2,3})\s+([①②③④])/g)];
    for (const m of ansMatches) {
      const qNum = parseInt(m[1], 10);
      const ansChar = m[2];
      const ansNum = { '①': 1, '②': 2, '③': 3, '④': 4 }[ansChar];
      if (ansNum && !answers[qNum]) {
        answers[qNum] = ansNum;
      }
    }

    // 해설 파싱: "01 ②\n해설내용..."
    const explanations = {};
    const expBlocks = sessionText.split(/\n(?=\d{2,3}\s+[①②③④])/);
    for (const b of expBlocks) {
      const headerMatch = b.match(/^(\d{2,3})\s+[①②③④]\s*\n([\s\S]*)/);
      if (headerMatch) {
        const qNum = parseInt(headerMatch[1], 10);
        explanations[qNum] = headerMatch[2].trim();
      }
    }

    // 문제 본문 파싱 (01 문제... ①... ②... ③... ④...)
    for (let q = 1; q <= 100; q++) {
      const qPrefix = String(q).padStart(2, '0');
      const nextQPrefix = String(q + 1).padStart(2, '0');

      const qRegex = new RegExp(`(?:^|\\n)${qPrefix}\\s*([\\s\\S]*?)(?=(?:\\n${nextQPrefix}\\s)|필기|최신|$)`);
      const qMatch = sessionText.match(qRegex);

      if (qMatch) {
        const rawBody = qMatch[1].trim();
        const optMatch = rawBody.match(/([①②③④][\s\S]*)/);

        let questionText = rawBody;
        let options = [];

        if (optMatch) {
          questionText = rawBody.substring(0, optMatch.index).trim();
          const optString = optMatch[1];
          const optItems = optString.split(/[①②③④]/).map(s => s.trim()).filter(Boolean);
          options = optItems.slice(0, 4);
        }

        if (options.length === 4) {
          parsedRecords.push({
            session: sessionNum,
            number: q,
            subject: getSubject(q),
            question: questionText,
            options: options,
            answer: answers[q] || 1,
            explanation: explanations[q] || ''
          });
        }
      }
    }
  }

  console.log(` 총 ${parsedRecords.length}개의 정형화된 문제를 추출했습니다.`);

  // 50개 단위 배치 삽입
  for (let i = 0; i < parsedRecords.length; i += 50) {
    const chunk = parsedRecords.slice(i, i + 50);
    const { error } = await supabase.from('cbt_questions').upsert(chunk, { onConflict: 'session,number' });
    if (error) {
      console.error('DB 삽입 에러:', error);
    } else {
      console.log(`[${i + chunk.length} / ${parsedRecords.length}] 주입 완료...`);
    }
  }

  console.log('🎉 모든 기출문제 DB 업로드가 완료되었습니다!');
}

run();