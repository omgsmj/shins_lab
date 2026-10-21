'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface WrongItem {
  id: number;
  question_id: number;
  user_answer: number;
  question: {
    id: number;
    session: number;
    number: number;
    subject: string;
    question: string;
    options: string[];
    answer: number;
    explanation?: string;
  };
}

interface ExamHistory {
  id: number;
  folder_name: string;
  session: number;
  score: number;
  is_passed: boolean;
  time_spent: number;
  created_at: string;
}

export default function CBTNotesPage() {
  const [histories, setHistories] = useState<ExamHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const [wrongItems, setWrongItems] = useState<WrongItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // P2: 다시 풀기 연습 모드 상태
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Set<number>>(new Set());

  const fetchHistories = async () => {
    try {
      const res = await fetch('/api/cbt/notes/folders');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setHistories(json.data);
        if (json.data.length > 0 && !selectedHistoryId) {
          setSelectedHistoryId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('기록 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWrongItems = async (historyId: number) => {
    try {
      const res = await fetch(`/api/cbt/notes?historyId=${historyId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setWrongItems(json.data);
        setPracticeAnswers({});
        setRevealedExplanations(new Set());
      }
    } catch (err) {
      console.error('오답 상세 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  useEffect(() => {
    if (selectedHistoryId) {
      fetchWrongItems(selectedHistoryId);
    }
  }, [selectedHistoryId]);

  // P2: 오답 숙지 완료 (졸업/보관함에서 삭제)
  const handleRemoveWrongItem = (id: number) => {
    if (confirm('이 문제를 완전히 숙지하셨습니까? 오답노트 목록에서 제거합니다.')) {
      setWrongItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const toggleRevealExplanation = (questionId: number) => {
    setRevealedExplanations((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans">
      {/* 좌측: 응시 이력 폴더 목록 */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <Link href="/cbt" className="text-xs text-blue-400 hover:underline">
            ← CBT 시험장으로
          </Link>
          <span className="text-xs font-bold text-slate-400">오답노트 보관함</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-xs text-slate-500 text-center py-8">이력 로딩 중...</div>
          ) : histories.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">응시한 시험 이력이 없습니다.</div>
          ) : (
            histories.map((h) => (
              <button
                key={h.id}
                onClick={() => setSelectedHistoryId(h.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                  selectedHistoryId === h.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-200 truncate">{h.folder_name}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span className={h.is_passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {h.score}점 ({h.is_passed ? '합격' : '불합격'})
                  </span>
                  <span>{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* 우측: 오답 목록 및 P2 다시 풀기 연습 인터페이스 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-xl font-bold text-white">
                {histories.find((h) => h.id === selectedHistoryId)?.folder_name || '오답 상세 목록'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                오답 수: <span className="text-rose-400 font-bold">{wrongItems.length}개</span>
              </p>
            </div>

            {/* P2: 다시 풀기 모드 토글 스위치 */}
            {wrongItems.length > 0 && (
              <button
                onClick={() => {
                  setPracticeMode(!practiceMode);
                  setPracticeAnswers({});
                  setRevealedExplanations(new Set());
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition border ${
                  practiceMode
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                {practiceMode ? ' 일반 검토 모드로 보기' : '🎯 정답 가리고 다시 풀기'}
              </button>
            )}
          </div>

          {wrongItems.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              틀린 문제가 없거나 오답을 모두 졸업했습니다! 🎉
            </div>
          ) : (
            <div className="space-y-6">
              {wrongItems.map((item, idx) => {
                const q = item.question;
                const userChoice = practiceMode ? practiceAnswers[q.id] : item.user_answer;
                const isAnswerChecked = practiceMode && userChoice !== undefined;
                const isPracticeCorrect = userChoice === q.answer;
                const isExplanationOpen = !practiceMode || revealedExplanations.has(q.id);

                return (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-bold text-blue-400">
                        [{q.subject}] {q.number}번 문항
                      </span>
                      <div className="flex items-center gap-2">
                        {practiceMode && isAnswerChecked && (
                          <span className={`text-xs font-bold ${isPracticeCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPracticeCorrect ? ' 정답!' : '❌ 오답'}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveWrongItem(item.id)}
                          className="text-[11px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition"
                        >
                          ✓ 숙지 완료(졸업)
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{q.question}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(q.options || []).map((opt, optIdx) => {
                        const optNum = optIdx + 1;
                        const isSelected = userChoice === optNum;
                        const isRealCorrect = !practiceMode || isAnswerChecked ? q.answer === optNum : false;

                        return (
                          <button
                            key={optNum}
                            disabled={!practiceMode}
                            onClick={() => setPracticeAnswers((prev) => ({ ...prev, [q.id]: optNum }))}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-left text-xs transition ${
                              isSelected
                                ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                                : 'border-slate-800 bg-slate-950 text-slate-300'
                            } ${isRealCorrect ? '!border-emerald-500 !bg-emerald-950/40 !text-emerald-300 font-bold' : ''}`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-600 text-[10px]">
                              {optNum}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 해설 토글 */}
                    {isExplanationOpen ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs space-y-1">
                        <div className="font-bold text-emerald-400">정답: {q.answer}번</div>
                        <div className="text-slate-300 leading-relaxed">
                          <span className="text-slate-400 font-semibold">해설: </span>
                          {q.explanation || '해설이 없습니다.'}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleRevealExplanation(q.id)}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        💡 정답 및 해설 펼쳐보기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}