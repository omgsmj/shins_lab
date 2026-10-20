'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminCBTPage() {
  const [jsonText, setJsonText] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sampleFormat = [
    {
      session: 1,
      number: 2,
      subject: "소프트웨어설계",
      question: "소프트웨어 아키텍처 모델 중 MVC 구조에 대한 설명으로 옳은 것은?",
      options: [
        "Model은 사용자 인터페이스를 전담한다.",
        "View는 비즈니스 로직과 데이터 처리를 담당한다.",
        "Controller는 사용자의 입력을 받아 모델과 뷰를 제어한다.",
        "모든 요소는 반드시 단일 클래스 내에 응집되어야 한다."
      ],
      answer: 3,
      explanation: "MVC 패턴에서 Controller는 Model과 View 사이의 상호작용을 관리합니다."
    }
  ];

  const handleImport = async () => {
    if (!password) {
      alert('관리자 비밀번호를 입력하세요.');
      return;
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(jsonText);
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('데이터는 배열 [ ... ] 형태여야 합니다.');
      }
    } catch (e) {
      alert('올바른 JSON 형식이 아닙니다. 문법을 확인하세요.');
      return;
    }

    setLoading(true);
    setStatus('DB에 주입 중...');

    try {
      const res = await fetch('/api/cbt/questions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword: password,
          questions: parsedQuestions
        })
      });

      const resJson = await res.json();
      if (!resJson.success) {
        throw new Error(resJson.error);
      }

      setStatus(` 주입 완료: 총 ${resJson.count}개 문제가 등록되었습니다.`);
      setJsonText('');
    } catch (err: unknown) {
      setStatus(`❌ 오류 발생: ${err instanceof Error ? err.message : '통신 실패'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CBT 기출문제 대량 주입기</h1>
            <p className="text-sm text-slate-400">JSON 포맷 데이터를 붙여넣어 수십~수백 문제를 한 번에 등록합니다.</p>
          </div>
          <Link href="/cbt" className="text-xs text-blue-400 hover:underline">
            ← CBT 시험장으로 이동
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              주입할 문제 JSON 배열 (예시 템플릿 참고)
            </label>
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={JSON.stringify(sampleFormat, null, 2)}
              className="w-full font-mono text-xs rounded-lg border border-slate-700 bg-slate-950 p-4 text-emerald-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <input
              type="password"
              placeholder="관리자 비밀번호 (기본: 1218)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-64 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />

            <button
              onClick={handleImport}
              disabled={loading || !jsonText.trim()}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 transition"
            >
              {loading ? '처리 중...' : 'DB에 대량 주입 실행'}
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