'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CBTNotesPage() {
  const [histories, setHistories] = useState<any[]>([]);
  const [activeFolder, setActiveFolder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/cbt/notes');
      const json = await res.json();
      if (json.success) {
        setHistories(json.data);
        if (json.data.length > 0) setActiveFolder(json.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 오답 기록 폴더를 완전히 삭제하시겠습니까?')) return;
    await fetch(`/api/cbt/notes?id=${id}`, { method: 'DELETE' });
    await fetchHistories();
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/cbt" className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">
            ← CBT 시험장
          </Link>
          <h1 className="text-sm font-bold text-white">📁 폴더형 오답노트 보관함</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 폴더 목록 */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto space-y-2">
          <div className="text-xs font-bold text-slate-400 mb-3 uppercase">저장된 시험 기록</div>
          {histories.map((h) => (
            <div
              key={h.id}
              onClick={() => setActiveFolder(h)}
              className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                activeFolder?.id === h.id ? 'border-indigo-500 bg-indigo-950/40 text-white' : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="text-xs font-bold">{h.folder_name}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  점수: {h.score}점 ({h.is_passed ? '합격' : '불합격'}) · 오답 {h.cbt_wrong_answers?.length || 0}개
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}
                className="text-slate-500 hover:text-rose-400 text-xs p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </aside>

        {/* 우측 오답 상세 목록 */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeFolder ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                {activeFolder.folder_name} — 오답 복습 ({activeFolder.cbt_wrong_answers?.length}문항)
              </h2>

              {activeFolder.cbt_wrong_answers?.map((item: any, idx: number) => {
                const q = item.cbt_questions;
                if (!q) return null;
                return (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400">[{q.subject}] {q.number}번 틀린 문제</span>
                      <span className="text-xs text-slate-500">내가 고른 오답: {item.user_answer}번</span>
                    </div>

                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{q.question}</p>

                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className={`text-xs p-2.5 rounded border ${
                            optIdx + 1 === q.answer
                              ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 font-bold'
                              : optIdx + 1 === item.user_answer
                              ? 'border-rose-500/60 bg-rose-950/30 text-rose-300'
                              : 'border-slate-800 bg-slate-950/50 text-slate-400'
                          }`}
                        >
                          {optIdx + 1}. {opt}
                        </div>
                      ))}
                    </div>

                    <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                      <span className="font-bold text-emerald-400">해설: </span>
                      {q.explanation || '해설 정보가 없습니다.'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm">
              선택된 오답 폴더가 없습니다.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}