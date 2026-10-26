'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Habit {
  id: number;
  title: string;
  category: string;
}

interface HabitLog {
  habit_id: number;
  completed_date: string;
}

const CATEGORIES = [
  { key: 'HEALTH', label: 'HEALTH', color: 'text-[#7ee787] border-[#238636] bg-[#238636]/20' },
  { key: 'STUDY', label: 'STUDY', color: 'text-[#58a6ff] border-[#1f6feb] bg-[#1f6feb]/20' },
  { key: 'DEV', label: 'DEV', color: 'text-[#d2a8ff] border-[#a371f7] bg-[#a371f7]/20' },
  { key: 'LIFESTYLE', label: 'LIFE', color: 'text-[#f0883e] border-[#bd561d] bg-[#bd561d]/20' },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 새 습관 추가 입력 상태
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('HEALTH');

  // 최근 7일 날짜 배열 생성 (오늘이 맨 끝)
  const today = new Date();
  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      dateStr,
      display: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[d.getDay()],
      isToday: i === 6,
    };
  });

  const todayStr = recentDays[6].dateStr;

  // DB 실시간 데이터 로드
  const fetchHabitsAndLogs = async () => {
    try {
      setLoading(true);
      // 1. 습관 목록
      const { data: hData, error: hError } = await supabase
        .from('user_habits')
        .select('*')
        .order('id', { ascending: true });

      if (hError) throw hError;

      // 2. 최근 30일간의 로그 조회
      const startDate = new Date();
      startDate.setDate(today.getDate() - 30);
      const startStr = startDate.toISOString().split('T')[0];

      const { data: lData, error: lError } = await supabase
        .from('user_habit_logs')
        .select('habit_id, completed_date')
        .gte('completed_date', startStr);

      if (lError) throw lError;

      if (hData) setHabits(hData);
      if (lData) setLogs(lData);
    } catch (err) {
      console.error('습관 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabitsAndLogs();
  }, []);

  // 습관 체크/체크해제 토글 (DB 즉시 반영)
  const handleToggleLog = async (habitId: number, dateStr: string) => {
    const isCompleted = logs.some((l) => l.habit_id === habitId && l.completed_date === dateStr);

    if (isCompleted) {
      // 1. 화면 즉시 해제 (낙관적 UI)
      setLogs((prev) => prev.filter((l) => !(l.habit_id === habitId && l.completed_date === dateStr)));
      // 2. DB 삭제
      const { error } = await supabase
        .from('user_habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', dateStr);

      if (error) {
        console.error('체크 해제 실패:', error.message);
        setLogs((prev) => [...prev, { habit_id: habitId, completed_date: dateStr }]);
        alert(`DB 반영 실패: ${error.message}`);
      }
    } else {
      // 1. 화면 즉시 체크
      setLogs((prev) => [...prev, { habit_id: habitId, completed_date: dateStr }]);
      // 2. DB 추가
      const { error } = await supabase
        .from('user_habit_logs')
        .insert({ habit_id: habitId, completed_date: dateStr });

      if (error) {
        console.error('체크 등록 실패:', error.message);
        setLogs((prev) => prev.filter((l) => !(l.habit_id === habitId && l.completed_date === dateStr)));
        alert(`DB 반영 실패: ${error.message}`);
      }
    }
  };

  // 새 습관 추가 (DB 즉시 반영)
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrim = newTitle.trim();
    if (!titleTrim) return;

    const { data, error } = await supabase
      .from('user_habits')
      .insert({ title: titleTrim, category: newCategory })
      .select('*')
      .single();

    if (error) {
      alert(`습관 등록 실패: ${error.message}`);
      return;
    }

    if (data) {
      setHabits((prev) => [...prev, data]);
      setNewTitle('');
    }
  };

  // 습관 삭제 (DB 즉시 반영)
  const handleDeleteHabit = async (id: number) => {
    if (!confirm('이 습관과 모든 달성 기록을 영구 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('user_habits').delete().eq('id', id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    setHabits((prev) => prev.filter((h) => h.id !== id));
    setLogs((prev) => prev.filter((l) => l.habit_id !== id));
  };

  // 연속 달성 스트릭(Streak) 계산 유틸리티
  const calculateStreak = (habitId: number) => {
    let streak = 0;
    const checkDate = new Date();

    // 오늘 체크했는지 확인
    const todayFormatted = checkDate.toISOString().split('T')[0];
    const isTodayDone = logs.some((l) => l.habit_id === habitId && l.completed_date === todayFormatted);

    if (!isTodayDone) {
      // 오늘 안 했으면 어제부터 거슬러 올라감
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const yyyy = checkDate.getFullYear();
      const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkDate.getDate()).padStart(2, '0');
      const curStr = `${yyyy}-${mm}-${dd}`;

      const done = logs.some((l) => l.habit_id === habitId && l.completed_date === curStr);
      if (done) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // 오늘 전체 달성률
  const todayDoneCount = habits.filter((h) =>
    logs.some((l) => l.habit_id === h.id && l.completed_date === todayStr)
  ).length;
  const todayRatePct = habits.length > 0 ? Math.round((todayDoneCount / habits.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      {/* 상단 헤더 */}
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-[#58a6ff] hover:underline font-bold">
            ← TERMINAL_HUB
          </Link>
          <span className="text-[#30363d]">|</span>
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            ENGINE 04 :: HABIT_MATRIX
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
            STREAK ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            TODAY: <span className="text-white font-bold">{todayStr}</span>
          </div>
          <div>
            SCORE: <span className="text-[#7ee787] font-bold">{todayDoneCount}/{habits.length} ({todayRatePct}%)</span>
          </div>
        </div>
      </header>

      {/* 상단 통계 바 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg shadow">
          <div className="text-[10px] text-[#8b949e] uppercase mb-1">TODAY_COMPLETION</div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {todayRatePct}%
          </div>
          <div className="h-1.5 w-full bg-[#0d1117] rounded-full overflow-hidden mt-2 border border-[#21262d]">
            <div style={{ width: `${todayRatePct}%` }} className="h-full bg-gradient-to-r from-[#238636] to-[#7ee787]" />
          </div>
        </div>

        <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg shadow">
          <div className="text-[10px] text-[#8b949e] uppercase mb-1">ACTIVE_HABITS</div>
          <div className="text-2xl font-extrabold text-[#58a6ff] font-mono">
            {habits.length} <span className="text-xs font-normal text-[#8b949e]">ROUTINES</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            지속 관리 중인 일상 매트릭스
          </div>
        </div>

        <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg shadow">
          <div className="text-[10px] text-[#8b949e] uppercase mb-1">TOP_STREAK</div>
          <div className="text-2xl font-extrabold text-[#d2a8ff] font-mono">
            🔥 {Math.max(0, ...habits.map((h) => calculateStreak(h.id)))} <span className="text-xs font-normal text-[#8b949e]">DAYS</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            최장 연속 달성 기록
          </div>
        </div>
      </section>

      {/* 습관 추가 폼 */}
      <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 shadow-lg">
        <form onSubmit={handleAddHabit} className="flex flex-col sm:flex-row gap-2 items-center text-xs">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full sm:w-36 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="매일 실천할 새로운 루틴 입력 (예: 영양제 복용, 헬스 1시간, 단어 암기)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full flex-1 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-[#7ee787]"
          />

          <button
            type="submit"
            className="w-full sm:w-auto bg-[#238636] hover:bg-[#2ea043] text-white px-5 py-2 rounded font-bold transition text-xs whitespace-nowrap shadow"
          >
            + ADD_HABIT
          </button>
        </form>
      </div>

      {/* 7일 매트릭스 보드 테이블 */}
      <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg overflow-x-auto">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4 min-w-[640px]">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            7-DAY_CONSISTENCY_MATRIX
          </span>
          <span className="text-[10px] text-[#8b949e]">
            * 클릭하여 즉시 체크 및 DB 실시간 동기화
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-[#8b949e]">매트릭스 동기화 중...</div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16 text-xs text-[#8b949e]">
            등록된 습관이 없습니다. 상단에서 첫 번째 루틴을 추가해보세요!
          </div>
        ) : (
          <div className="min-w-[640px] space-y-2">
            {/* 날짜 헤더 행 */}
            <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#21262d] text-xs text-[#8b949e] font-bold text-center items-center">
              <div className="col-span-4 text-left pl-2">HABIT_TITLE</div>
              <div className="col-span-1">STREAK</div>
              {recentDays.map((d) => (
                <div key={d.dateStr} className={`col-span-1 ${d.isToday ? 'text-[#7ee787] font-extrabold' : ''}`}>
                  <div>{d.display}</div>
                  <div className="text-[10px] font-normal">{d.dayName}</div>
                </div>
              ))}
            </div>

            {/* 개별 습관 행 */}
            {habits.map((h) => {
              const streak = calculateStreak(h.id);
              const catInfo = CATEGORIES.find((c) => c.key === h.category) || CATEGORIES[0];

              return (
                <div
                  key={h.id}
                  className="grid grid-cols-12 gap-2 p-2.5 rounded bg-[#0d1117] border border-[#21262d] text-xs items-center hover:border-[#30363d] transition group"
                >
                  {/* 제목 및 카테고리 */}
                  <div className="col-span-4 flex items-center justify-between pr-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      <span className="text-white font-medium truncate">{h.title}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(h.id)}
                      className="text-[#8b949e] hover:text-[#f85149] text-xs opacity-0 group-hover:opacity-100 transition px-1"
                    >
                      ×
                    </button>
                  </div>

                  {/* 연속 달성 스트릭 */}
                  <div className="col-span-1 text-center font-bold font-mono text-[#d2a8ff]">
                    {streak > 0 ? `🔥${streak}` : '-'}
                  </div>

                  {/* 최근 7일 체크박스 블록 */}
                  {recentDays.map((d) => {
                    const isDone = logs.some((l) => l.habit_id === h.id && l.completed_date === d.dateStr);

                    return (
                      <div key={d.dateStr} className="col-span-1 flex justify-center">
                        <button
                          onClick={() => handleToggleLog(h.id, d.dateStr)}
                          title={`${d.dateStr} [${h.title}]: ${isDone ? '완료됨' : '미완료'}`}
                          className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[#238636] border-[#2ea043] text-white font-bold shadow-md scale-105'
                              : d.isToday
                              ? 'bg-[#161b22] border-[#58a6ff]/60 hover:border-[#58a6ff]'
                              : 'bg-[#161b22] border-[#30363d] hover:border-[#8b949e]'
                          }`}
                        >
                          {isDone ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}