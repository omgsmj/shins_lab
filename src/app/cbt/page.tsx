'use client';

import React, { useState, useEffect } from 'react';
import { Question, ExamResult } from '@/types/cbt';

export default function CBTPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(150 * 60);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 관리자 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<Partial<Question> & { adminPassword?: string }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/cbt/questions?session=1');
      if (!res.ok) throw new Error(`API 통신 실패 (HTTP ${res.status})`);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data) || json.data.length === 0) {
        throw new Error('문제 데이터가 비어있습니다.');
      }
      setQuestions(json.data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSubmit = () => {
    if (isSubmitted || questions.length === 0) return;

    let correctCount = 0;
    const subjectStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      if (!subjectStats[q.subject]) {
        subjectStats[q.subject] = { total: 0, correct: 0 };
      }
      subjectStats[q.subject].total += 1;

      if (answers[q.number] === q.answer) {
        correctCount += 1;
        subjectStats[q.subject].correct += 1;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    let hasFailedSubject = false;
    Object.values(subjectStats).forEach((stat) => {
      if ((stat.correct / stat.total) * 100 < 40) hasFailedSubject = true;
    });

    setResult({
      score,
      isPassed: score >= 60 && !hasFailedSubject,
      totalQuestions: questions.length,
      correctCount,
      wrongCount: questions.length - correctCount,
      subjectScores: subjectStats
    });

    setIsSubmitted(true);
  };

  useEffect(() => {
    if (isSubmitted || loading || errorMessage) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, loading, errorMessage, questions, answers]);

  const handleSelectAnswer = (qNumber: number, optionIdx: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [qNumber]: optionIdx }));
  };

  const openEditModal = () => {
    const q = questions[currentIndex];
    setEditFormData({
      id: q.id,
      session: q.session,
      number: q.number,
      subject: q.subject,
      question: q.question,
      options: [...q.options],
      answer: q.answer,
      explanation: q.explanation || '',
      adminPassword: ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/cbt/questions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const json = await res.json();
      if (!json.success) {
        alert(`저장 실패: ${json.error}`);
        return;
      }
      alert('성공적으로 수정되었습니다.');
      setIsEditModalOpen(false);
      await fetchQuestions();
    } catch (err) {
      alert(`에러: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-900 text-slate-300 font-mono">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <div>기출문제 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 p-6 text-slate-100 font-mono">
        <div className="max-w-lg rounded-xl border border-rose-500 bg-rose-950/40 p-6">
          <h2 className="mb-2 text-lg font-bold text-rose-400">데이터 로드 실패</h2>
          <p className="mb-4 text-sm text-rose-200">{errorMessage}</p>
          <button onClick={() => window.location.reload()} className="rounded bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || questions[0];

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">정보처리기사 1회차</span>
          <span className="text-sm text-slate-400">과목: {currentQ.subject}</span>
          <button
            onClick={openEditModal}
            className="rounded border border-amber-500/50 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
          >
            ✏️ 이 문제 수정
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-lg font-bold text-emerald-400">
            남은 시간: {formatTime(timeLeft)}
          </div>
          {!isSubmitted && (
            <button
              onClick={() => {
                if (confirm('시험을 종료하고 채점하시겠습니까?')) handleSubmit();
              }}
              className="rounded bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-500"
            >
              최종 제출
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xl font-bold text-blue-400">문제 {currentQ.number}번</span>
              <span className="text-sm text-slate-400">진행도: {currentIndex + 1} / {questions.length}</span>
            </div>

            <p className="mb-8 whitespace-pre-wrap text-lg leading-relaxed text-slate-200">
              {currentQ.question}
            </p>

            <div className="space-y-3">
              {(currentQ.options || []).map((option, idx) => {
                const optNum = idx + 1;
                const isSelected = answers[currentQ.number] === optNum;
                const isCorrect = isSubmitted && currentQ.answer === optNum;
                const isWrongSelection = isSubmitted && isSelected && currentQ.answer !== optNum;

                return (
                  <button
                    key={optNum}
                    onClick={() => handleSelectAnswer(currentQ.number, optNum)}
                    disabled={isSubmitted}
                    className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                        : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                    } ${isCorrect ? '!border-emerald-500 !bg-emerald-950/40 !text-emerald-300' : ''} ${
                      isWrongSelection ? '!border-rose-500 !bg-rose-950/40 !text-rose-300' : ''
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500 text-white'
                          : 'border-slate-500 text-slate-400'
                      }`}
                    >
                      {optNum}
                    </span>
                    <span className="flex-1 text-sm leading-6">{option}</span>
                  </button>
                );
              })}
            </div>

            {isSubmitted && (
              <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/80 p-5">
                <div className="mb-2 font-bold text-emerald-400">
                  정답: {currentQ.answer}번
                </div>
                <div className="text-sm text-slate-300">
                  <span className="font-semibold text-slate-400">해설: </span>
                  {currentQ.explanation || '등록된 해설이 없습니다.'}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 disabled:opacity-30"
              >
                이전 문제
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-30"
              >
                다음 문제
              </button>
            </div>
          </div>
        </main>

        <aside className="w-80 border-l border-slate-700 bg-slate-800/50 p-4 overflow-y-auto">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">OMR 마킹 현황</h3>

          {result && (
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
              <div className={`text-2xl font-black ${result.isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.score}점 ({result.isPassed ? '합격' : '불합격'})
              </div>
              <div className="mt-2 text-xs text-slate-400">
                정답 {result.correctCount} / 오답 {result.wrongCount}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isMarked = answers[q.number] !== undefined;
              const isCurrent = currentIndex === idx;
              return (
                <button
                  key={q.number}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex h-10 flex-col items-center justify-center rounded border text-xs transition ${
                    isCurrent ? 'ring-2 ring-blue-400' : ''
                  } ${
                    isMarked
                      ? 'border-blue-500 bg-blue-900/50 text-white font-bold'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <span>{q.number}</span>
                  <span className="text-[10px] text-blue-300">{answers[q.number] || '-'}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* 관리자 문제 인라인 수정 모달 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">문제 {editFormData.number}번 수정 (Admin)</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">과목명</label>
                  <input
                    type="text"
                    value={editFormData.subject || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">정답 번호 (1~4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editFormData.answer || 1}
                    onChange={(e) => setEditFormData({ ...editFormData, answer: parseInt(e.target.value, 10) })}
                    className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">문제 지문</label>
                <textarea
                  rows={4}
                  value={editFormData.question || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, question: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">보기 1~4번</label>
                {(editFormData.options || []).map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400 w-4">{idx + 1}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(editFormData.options || [])];
                        newOpts[idx] = e.target.value;
                        setEditFormData({ ...editFormData, options: newOpts });
                      }}
                      className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">해설</label>
                <textarea
                  rows={2}
                  value={editFormData.explanation || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, explanation: e.target.value })}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1">관리자 비밀번호</label>
                <input
                  type="password"
                  placeholder="비밀번호 입력 (기본: 1218)"
                  value={editFormData.adminPassword || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, adminPassword: e.target.value })}
                  className="w-full rounded border border-amber-600/50 bg-slate-800 px-3 py-2 text-sm text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : 'DB에 즉시 반영'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}