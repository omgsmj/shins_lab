import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. 기존 데이터 조회
    const { data: existing, error: selectError } = await supabase
      .from('cbt_questions')
      .select('*')
      .limit(1);

    if (selectError) {
      return NextResponse.json({ success: false, error: selectError.message }, { status: 500 });
    }

    // 2. 데이터가 없으면 검증용 1번 문제 생성
    if (!existing || existing.length === 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('cbt_questions')
        .insert([
          {
            session: 1,
            number: 1,
            subject: '소프트웨어설계',
            question: '소프트웨어 생명주기 모델 중 폭포수 모델(Waterfall Model)의 특징으로 가장 거리가 먼 것은?',
            options: [
              '각 단계가 끝난 후 다음 단계를 수행한다.',
              '모형의 적용 경험과 성공 사례가 많다.',
              '요구사항 변경이 용이하여 개발 도중 피드백 반영이 쉽다.',
              '단계별 정의가 분명하고 전체 과정의 이해가 용이하다.'
            ],
            answer: 3,
            explanation: '폭포수 모델은 순차적 모델로, 요구사항 변경에 유연하게 대처하기 어렵습니다.'
          }
        ])
        .select();

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: '연동 성공: 검증용 샘플 문제가 DB에 등록되었습니다.',
        data: inserted
      });
    }

    return NextResponse.json({
      success: true,
      message: '연동 성공: DB에 이미 문제가 존재합니다.',
      data: existing
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 서버 에러';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}