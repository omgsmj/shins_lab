import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderName, session, score, isPassed, timeSpent, wrongAnswers } = body;

    // 1. 시험 응시 이력 저장
    const { data: historyData, error: historyError } = await supabase
      .from('cbt_exam_histories')
      .insert({
        folder_name: folderName,
        session: Number(session) || 1,
        score: Number(score),
        is_passed: Boolean(isPassed),
        time_spent: Number(timeSpent) || 0
      })
      .select('id')
      .single();

    if (historyError || !historyData) {
      console.error('History insert error:', historyError);
      return NextResponse.json({ success: false, error: historyError?.message || '이력 저장 실패' }, { status: 500 });
    }

    const historyId = historyData.id;

    // 2. 틀린 문제가 있는 경우 오답 항목 일괄 삽입
    if (Array.isArray(wrongAnswers) && wrongAnswers.length > 0) {
      const records = wrongAnswers.map((item: { questionId: number; userAnswer: number }) => ({
        history_id: historyId,
        question_id: item.questionId,
        user_answer: item.userAnswer
      }));

      const { error: wrongError } = await supabase
        .from('cbt_wrong_answers')
        .insert(records);

      if (wrongError) {
        console.error('Wrong answers insert error:', wrongError);
        return NextResponse.json({ success: false, error: wrongError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, historyId });
  } catch (err: unknown) {
    console.error('Submit API exception:', err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '서버 오류' }, { status: 500 });
  }
}