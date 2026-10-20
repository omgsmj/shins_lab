import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session = searchParams.get('session') || '1';

    const { data: questions, error } = await supabase
      .from('cbt_questions')
      .select('*')
      .eq('session', parseInt(session, 10))
      .order('number', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: questions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '서버 에러';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}