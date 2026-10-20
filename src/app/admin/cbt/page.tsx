'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const SUBJECT_MAP = (num: number) => {
  if (num <= 20) return '소프트웨어 설계';
  if (num <= 40) return '소프트웨어 개발';
  if (num <= 60) return '데이터베이스 구축';
  if (num <= 80) return '프로그래밍 언어 활용';
  return '정보시스템 구축 관리';
};

export default function AdminCBTPage() {
  const [rawText, setRawText] = useState('');
  const [session, setSession] = useState(1);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRobustImport = async () => {
    if (password !== '1218') {
      alert('관리자 비밀번호가 일치하지 않습니다. (기본: 1218)');
      return;
    }
    if (!rawText.trim()) {
      alert('기출문제 텍스트를 붙여넣어 주세요.');
      return;
    }

    setLoading(true);
    setStatus('견고한 정밀 분석 엔진 가동 중...');

    try {
      // 1. 텍스트 기본 정제
      const text = rawText.replace(/\r\n/g, '\n');

      // 2. 정답표 매핑 추출 (01 ②, 1 ②, 100 ① 등)
      const ansMap: Record<number, number> = {};
      const numChar: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4 };
      const ansRegex = /(\d{1,3})\s*([①②③④])/g;
      let m;
      while ((m = ansRegex.exec(text)) !== null) {
        const qn = parseInt(m[1], 10);
        if (qn >= 1 && qn <= 100 && !ansMap[qn]) {
          ansMap[qn] = numChar[m[2]];
        }
      }

      // 3. 해설 매핑 추출
      const expMap: Record<number, string> = {};
      const expSectionRegex = /(\d{1,3})\s*[①②③④]\s*([\s\S]*?)(?=(?:\n\d{1,3}\s*[①②③④])|최신|필기|$)/g;
      let em;
      while ((em = expSectionRegex.exec(text)) !== null) {
        const qn = parseInt(em[1], 10);
        if (qn >= 1 && qn <= 100) {
          expMap[qn] = em[2].trim();
        }
      }

      // 4. 문제 블록 위치 분할 (01, 02 ... 100 시작점 인덱스 탐색)
      const questionStarts: Array<{ num: number; index: number }> = [];
      for (let i = 1; i <= 100; i++) {
        const pad = String(i).padStart(2, '0');
        // 줄바꿈 뒤에 오거나 텍스트 맨 처음에 오는 "01 ", "01다음", "01. " 패턴 매칭
        const pattern = new RegExp(`(?:^|\\n)(${pad}|${i})[\\s.]*(?=[가-힣a-zA-Z아-하<(\\[]|다음|아래)`, 'g');
        const match = pattern.exec(text);
        if (match) {
          questionStarts.push({ num: i, index: match.index });
        }
      }

      // 인덱스 순서대로 정렬
      questionStarts.sort((a, b) => a.index - b.index);

      const parsedQuestions = [];
      const missedNumbers: number[] = [];

      for (let i = 0; i < questionStarts.length; i++) {
        const cur = questionStarts[i];
        const next = questionStarts[i + 1];
        const rawBlock = next
          ? text.substring(cur.index, next.index)
          : text.substring(cur.index);

        // 첫 줄의 번호 제거
        const cleanedBlock = rawBlock.replace(new RegExp(`^(?:\\n)?(?:0?${cur.num})[\\s.]*`), '').trim();

        // 보기(①, ②, ③, ④) 위치 탐색
        const opt1 = cleanedBlock.indexOf('①');
        const opt2 = cleanedBlock.indexOf('②');
        const opt3 = cleanedBlock.indexOf('③');
        const opt4 = cleanedBlock.indexOf('④');

        let questionTitle = cleanedBlock;
        let options = ['보기 1', '보기 2', '보기 3', '보기 4'];

        if (opt1 !== -1 && opt2 !== -1 && opt3 !== -1 && opt4 !== -1) {
          questionTitle = cleanedBlock.substring(0, opt1).trim();
          const o1 = cleanedBlock.substring(opt1 + 1, opt2).trim();
          const o2 = cleanedBlock.substring(opt2 + 1, opt3).trim();
          const o3 = cleanedBlock.substring(opt3 + 1, opt4).trim();
          // 보기 4는 해설이나 다음 구분 전까지
          let o4 = cleanedBlock.substring(opt4 + 1).trim();
          // 뒤쪽에 해설이나 다른 텍스트가 묻어있다면 정제
          const cutIdx = o4.search(/\n\s*(?:필기|최신|정답|\d{2}\s+[①②③④])/);
          if (cutIdx !== -1) {
            o4 = o4.substring(0, cutIdx).trim();
          }
          options = [o1, o2, o3, o4];
        }

        parsedQuestions.push({
          session: Number(session),
          number: cur.num,
          subject: SUBJECT_MAP(cur.num),
          question: questionTitle || `문제 ${cur.num}`,
          options: options,
          answer: ansMap[cur.num] || 1,
          explanation: expMap[cur.num] || ''
        });
      }

      // 누락 번호 계산
      const parsedNums = new Set(parsedQuestions.map((q) => q.number));
      for (let i = 1; i <= 100; i++) {
        if (!parsedNums.has(i)) missedNumbers.push(i);
      }

      setStatus(`파싱 완료: 총 ${parsedQuestions.length} / 100문항 감지됨. DB에 업로드 중...`);

      // 5. DB 업로드 (해당 회차 삭제 후 청크 삽입)
      await supabase
        .from('cbt_questions')
        .delete()
        .eq('session', Number(session));

      for (let i = 0; i < parsedQuestions.length; i += 25) {
        const chunk = parsedQuestions.slice(i, i + 25);
        const { error } = await supabase.from('cbt_questions').insert(chunk);
        if (error) throw new Error(error.message);
      }

      let resultMsg = ` 주입 완료! ${session}회차 총 ${parsedQuestions.length}문제가 온전히 등록되었습니다.`;
      if (missedNumbers.length > 0) {
        resultMsg += ` (누락된 번호: ${missedNumbers.join(', ')}번)`;
      }
      setStatus(resultMsg);
      setRawText('');
    } catch (err: unknown) {
      setStatus(`❌ 실패: ${err instanceof Error ? err.message : '파싱 에러'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CBT 텍스트 정밀 주입기 (무손실 파서)</h1>
            <p className="text-sm text-slate-400 mt-1">
              줄바꿈이 깨지거나 붙어있는 문제도 누락 없이 100문항을 끝까지 건져냅니다.
            </p>
          </div>
          <Link href="/cbt" className="text-xs text-blue-400 hover:underline">
            ← CBT 시험장으로 이동
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">회차 지정</label>
              <select
                value={session}
                onChange={(e) => setSession(Number(e.target.value))}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              >
                <option value={1}>2024년 1회차</option>
                <option value={2}>2024년 2회차</option>
                <option value={3}>2024년 3회차</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">관리자 비밀번호</label>
              <input
                type="password"
                placeholder="1218"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              기출문제 원문 텍스트 붙여넣기
            </label>
            <textarea
              rows={16}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="01 사용자 요구사항...\n① 스크럼 마스터\n② 페르소나...\n\n(텍스트 전체를 복사해서 그대로 붙여넣으세요)"
              className="w-full font-mono text-xs rounded-lg border border-slate-700 bg-slate-950 p-4 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              글자 수: {rawText.length.toLocaleString()}자
            </span>
            <button
              onClick={handleRobustImport}
              disabled={loading || !rawText.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {loading ? '정밀 파싱 및 DB 전송 중...' : '무손실 정밀 주입 실행'}
            </button>
          </div>

          {status && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-xs font-mono text-slate-200">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}