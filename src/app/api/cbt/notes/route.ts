import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get('historyId');

    if (!historyId) {
      return NextResponse.json({ success: false, error: 'historyId가 필요합니다.' }, { status: 400 });
    }

    // 1. 해당 회차 오답 목록 가져오기
    const { data: wrongData, error: wrongError } = await supabase
      .from('cbt_wrong_answers')
      .select('id, question_id, user_answer')
      .eq('history_id', Number(historyId));

    if (wrongError) {
      return NextResponse.json({ success: false, error: wrongError.message }, { status: 500 });
    }

    if (!wrongData || wrongData.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. 문제 원본 매핑
    const questionIds = wrongData.map((w) => w.question_id);
    const { data: questionsData, error: qError } = await supabase
      .from('cbt_questions')
      .select('*')
      .in('id', questionIds);

    if (qError) {
      return NextResponse.json({ success: false, error: qError.message }, { status: 500 });
    }

    const qMap = new Map((questionsData || []).map((q) => [q.id, q]));

    const combined = wrongData.map((w) => ({
      id: w.id,
      question_id: w.question_id,
      user_answer: w.user_answer,
      question: qMap.get(w.question_id) || {
        id: w.question_id,
        session: 0,
        number: 0,
        subject: '미확인',
        question: '삭제되었거나 불러올 수 없는 문제입니다.',
        options: [],
        answer: 1,
        explanation: ''
      }
    }));

    return NextResponse.json({ success: true, data: combined });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '서버 오류' }, { status: 500 });
  }
}