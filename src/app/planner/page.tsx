'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface TimeBlock {
  id: number;
  date: string;
  start_hour: number;
  start_minute: number;
  duration_minutes: number;
  title: string;
  category: string;
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; border: string; text: string }> = {
  STUDY: { label: 'STUDY', bg: 'bg-[#1f6feb]/30', border: 'border-[#1f6feb]', text: 'text-[#58a6ff]' },
  DEV: { label: 'DEV', bg: 'bg-[#a371f7]/30', border: 'border-[#a371f7]', text: 'text-[#d2a8ff]' },
  LECTURE: { label: 'LECTURE', bg: 'bg-[#238636]/30', border: 'border-[#238636]', text: 'text-[#7ee787]' },
  HEALTH: { label: 'HEALTH', bg: 'bg-[#bd561d]/30', border: 'border-[#bd561d]', text: 'text-[#f0883e]' },
  REST: { label: 'REST', bg: 'bg-[#30363d]/40', border: 'border-[#484f58]', text: 'text-[#8b949e]' },
};

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 ~ 23:00

export default function PlannerPage() {
  const [targetDate, setTargetDate] = useState<string>('2026-10-26');
  const [todayStr, setTodayStr] = useState<string>('2026-10-26');
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [currentMinutesFrom6AM, setCurrentMinutesFrom6AM] = useState<number>(-1);

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('STUDY');
  const [startHour, setStartHour] = useState<number>(14);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const nowFormatted = new Date().toISOString().split('T')[0];
      setTargetDate(nowFormatted);
      setTodayStr(nowFormatted);

      const updateTimeLine = () => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        if (h >= 6 && h <= 23) {
          setCurrentMinutesFrom6AM((h - 6) * 60 + m);
        } else {
          setCurrentMinutesFrom6AM(-1);
        }
      };
      updateTimeLine();
      const timer = setInterval(updateTimeLine, 60000);
      return () => clearInterval(timer);
    }
  }, []);

  const fetchBlocks = async (dateStr: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_timeblocks')
        .select('*')
        .eq('date', dateStr)
        .order('start_hour', { ascending: true })
        .order('start_minute', { ascending: true });

      if (error) throw error;
      if (data) setBlocks(data);
    } catch (err) {
      console.error('타임블록 페칭 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks(targetDate);
  }, [targetDate]);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const payload = {
      date: targetDate,
      start_hour: startHour,
      start_minute: startMinute,
      duration_minutes: duration,
      title: trimmed,
      category,
    };

    const { data, error } = await supabase
      .from('daily_timeblocks')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      alert(`블록 추가 실패: ${error.message}`);
      return;
    }

    if (data) {
      setBlocks((prev) => [...prev, data].sort((a, b) => a.start_hour - b.start_hour || a.start_minute - b.start_minute));
      setTitle('');
    }
  };

  const handleDeleteBlock = async (id: number) => {
    if (!confirm('이 타임블록을 삭제하시겠습니까?')) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));

    const { error } = await supabase.from('daily_timeblocks').delete().eq('id', id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      fetchBlocks(targetDate);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-[#58a6ff] hover:underline font-bold">
            ← TERMINAL_HUB
          </Link>
          <span className="text-[#30363d]">|</span>
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            ENGINE 06 :: TIME_BLOCKS
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#f0883e]/20 text-[#f0883e] border border-[#f0883e]/40">
            24H PLANNER
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8b949e]">TARGET_DATE:</span>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] px-2.5 py-1 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
          />
        </div>
      </header>

      <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 shadow-lg">
        <form onSubmit={handleAddBlock} className="flex flex-col sm:flex-row gap-2 items-center text-xs">
          <input
            type="text"
            placeholder="블록 일정 명칭 (예: 컴파일러 과제, 헬스장 등)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full flex-1 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
          />

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] px-2.5 py-2 rounded text-white text-xs focus:outline-none"
            >
              <option value="STUDY">STUDY</option>
              <option value="DEV">DEV</option>
              <option value="LECTURE">LECTURE</option>
              <option value="HEALTH">HEALTH</option>
              <option value="REST">REST</option>
            </select>

            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] px-2 py-2 rounded text-white text-xs focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}시</option>
              ))}
            </select>

            <select
              value={startMinute}
              onChange={(e) => setStartMinute(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] px-2 py-2 rounded text-white text-xs focus:outline-none"
            >
              <option value={0}>00분</option>
              <option value={30}>30분</option>
            </select>

            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-[#0d1117] border border-[#30363d] px-2 py-2 rounded text-white text-xs focus:outline-none"
            >
              <option value={30}>30분</option>
              <option value={60}>1시간</option>
              <option value={90}>1.5시간</option>
              <option value={120}>2시간</option>
              <option value={180}>3시간</option>
            </select>

            <button
              type="submit"
              className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded font-bold transition text-xs whitespace-nowrap"
            >
              + ADD_BLOCK
            </button>
          </div>
        </form>
      </div>

      <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            24-HOUR_EXECUTION_TIMELINE ({blocks.length}개 블록)
          </span>
          <span className="text-[10px] text-[#8b949e]">
            * 붉은 선: 현재 실시간 KST 시간 인디케이터
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-[#8b949e]">타임라인 로딩 중...</div>
        ) : (
          <div className="relative border-l border-[#30363d] ml-16 space-y-4 py-2">
            {targetDate === todayStr && currentMinutesFrom6AM >= 0 && (
              <div
                style={{ top: `${(currentMinutesFrom6AM / 60) * 64}px` }}
                className="absolute -left-16 right-0 z-30 flex items-center pointer-events-none transition-all duration-500"
              >
                <span className="text-[10px] font-bold bg-[#f85149] text-white px-1.5 py-0.5 rounded-sm shadow">
                  NOW
                </span>
                <div className="flex-1 h-[2px] bg-[#f85149] shadow-[0_0_8px_#f85149]" />
              </div>
            )}

            {HOURS.map((h) => {
              const matchedBlocks = blocks.filter((b) => b.start_hour === h);

              return (
                <div key={h} className="relative h-14 flex items-center group">
                  <div className="absolute -left-16 text-[11px] font-bold font-mono text-[#8b949e] w-12 text-right pr-2">
                    {String(h).padStart(2, '0')}:00
                  </div>

                  <div className="absolute left-0 right-0 border-b border-[#21262d] group-hover:border-[#30363d] pointer-events-none" />

                  <div className="relative z-10 flex flex-wrap gap-2 w-full pl-3">
                    {matchedBlocks.map((b) => {
                      const cat = CATEGORY_MAP[b.category] || CATEGORY_MAP.STUDY;
                      return (
                        <div
                          key={b.id}
                          className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border shadow-lg ${cat.bg} ${cat.border} transition-all hover:scale-[1.01]`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${cat.border} ${cat.text} bg-[#0d1117]`}>
                              {cat.label}
                            </span>
                            <span className="text-xs font-bold text-white font-sans">{b.title}</span>
                            <span className="text-[10px] text-[#8b949e] font-mono">
                              ({String(b.start_hour).padStart(2, '0')}:{String(b.start_minute).padStart(2, '0')} ~ {b.duration_minutes}분간)
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteBlock(b.id)}
                            className="text-[#8b949e] hover:text-[#f85149] text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}