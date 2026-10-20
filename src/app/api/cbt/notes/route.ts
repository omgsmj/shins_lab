import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: histories, error } = await supabase
      .from('cbt_exam_histories')
      .select(`
        id,
        folder_name,
        session,
        score,
        is_passed,
        created_at,
        cbt_wrong_answers (
          id,
          user_answer,
          cbt_questions (
            id,
            number,
            subject,
            question,
            options,
            answer,
            explanation
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: histories });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '조회 실패' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID 누락' }, { status: 400 });

    const { error } = await supabase.from('cbt_exam_histories').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : '삭제 실패' }, { status: 500 });
  }
}