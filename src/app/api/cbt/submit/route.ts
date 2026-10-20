import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { folderName, session, score, isPassed, timeSpent, wrongAnswers } = await request.json();

    // 1. 시험 기록 폴더 생성
    const { data: history, error: historyError } = await supabase
      .from('cbt_exam_histories')
      .insert([
        {
          folder_name: folderName,
          session,
          score,
          is_passed: isPassed,
          time_spent_seconds: timeSpent
        }
      ])
      .select('id')
      .single();

    if (historyError) throw historyError;

    // 2. 오답 상세 내역 일괄 삽입
    if (wrongAnswers && wrongAnswers.length > 0) {
      const wrongRecords = wrongAnswers.map((w: any) => ({
        history_id: history.id,
        question_id: w.questionId,
        user_answer: w.userAnswer
      }));

      const { error: wrongError } = await supabase
        .from('cbt_wrong_answers')
        .insert(wrongRecords);

      if (wrongError) throw wrongError;
    }

    return NextResponse.json({ success: true, historyId: history.id });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '에러' }, { status: 500 });
  }
}