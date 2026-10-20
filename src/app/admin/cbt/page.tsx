'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminCBTPage() {
  const [rawText, setRawText] = useState('');
  const [session, setSession] = useState(1);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRawImport = async () => {
    if (!password) {
      alert('관리자 비밀번호를 입력하세요.');
      return;
    }
    if (!rawText.trim()) {
      alert('기출문제 텍스트를 붙여넣어 주세요.');
      return;
    }

    setLoading(true);
    setStatus('텍스트 분석 및 DB 주입 중...');

    try {
      const res = await fetch('/api/cbt/questions/raw-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          session,
          adminPassword: password
        })
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error);
      }

      setStatus(` 주입 성공: ${resJson.message}`);
      setRawText('');
    } catch (err: unknown) {
      setStatus(`❌ 실패: ${err instanceof Error ? err.message : '오류 발생'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CBT 텍스트 원문 원클릭 주입기</h1>
            <p className="text-sm text-slate-400 mt-1">
              JSON 가공 필요 없음: 기출문제 텍스트 전체(지문, 보기, 정답표, 해설)를 아래에 그대로 붙여넣으세요.
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
                placeholder="비밀번호 (기본: 1218)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              기출문제 텍스트 원문 붙여넣기
            </label>
            <textarea
              rows={16}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="01 사용자 요구사항...\n① 스크럼 마스터\n② 페르소나...\n\n(텍스트 전체를 복사해서 그대로 붙여넣으시면 됩니다)"
              className="w-full font-mono text-xs rounded-lg border border-slate-700 bg-slate-950 p-4 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              입력 글자 수: {rawText.length.toLocaleString()}자
            </span>
            <button
              onClick={handleRawImport}
              disabled={loading || !rawText.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {loading ? '파싱 및 DB 주입 중...' : '원문 텍스트 분석 및 주입 실행'}
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