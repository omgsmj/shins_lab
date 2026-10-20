'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuestionItem {
  id: number;
  session: number;
  number: number;
  subject: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface ExamScoreResult {
  score: number;
  isPassed: boolean;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  subjectScores: Record<string, { total: number; correct: number }>;
}

export default function CBTPage() {
  const [selectedSession, setSelectedSession] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');
  
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  // 실제 시험 규정: 전체(100문항) = 150분(9,000초), 개별 과목(20문항) = 30분(1,800초)
  const [timeLeft, setTimeLeft] = useState<number>(150 * 60);
  const [initialTime, setInitialTime] = useState<number>(150 * 60);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<ExamScoreResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const subjects = [
    '전체',
    '소프트웨어 설계',
    '소프트웨어 개발',
    '데이터베이스 구축',
    '프로그래밍 언어 활용',
    '정보시스템 구축 관리'
  ];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cbt/questions?session=${selectedSession}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        let list: QuestionItem[] = json.data;

        if (selectedSubject !== '전체') {
          const target = selectedSubject.replace(/\s+/g, '');
          list = list.filter((q) => {
            const subj = (q.subject || '').replace(/\s+/g, '');
            return subj === target;
          });
        }

        setQuestions(list);
        setCurrentIndex(0);
        setAnswers({});
        setIsSubmitted(false);
        setResult(null);

        // 과목 선택에 따른 실전 제한 시간 동적 세팅
        const examTime = selectedSubject === '전체' ? 150 * 60 : 30 * 60;
        setTimeLeft(examTime);
        setInitialTime(examTime);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('문제 로드 에러:', err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedSession, selectedSubject]);

  // 실시간 타이머 및 시간 초과 시 강제 자동 제출
  useEffect(() => {
    if (isSubmitted || loading || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('⏰ 시험 시간이 종료되었습니다! 답안이 자동으로 제출되고 채점됩니다.');
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, loading, questions]);

  const handleSelectAnswer = (qNumber: number, optNum: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({
      ...prev,
      [qNumber]: optNum
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitted || questions.length === 0) return;

    let correctCount = 0;
    const wrongList: Array<{ questionId: number; userAnswer: number }> = [];
    const subjectStats: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      const subj = q.subject || '공통';
      if (!subjectStats[subj]) {
        subjectStats[subj] = { total: 0, correct: 0 };
      }
      subjectStats[subj].total += 1;

      if (answers[q.number] === q.answer) {
        correctCount += 1;
        subjectStats[subj].correct += 1;
      } else {
        wrongList.push({
          questionId: q.id,
          userAnswer: answers[q.number] || 0
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    // 과락 규정: 전체 응시일 경우 과목당 40점 미만(과목별 8개 미만) 시 불합격
    let hasUnder40 = false;
    if (selectedSubject === '전체') {
      Object.values(subjectStats).forEach((stat) => {
        const subScore = Math.round((stat.correct / stat.total) * 100);
        if (subScore < 40) hasUnder40 = true;
      });
    }
    const isPassed = selectedSubject === '전체' ? score >= 60 && !hasUnder40 : score >= 60;

    setResult({
      score,
      isPassed,
      totalQuestions: questions.length,
      correctCount,
      wrongCount: questions.length - correctCount,
      subjectScores: subjectStats
    });
    setIsSubmitted(true);

    try {
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
          timeSpent: initialTime - timeLeft,
          wrongAnswers: wrongList
        })
      });
    } catch (saveErr) {
      console.error('오답노트 저장 실패:', saveErr);
    }
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      const customVal = prompt('조회할 회차 번호(숫자)를 입력하세요:', '4');
      if (customVal && !isNaN(Number(customVal))) {
        setSelectedSession(Number(customVal));
      }
    } else {
      setSelectedSession(Number(val));
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex] || questions[0];

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            ← 메인 허브
          </Link>
          <Link
            href="/cbt/notes"
            className="rounded border border-indigo-500/40 bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 transition"
          >
            📁 오답노트 보관함
          </Link>

          {/* 회차 선택 및 직접 추가 입력 */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            <span className="text-xs text-slate-400">회차:</span>
            <select
              value={[1, 2, 3].includes(selectedSession) ? selectedSession : 'custom'}
              onChange={handleSessionChange}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value={1} className="bg-slate-900">2024년 1회차</option>
              <option value={2} className="bg-slate-900">2024년 2회차</option>
              <option value={3} className="bg-slate-900">2024년 3회차</option>
              <option value="custom" className="bg-slate-900">✏️ 직접 입력 ({selectedSession}회차)</option>
            </select>
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">제한시간:</span>
            <span className={`font-bold text-sm ${timeLeft <= 300 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] text-slate-500">
              ({selectedSubject === '전체' ? '총 150분' : '과목별 30분'})
            </span>
          </div>
          {!isSubmitted && questions.length > 0 && (
            <button
              onClick={() => {
                if (confirm('시험을 종료하고 채점 및 오답노트에 저장하시겠습니까?')) {
                  handleSubmit();
                }
              }}
              className="rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition"
            >
              최종 제출 & 채점
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-slate-400">
          기출문제를 불러오는 중...
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-slate-400">
          <p className="text-base text-slate-300">선택한 {selectedSession}회차 또는 과목에 등록된 문제가 없습니다.</p>
          <div className="text-xs text-slate-500 max-w-md text-center leading-relaxed">
            SQL Editor에서 문제를 주입했는지 확인하십시오.
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-blue-400">
                  [{currentQ.subject}] 문제 {currentQ.number}번
                </span>
                <span className="text-xs text-slate-400">
                  진행: {currentIndex + 1} / {questions.length}
                </span>
              </div>

              <p className="mb-6 whitespace-pre-wrap text-base leading-relaxed text-slate-200">
                {currentQ.question}
              </p>

              <div className="space-y-2.5">
                {(currentQ.options || []).map((opt, idx) => {
                  const optNum = idx + 1;
                  const isSelected = answers[currentQ.number] === optNum;
                  const isCorrect = isSubmitted && currentQ.answer === optNum;
                  const isWrong = isSubmitted && isSelected && currentQ.answer !== optNum;

                  return (
                    <button
                      key={optNum}
                      onClick={() => handleSelectAnswer(currentQ.number, optNum)}
                      disabled={isSubmitted}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
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
                  <div className="mb-1 font-bold text-emerald-400 text-sm">
                    정답: {currentQ.answer}번
                  </div>
                  <div className="text-xs leading-relaxed text-slate-300">
                    <span className="font-semibold text-slate-400">해설: </span>
                    {currentQ.explanation || '등록된 해설이 없습니다.'}
                  </div>
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
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-30 transition"
                >
                  다음 문제
                </button>
              </div>
            </div>
          </main>

          <aside className="w-72 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto">
            {result && (
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
                <div className={`text-xl font-bold ${result.isPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.score}점 ({result.isPassed ? '합격' : '불합격'})
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  정답 {result.correctCount} / 오답 {result.wrongCount}
                </div>
              </div>
            )}

            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              OMR 마킹 현황 ({questions.length}문항)
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const isMarked = answers[q.number] !== undefined;
                const isCurrent = currentIndex === idx;

                return (
                  <button
                    key={q.number}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex h-9 flex-col items-center justify-center rounded border text-xs transition ${
                      isCurrent ? 'ring-2 ring-blue-400' : ''
                    } ${
                      isMarked
                        ? 'border-blue-500 bg-blue-900/40 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
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
      )}
    </div>
  );
}