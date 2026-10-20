import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SUBJECT_MAP = (num: number) => {
  if (num <= 20) return '소프트웨어 설계';
  if (num <= 40) return '소프트웨어 개발';
  if (num <= 60) return '데이터베이스 구축';
  if (num <= 80) return '프로그래밍 언어 활용';
  return '정보시스템 구축 관리';
};

export async function POST(request: NextRequest) {
  try {
    const { rawText, session, adminPassword } = await request.json();

    const expectedPassword = process.env.ADMIN_PASSWORD || '1218';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ success: false, error: '관리자 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    if (!rawText || !session) {
      return NextResponse.json({ success: false, error: '데이터와 회차 정보가 누락되었습니다.' }, { status: 400 });
    }

    const ansMap: Record<number, number> = {};
    const ansMatches = [...rawText.matchAll(/(\d{1,3})\s+([①②③④])/g)];
    const numChar: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4 };
    ansMatches.forEach((m) => {
      const qn = parseInt(m[1], 10);
      if (qn >= 1 && qn <= 100) ansMap[qn] = numChar[m[2]];
    });

    const expMap: Record<number, string> = {};
    const expBlocks = rawText.split(/\n(?=\d{2,3}\s+[①②③④])/);
    expBlocks.forEach((b: string) => {
      const m = b.match(/^(\d{2,3})\s+[①②③④]\s*([\s\S]*)/);
      if (m) {
        const qn = parseInt(m[1], 10);
        expMap[qn] = m[2].trim();
      }
    });

    const parsedQuestions = [];
    for (let i = 1; i <= 100; i++) {
      const cur = String(i).padStart(2, '0');
      const next = String(i + 1).padStart(2, '0');
      const reg = new RegExp(`(?:^|\\n)${cur}[\\s.]([\\s\\S]*?)(?=(?:\\n${next}[\\s.])|필기|최신|정답|$)`);
      const match = rawText.match(reg);

      if (match) {
        const fullQ = match[1].trim();
        const splitOpts = fullQ.split(/[①②③④]/);
        if (splitOpts.length >= 5) {
          parsedQuestions.push({
            session: Number(session),
            number: i,
            subject: SUBJECT_MAP(i),
            question: splitOpts[0].trim(),
            options: splitOpts.slice(1, 5).map((o: string) => o.trim()),
            answer: ansMap[i] || 1,
            explanation: expMap[i] || ''
          });
        }
      }
    }

    if (parsedQuestions.length === 0) {
      return NextResponse.json({ success: false, error: '텍스트에서 문제를 추출하지 못했습니다. 형식을 확인하세요.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cbt_questions')
      .upsert(parsedQuestions, { onConflict: 'session,number' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: parsedQuestions.length,
      message: `${session}회차 총 ${parsedQuestions.length}개 문제가 성공적으로 주입되었습니다.`
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '서버 오류' }, { status: 500 });
  }
}