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
  const [selectedSession, setSelectedSession] = useState<string>('1');
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');
  
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [omrFilter, setOmrFilter] = useState<'all' | 'unmarked' | 'bookmarked'>('all');

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
      if (selectedSession === 'random') {
        // P3: 3개 회차(1, 2, 3회차) 데이터를 모두 조회하여 과목별 20문항씩 무작위 추출
        const res = await fetch('/api/cbt/questions');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const allPool: QuestionItem[] = json.data;
          const grouped: Record<string, QuestionItem[]> = {};

          subjects.filter((s) => s !== '전체').forEach((s) => {
            grouped[s] = allPool.filter((q) => (q.subject || '').replace(/\s+/g, '') === s.replace(/\s+/g, ''));
          });

          let sampled: QuestionItem[] = [];
          if (selectedSubject === '전체') {
            Object.values(grouped).forEach((list) => {
              const shuffled = [...list].sort(() => 0.5 - Math.random());
              sampled = sampled.concat(shuffled.slice(0, 20));
            });
          } else {
            const targetList = grouped[selectedSubject] || [];
            sampled = [...targetList].sort(() => 0.5 - Math.random()).slice(0, 20);
          }

          // 문제 번호 1부터 재정렬
          const formatted = sampled.map((item, idx) => ({
            ...item,
            number: idx + 1
          }));

          setQuestions(formatted);
        } else {
          setQuestions([]);
        }
      } else {
        const res = await fetch(`/api/cbt/questions?session=${selectedSession}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          let list: QuestionItem[] = json.data;
          if (selectedSubject !== '전체') {
            const target = selectedSubject.replace(/\s+/g, '');
            list = list.filter((q) => (q.subject || '').replace(/\s+/g, '') === target);
          }
          setQuestions(list);
        } else {
          setQuestions([]);
        }
      }

      setCurrentIndex(0);
      setAnswers({});
      setBookmarks(new Set());
      setIsSubmitted(false);
      setResult(null);

      const examTime = selectedSubject === '전체' ? 150 * 60 : 30 * 60;
      setTimeLeft(examTime);
      setInitialTime(examTime);
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

  useEffect(() => {
    if (isSubmitted || loading || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('⏰ 시험 시간이 종료되었습니다! 답안이 자동으로 제출되고 채점됩니다.');
          handleSubmit(true);
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

  const toggleBookmark = (qNumber: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(qNumber)) next.delete(qNumber);
      else next.add(qNumber);
      return next;
    });
  };

  const handleSubmit = async (force: boolean = false) => {
    if (isSubmitted || questions.length === 0) return;

    // P0: 미응시 문항 식별 및 사용자 경고
    const unmarkedCount = questions.filter((q) => answers[q.number] === undefined).length;
    if (!force && unmarkedCount > 0) {
      const ok = confirm(`⚠️ 아직 풀지 않은 문제가 ${unmarkedCount}문항 남아 있습니다.\n그래도 최종 제출하시겠습니까?`);
      if (!ok) {
        setOmrFilter('unmarked');
        return;
      }
    }

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
      const sessionLabel = selectedSession === 'random' ? '랜덤 모의고사' : `${selectedSession}회차`;
      const folderName = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} (${sessionLabel} ${selectedSubject})`;

      await fetch('/api/cbt/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName,
          session: selectedSession === 'random' ? 999 : Number(selectedSession),
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
        setSelectedSession(customVal);
      }
    } else {
      setSelectedSession(val);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex] || questions[0];
  const unmarkedTotal = questions.filter((q) => answers[q.number] === undefined).length;
  const bookmarkedTotal = bookmarks.size;

  const filteredQuestions = questions.filter((q) => {
    if (omrFilter === 'unmarked') return answers[q.number] === undefined;
    if (omrFilter === 'bookmarked') return bookmarks.has(q.number);
    return true;
  });

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

          {/* 회차 선택 및 랜덤 모의고사 */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            <span className="text-xs text-slate-400">회차:</span>
            <select
              value={['1', '2', '3', 'random'].includes(selectedSession) ? selectedSession : 'custom'}
              onChange={handleSessionChange}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="1" className="bg-slate-900">2024년 1회차</option>
              <option value="2" className="bg-slate-900">2024년 2회차</option>
              <option value="3" className="bg-slate-900">2024년 3회차</option>
              <option value="random" className="bg-slate-900">🎲 실전 랜덤 모의고사 (100제)</option>
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
              onClick={() => handleSubmit(false)}
              className="rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition shadow-sm"
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
          <p className="text-base text-slate-300">선택한 회차 또는 과목에 등록된 문제가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto max-w-3xl">
              {/* 문제 헤더 및 P1 헷갈림 북마크 버튼 */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-400">
                    [{currentQ.subject}] 문제 {currentQ.number}번
                  </span>
                  <button
                    onClick={() => toggleBookmark(currentQ.number)}
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition ${
                      bookmarks.has(currentQ.number)
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                        : 'border-slate-700 text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    ★ {bookmarks.has(currentQ.number) ? '헷갈림 해제' : '헷갈림 체크'}
                  </button>
                </div>
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

          {/* 우측 OMR 시트 & P0/P1 검증 패널 */}
          <aside className="w-80 border-l border-slate-800 bg-slate-900/40 p-4 overflow-y-auto flex flex-col">
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

            {/* P0 / P1 실시간 통계 배지 */}
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider">OMR 마킹 시트</span>
              <div className="flex gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${unmarkedTotal > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  미마킹 {unmarkedTotal}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  ★ {bookmarkedTotal}
                </span>
              </div>
            </div>

            {/* OMR 필터 탭 */}
            <div className="mb-3 grid grid-cols-3 gap-1 rounded bg-slate-950 p-1 border border-slate-800 text-[11px]">
              <button
                onClick={() => setOmrFilter('all')}
                className={`py-1 rounded text-center transition ${omrFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
              >
                전체
              </button>
              <button
                onClick={() => setOmrFilter('unmarked')}
                className={`py-1 rounded text-center transition ${omrFilter === 'unmarked' ? 'bg-rose-900/40 text-rose-300 font-bold' : 'text-slate-400'}`}
              >
                미체크
              </button>
              <button
                onClick={() => setOmrFilter('bookmarked')}
                className={`py-1 rounded text-center transition ${omrFilter === 'bookmarked' ? 'bg-amber-900/40 text-amber-300 font-bold' : 'text-slate-400'}`}
              >
                헷갈림
              </button>
            </div>

            {/* OMR 카드 그리드 */}
            <div className="grid grid-cols-5 gap-1.5 flex-1">
              {filteredQuestions.map((q) => {
                const isMarked = answers[q.number] !== undefined;
                const isCurrent = questions[currentIndex]?.number === q.number;
                const isBookmarked = bookmarks.has(q.number);
                const actualIndex = questions.findIndex((item) => item.number === q.number);

                return (
                  <button
                    key={q.number}
                    onClick={() => setCurrentIndex(actualIndex)}
                    className={`relative flex h-10 flex-col items-center justify-center rounded border text-xs transition ${
                      isCurrent ? 'ring-2 ring-blue-400' : ''
                    } ${
                      isMarked
                        ? 'border-blue-500 bg-blue-900/40 text-white font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {isBookmarked && (
                      <span className="absolute top-0.5 right-1 text-[10px] text-amber-400">★</span>
                    )}
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