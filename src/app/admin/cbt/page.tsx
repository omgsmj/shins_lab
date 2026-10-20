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

  const handleClientSideImport = async () => {
    // 1. 관리자 비밀번호 검증 (클라이언트 단 1218 확인)
    if (password !== '1218') {
      alert('관리자 비밀번호가 일치하지 않습니다. (기본: 1218)');
      return;
    }
    if (!rawText.trim()) {
      alert('기출문제 텍스트를 붙여넣어 주세요.');
      return;
    }

    setLoading(true);
    setStatus('텍스트 분석 및 정규화 진행 중...');

    try {
      // 2. 정답 매핑 추출 (01 ②, 1 ② 등)
      const ansMap: Record<number, number> = {};
      const ansMatches = [...rawText.matchAll(/(\d{1,3})\s+([①②③④])/g)];
      const numChar: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4 };
      
      ansMatches.forEach((m) => {
        const qn = parseInt(m[1], 10);
        if (qn >= 1 && qn <= 100 && !ansMap[qn]) {
          ansMap[qn] = numChar[m[2]];
        }
      });

      // 3. 해설 매핑 추출
      const expMap: Record<number, string> = {};
      const expBlocks = rawText.split(/\n(?=\d{1,3}\s+[①②③④])/);
      expBlocks.forEach((b: string) => {
        const m = b.match(/^(\d{1,3})\s+[①②③④]\s*([\s\S]*)/);
        if (m) {
          const qn = parseInt(m[1], 10);
          expMap[qn] = m[2].trim();
        }
      });

      // 4. 지문 및 4지선다 파싱
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
        throw new Error('텍스트에서 문제를 추출하지 못했습니다. 문제 번호(01, 02...)와 보기(①, ②...)를 확인하세요.');
      }

      setStatus(`총 ${parsedQuestions.length}개 문제 파싱 완료. Supabase DB로 직접 전송 중...`);

      // 5. 서버 API 없이 Supabase 클라이언트로 25개씩 청크 분할 주입 (네트워크 부하 방지)
      for (let i = 0; i < parsedQuestions.length; i += 25) {
        const chunk = parsedQuestions.slice(i, i + 25);
        const { error } = await supabase
          .from('cbt_questions')
          .upsert(chunk, { onConflict: 'session,number' });

        if (error) {
          throw new Error(`DB 주입 실패: ${error.message}`);
        }
        setStatus(`진행 중: ${Math.min(i + 25, parsedQuestions.length)} / ${parsedQuestions.length} 문항 주입 완료...`);
      }

      setStatus(` 주입 완료! ${session}회차 총 ${parsedQuestions.length}개 문제가 DB에 등록되었습니다.`);
      setRawText('');
    } catch (err: unknown) {
      setStatus(`❌ 실패: ${err instanceof Error ? err.message : '처리 중 오류 발생'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CBT 텍스트 원문 다이렉트 주입기</h1>
            <p className="text-sm text-slate-400 mt-1">
              API 서버를 거치지 않고 브라우저에서 Supabase로 직접 일괄 주입합니다.
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
              기출문제 텍스트 원문 붙여넣기 (지문, 4지선다, 정답표, 해설 전체)
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
              onClick={handleClientSideImport}
              disabled={loading || !rawText.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {loading ? 'DB 전송 중...' : '브라우저 직접 주입 실행'}
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