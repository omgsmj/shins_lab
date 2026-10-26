'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface QuestionData {
  id: number;
  session?: number;
  number?: number;
  subject?: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface WrongItem {
  id: number;
  question_id: number;
  user_answer: number;
  question: QuestionData;
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

  // 다시 풀기 모드 상태
  const [practiceMode, setPracticeMode] = useState<boolean>(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Set<number>>(new Set());

  // 1. 응시 이력 폴더 목록 조회 (Supabase 직결)
  const fetchHistories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cbt_exam_histories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('이력 목록 조회 에러:', error);
        return;
      }

      if (data && data.length > 0) {
        const mapped: ExamHistory[] = data.map((h) => ({
          id: h.id,
          folder_name: h.folder_name || `${h.session || 1}회차 기출 모의고사`,
          session: h.session || 1,
          score: h.score || 0,
          is_passed: Boolean(h.is_passed),
          time_spent: h.time_spent || 0,
          created_at: h.created_at,
        }));
        setHistories(mapped);
        setSelectedHistoryId((prev) => {
          if (prev && mapped.some((m) => m.id === prev)) return prev;
          return mapped[0].id;
        });
      } else {
        setHistories([]);
        setSelectedHistoryId(null);
        setWrongItems([]);
      }
    } catch (err) {
      console.error('기록 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. 특정 시험의 오답 목록 조회 (Supabase 직결)
  const fetchWrongItems = async (historyId: number) => {
    try {
      const { data, error } = await supabase
        .from('cbt_wrong_answers')
        .select(`
          id,
          question_id,
          user_answer,
          cbt_questions (
            id,
            session,
            number,
            subject,
            question,
            options,
            answer,
            explanation
          )
        `)
        .eq('history_id', historyId)
        .order('id', { ascending: true });

      if (error) {
        // 단일 테이블 구조이거나 외래키 조인이 안 걸려있을 경우 폴백 쿼리
        const { data: fallbackData, error: fbError } = await supabase
          .from('cbt_wrong_answers')
          .select('*')
          .eq('history_id', historyId)
          .order('id', { ascending: true });

        if (!fbError && fallbackData) {
          const items: WrongItem[] = fallbackData.map((item: any) => ({
            id: item.id,
            question_id: item.question_id || item.id,
            user_answer: item.user_answer || 0,
            question: {
              id: item.question_id || item.id,
              session: item.session || 1,
              number: item.number || 1,
              subject: item.subject || '공통과목',
              question: item.question || '문제 내용을 불러올 수 없습니다.',
              options: Array.isArray(item.options) ? item.options : [],
              answer: item.answer || item.correct_answer || 1,
              explanation: item.explanation || '',
            },
          }));
          setWrongItems(items);
        }
        return;
      }

      if (data) {
        const items: WrongItem[] = data.map((item: any) => {
          const q = item.cbt_questions || {};
          return {
            id: item.id,
            question_id: item.question_id,
            user_answer: item.user_answer,
            question: {
              id: q.id || item.question_id,
              session: q.session || 1,
              number: q.number || 1,
              subject: q.subject || '소프트웨어 설계',
              question: q.question || item.question || '문제를 불러오는 중...',
              options: Array.isArray(q.options) ? q.options : (item.options || []),
              answer: q.answer || item.correct_answer || 1,
              explanation: q.explanation || item.explanation || '',
            },
          };
        });
        setWrongItems(items);
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

  // [기능 1] 시험 이력 폴더 전체 삭제 (딸린 오답도 DB에서 연쇄 삭제)
  const handleDeleteHistory = async (e: React.MouseEvent, historyId: number) => {
    e.stopPropagation(); // 폴더 선택 이벤트 방지
    if (!confirm('이 시험 이력과 여기에 포함된 모든 오답을 영구 삭제하시겠습니까?')) return;

    try {
      // 1. 해당 이력의 오답 일괄 삭제
      await supabase.from('cbt_wrong_answers').delete().eq('history_id', historyId);
      // 2. 이력 자체 삭제
      const { error } = await supabase.from('cbt_exam_histories').delete().eq('id', historyId);

      if (error) {
        alert(`삭제 실패: ${error.message}`);
        return;
      }

      const updated = histories.filter((h) => h.id !== historyId);
      setHistories(updated);
      if (selectedHistoryId === historyId) {
        if (updated.length > 0) {
          setSelectedHistoryId(updated[0].id);
        } else {
          setSelectedHistoryId(null);
          setWrongItems([]);
        }
      }
    } catch (err) {
      console.error('이력 삭제 중 에러 발생:', err);
    }
  };

  // [기능 2] 개별 오답 문항 삭제 (숙지 완료 / 졸업)
  const handleRemoveWrongItem = async (id: number) => {
    if (!confirm('이 문제를 오답노트에서 영구 제거하시겠습니까?')) return;

    setWrongItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const { error } = await supabase.from('cbt_wrong_answers').delete().eq('id', id);
      if (error) {
        console.error('오답 개별 삭제 실패:', error.message);
      }
    } catch (err) {
      console.error('오답 삭제 통신 에러:', err);
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
    <div className="flex h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white">
      {/* 좌측: 응시 이력 폴더 목록 */}
      <aside className="w-84 border-r border-[#30363d] bg-[#161b22] p-4 flex flex-col shrink-0">
        <div className="mb-4 flex items-center justify-between border-b border-[#30363d] pb-3">
          <Link href="/cbt" className="text-xs text-[#58a6ff] hover:underline font-bold">
            ← CBT 시험장으로
          </Link>
          <span className="text-xs font-bold text-[#8b949e]">오답 보관소</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-xs text-[#8b949e] text-center py-8">이력 동기화 중...</div>
          ) : histories.length === 0 ? (
            <div className="text-xs text-[#8b949e] text-center py-8">응시한 시험 이력이 없습니다.</div>
          ) : (
            histories.map((h) => (
              <div
                key={h.id}
                onClick={() => setSelectedHistoryId(h.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition cursor-pointer relative group ${
                  selectedHistoryId === h.id
                    ? 'border-[#58a6ff] bg-[#1f6feb]/20 text-white shadow-lg'
                    : 'border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white truncate max-w-[180px]">{h.folder_name}</div>
                  {/* 회차 폴더 전체 삭제 버튼 */}
                  <button
                    onClick={(e) => handleDeleteHistory(e, h.id)}
                    title="이 회차 이력 전체 삭제"
                    className="text-[#8b949e] hover:text-[#f85149] hover:bg-[#f85149]/20 px-1.5 py-0.5 rounded text-[10px] border border-transparent hover:border-[#f85149]/40 transition"
                  >
                    🗑️ 삭제
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[#8b949e]">
                  <span className={h.is_passed ? 'text-[#7ee787] font-bold' : 'text-[#f85149] font-bold'}>
                    {h.score}점 ({h.is_passed ? '합격' : '불합격'})
                  </span>
                  <span>{new Date(h.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 우측: 오답 상세 목록 및 다시 풀기 모드 */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider">
                {histories.find((h) => h.id === selectedHistoryId)?.folder_name || '오답 상세 목록'}
              </h1>
              <p className="text-xs text-[#8b949e] mt-1">
                남은 오답 수: <span className="text-[#f85149] font-bold">{wrongItems.length}문항</span>
              </p>
            </div>

            {/* 다시 풀기 모드 토글 */}
            {wrongItems.length > 0 && (
              <button
                onClick={() => {
                  setPracticeMode(!practiceMode);
                  setPracticeAnswers({});
                  setRevealedExplanations(new Set());
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition border ${
                  practiceMode
                    ? 'border-[#238636] bg-[#238636]/20 text-[#7ee787]'
                    : 'border-[#30363d] bg-[#21262d] text-white hover:bg-[#30363d]'
                }`}
              >
                {practiceMode ? '📋 전체 정답/해설 보기' : '🎯 정답 가리고 다시 풀기'}
              </button>
            )}
          </div>

          {wrongItems.length === 0 ? (
            <div className="text-center py-20 text-[#8b949e] text-xs">
              선택한 시험에 틀린 문제가 없거나 모든 오답을 졸업했습니다! 🎉
            </div>
          ) : (
            <div className="space-y-6">
              {wrongItems.map((item) => {
                const q = item.question;
                const userChoice = practiceMode ? practiceAnswers[q.id] : item.user_answer;
                const isAnswerChecked = practiceMode && userChoice !== undefined;
                const isPracticeCorrect = userChoice === q.answer;
                const isExplanationOpen = !practiceMode || revealedExplanations.has(q.id);

                return (
                  <div key={item.id} className="rounded-lg border border-[#30363d] bg-[#161b22] p-5 space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#21262d] pb-2.5">
                      <span className="text-xs font-bold text-[#58a6ff]">
                        [{q.subject || '소프트웨어 설계'}] {q.number ? `${q.number}번` : `문항 #${q.id}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {practiceMode && isAnswerChecked && (
                          <span className={`text-xs font-bold ${isPracticeCorrect ? 'text-[#7ee787]' : 'text-[#f85149]'}`}>
                            {isPracticeCorrect ? '✓ 정답!' : '❌ 오답'}
                          </span>
                        )}
                        {/* 개별 오답 삭제 버튼 */}
                        <button
                          onClick={() => handleRemoveWrongItem(item.id)}
                          className="text-[11px] px-2.5 py-1 rounded border border-[#f85149]/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 hover:border-rose-500 transition font-bold"
                        >
                          ❌ 오답 삭제
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{q.question}</p>

                    {/* 4지 선다 목록 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(q.options && q.options.length > 0 ? q.options : ['보기 1', '보기 2', '보기 3', '보기 4']).map((opt, optIdx) => {
                        const optNum = optIdx + 1;
                        const isSelected = userChoice === optNum;
                        const isRealCorrect = !practiceMode || isAnswerChecked ? q.answer === optNum : false;

                        return (
                          <button
                            key={optNum}
                            disabled={!practiceMode}
                            onClick={() => setPracticeAnswers((prev) => ({ ...prev, [q.id]: optNum }))}
                            className={`flex items-start gap-2.5 p-2.5 rounded border text-left text-xs transition ${
                              isSelected
                                ? 'border-[#f85149] bg-rose-950/30 text-rose-200'
                                : 'border-[#21262d] bg-[#0d1117] text-[#c9d1d9]'
                            } ${isRealCorrect ? '!border-[#238636] !bg-[#238636]/20 !text-[#7ee787] font-bold' : ''}`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#30363d] text-[10px]">
                              {optNum}
                            </span>
                            <span className="flex-1 font-sans">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 해설 및 정답 뷰어 */}
                    {isExplanationOpen ? (
                      <div className="rounded border border-[#21262d] bg-[#0d1117] p-3 text-xs space-y-1">
                        <div className="font-bold text-[#7ee787]">정답: {q.answer}번</div>
                        <div className="text-slate-300 leading-relaxed font-sans">
                          <span className="text-[#8b949e] font-semibold">해설: </span>
                          {q.explanation || '등록된 상세 해설이 없습니다.'}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleRevealExplanation(q.id)}
                        className="text-xs text-[#58a6ff] hover:underline"
                      >
                        💡 정답 및 해설 확인하기
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