import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, session, number, subject, question, options, answer, explanation, adminPassword } = body;

    // 관리자 비밀번호 검증 (환경변수 또는 지정 비밀번호)
    const expectedPassword = process.env.ADMIN_PASSWORD || '1218';
    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ success: false, error: '관리자 인증 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    if (!session || !number || !subject || !question || !options || !answer) {
      return NextResponse.json({ success: false, error: '필수 입력 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 1. 기존 문제 수정 (id 존재 시)
    if (id) {
      const { data, error } = await supabase
        .from('cbt_questions')
        .update({
          session,
          number,
          subject,
          question,
          options,
          answer,
          explanation: explanation || ''
        })
        .eq('id', id)
        .select();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: '문제가 성공적으로 수정되었습니다.', data });
    }

    // 2. 신규 문제 등록 (id 부재 시)
    const { data, error } = await supabase
      .from('cbt_questions')
      .insert([
        {
          session,
          number,
          subject,
          question,
          options,
          answer,
          explanation: explanation || ''
        }
      ])
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '신규 문제가 등록되었습니다.', data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '서버 에러';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}