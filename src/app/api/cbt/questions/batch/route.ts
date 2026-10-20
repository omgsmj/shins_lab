import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, adminPassword } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || '1218';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ success: false, error: '관리자 인증 실패' }, { status: 401 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ success: false, error: '주입할 문제 데이터 배열이 비어 있습니다.' }, { status: 400 });
    }

    // 데이터 유효성 정제
    const formatted = questions.map((q) => ({
      session: Number(q.session),
      number: Number(q.number),
      subject: String(q.subject || '공통'),
      question: String(q.question),
      options: q.options,
      answer: Number(q.answer),
      explanation: String(q.explanation || '')
    }));

    // Supabase 일괄 삽입
    const { data, error } = await supabase
      .from('cbt_questions')
      .insert(formatted)
      .select('id, session, number');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${data.length}개의 문제가 성공적으로 주입되었습니다.`,
      count: data.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '서버 에러';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}