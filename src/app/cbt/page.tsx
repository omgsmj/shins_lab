'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Question, ExamResult } from '@/types/cbt';

export default function CBTPage() {
  // 모드 및 필터 상태
  const [selectedSession, setSelectedSession] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(150 * 60);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const subjects = ['전체', '소프트웨어 설계', '소프트웨어 개발', '데이터베이스 구축', '프로그래밍 언어 활용', '정보시스템 구축 관리'];

  // 문제 로드
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/questions?session=${selectedSession}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        let list = json.data;
        if (selectedSubject !== '전체') {
          list = list.filter((q: Question) => q.subject.replace(/\s+/g, '') === selectedSubject.replace(/\s+/g, ''));
        }
        setQuestions(list);
        setCurrentIndex(0);
        setAnswers({});
        setIsSubmitted(false);
        setResult(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedSession, selectedSubject]);

  // 제출 및 오답노트 자동 저장
  const handleSubmit = async () => {
    if (isSubmitted || questions.length === 0) return;

    let correctCount = 0;
    const wrongList: Array<{ questionId: number; userAnswer: number }> = [];
    const subjectStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      if (!subjectStats[q.subject]) subjectStats[q.subject] = { total: 0, correct: 0 };
      subjectStats[q.subject].total += 1;

      if (answers[q.number] === q.answer) {
        correctCount += 1;
        subjectStats[q.subject].correct += 1;
      } else {
        wrongList.push({
          questionId: q.id,
          userAnswer: answers[q.number] || 0
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const isPassed = score >= 60;

    setResult({
      score,
      isPassed,
      totalQuestions: questions.length,
      correctCount,
      wrongCount: questions.length - correctCount,
      subjectScores: subjectStats
    });
    setIsSubmitted(true);

    // 오답노트 서버 저장
    const now = new Date();
    const folderName = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} (${selectedSession}회차 ${selectedSubject})`;
    
    await fetch('/api/cbt/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName,
        session: selectedSession,
        score,
        isPassed,
        timeSpent: 150 * 60 - timeLeft,
        wrongAnswers: wrongList
      })
    });
  };

  const currentQ = questions[currentIndex] || questions[0];

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      {/* 글로벌 네비게이션 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">
            ← 메인 허브
          </Link>
          <Link href="/cbt/notes" className="rounded bg-indigo-600/20 border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30">
            📁 오답노트 보관함
          </Link>

          {/* 회차 선택 드롭다운 */}
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          >
            <option value={1}>2024년 1회차</option>
            <option value={2}>2024년 2회차</option>
            <option value={3}>2024년 3회차</option>
          </select>

          {/* 과목 필터 선택 */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {!isSubmitted && (
            <button
              onClick={() => { if (confirm('시험을 종료하고 오답노트에 저장하시겠습니까?')) handleSubmit(); }}
              className="rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
            >
              최종 제출 & 채점
            </button>
          )}
        </div>
      </header>

      {/* CBT 메인 레이아웃 */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-slate-400">문제를 불러오는 중...</div>
      ) : questions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
          <p>해당 회차/과목에 등록된 문제가 없습니다.</p>
          <span className="text-xs">상단의 대량 주입 스크립트를 먼저 실행하세요.</span>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-semibold text-blue-400">[{currentQ.subject}] 문제 {currentQ.number}번</span>
                <span className="text-xs text-slate-400">문항 {currentIndex + 1} / {questions.length}</span>
              </div>

              <p className="mb-6 whitespace-pre-wrap text-base leading-relaxed text-slate-200">
                {currentQ.question}
              </p>

              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => {
                  const optNum = idx + 1;
                  const isSelected = answers[currentQ.number] === optNum;
                  const isCorrect = isSubmitted && currentQ.answer === optNum;
                  const isWrong = isSubmitted && isSelected && currentQ.answer !== optNum;

                  return (
                    <button
                      key={optNum}
                      onClick={() => !isSubmitted && setAnswers({ ...answers, [currentQ.number]: optNum })}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition ${
                        isSelected ? 'border-blue-500 bg-blue-950/40 text-blue-200' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                      } ${isCorrect ? '!border-emerald-500 !bg-emerald-950/40 !text-emerald-300' : ''} ${
                        isWrong ? '!border-rose-500 !bg-rose-950/40 !text-rose-300' : ''
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-600 text-xs font-bold">
                        {optNum}
                      </span>
                      <span className="flex-1 leading-5">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {isSubmitted && (
                <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4">
                  <div className="font-bold text-emerald-400 text-sm mb-1">정답: {currentQ.answer}번</div>
                  <div className="text-xs text-slate-300 leading-relaxed"><span className="text-slate-400 font-semibold">해설: </span>{currentQ.explanation || '등록된 해설이 없습니다.'}</div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="rounded border border-slate-700 px-4 py-2 text-xs text-slate-300 disabled:opacity-30"
                >
                  이전 문제
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-30"
                >
                  다음 문제
                </button>
              </div>
            </div>
          </main>

          {/* OMR 시트 */}
          <aside className="w-72 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto">
            {result && (
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
                <div className={`text-xl font-bold ${result.isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.score}점 ({result.isPassed ? '합격' : '불합격'})
                </div>
                <div className="text-xs text-slate-400 mt-1">정답 {result.correctCount} / 오답 {result.wrongCount}</div>
              </div>
            )}
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.number}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex h-9 flex-col items-center justify-center rounded border text-xs ${
                    currentIndex === idx ? 'ring-2 ring-blue-400' : ''
                  } ${answers[q.number] ? 'border-blue-500 bg-blue-900/40 text-white font-bold' : 'border-slate-800 bg-slate-900 text-slate-400'}`}
                >
                  <span>{q.number}</span>
                  <span className="text-[10px] text-blue-300">{answers[q.number] || '-'}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}