'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface KanbanTask {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date: string | null;
}

const COLUMNS: { key: 'TODO' | 'IN_PROGRESS' | 'DONE'; label: string; color: string; border: string }[] = [
  { key: 'TODO', label: 'TODO (대기 큐)', color: 'text-[#8b949e]', border: 'border-[#30363d]' },
  { key: 'IN_PROGRESS', label: 'IN PROGRESS (진행 중)', color: 'text-[#58a6ff]', border: 'border-[#1f6feb]' },
  { key: 'DONE', label: 'DONE (완료됨)', color: 'text-[#7ee787]', border: 'border-[#238636]' },
];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 새 태스크 추가 폼 상태
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState<string>('');

  // 1. DB 실시간 데이터 로드
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kanban_tasks')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setTasks(data);
    } catch (err) {
      console.error('칸반 태스크 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // 2. 태스크 상태(컬럼) 변경 (DB 즉시 반영)
  const handleMoveStatus = async (taskId: number, nextStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    // 화면 즉시 반영 (낙관적 UI)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));

    const { error } = await supabase
      .from('kanban_tasks')
      .update({ status: nextStatus })
      .eq('id', taskId);

    if (error) {
      console.error('상태 변경 실패:', error.message);
      alert(`상태 변경 실패: ${error.message}`);
      fetchTasks(); // 롤백
    }
  };

  // 3. 태스크 추가 (DB 즉시 반영)
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrim = newTitle.trim();
    if (!titleTrim) return;

    const payload = {
      title: titleTrim,
      description: newDesc.trim(),
      status: 'TODO',
      priority: newPriority,
      due_date: newDueDate || null,
    };

    const { data, error } = await supabase
      .from('kanban_tasks')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      alert(`태스크 등록 실패: ${error.message}`);
      return;
    }

    if (data) {
      setTasks((prev) => [data, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
    }
  };

  // 4. 태스크 삭제 (DB 즉시 반영)
  const handleDeleteTask = async (id: number) => {
    if (!confirm('이 태스크를 삭제하시겠습니까?')) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from('kanban_tasks').delete().eq('id', id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      fetchTasks();
    }
  };

  // D-Day 계산 유틸리티
  const calculateDday = (targetDateStr: string | null) => {
    if (!targetDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-DAY';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      {/* 헤더 바 */}
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-[#58a6ff] hover:underline font-bold">
            ← TERMINAL_HUB
          </Link>
          <span className="text-[#30363d]">|</span>
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            ENGINE 05 :: KANBAN_MATRIX
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
            SPRINT PIPELINE
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#8b949e]">
          <div>TOTAL: <span className="text-white font-bold">{tasks.length}</span> TASKS</div>
          <div>DONE: <span className="text-[#7ee787] font-bold">{tasks.filter((t) => t.status === 'DONE').length}</span></div>
        </div>
      </header>

      {/* 태스크 추가 아코디언/폼 */}
      <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 shadow-lg">
        <form onSubmit={handleAddTask} className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="프로젝트 / 과제 핵심 태스크 제목..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
            />
            <div className="flex gap-2">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="bg-[#0d1117] border border-[#30363d] px-2.5 py-2 rounded text-white text-xs focus:outline-none"
              >
                <option value="HIGH">우선순위: HIGH</option>
                <option value="MEDIUM">우선순위: MED</option>
                <option value="LOW">우선순위: LOW</option>
              </select>

              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] px-2.5 py-2 rounded text-white text-xs focus:outline-none"
              />

              <button
                type="submit"
                className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded font-bold transition text-xs whitespace-nowrap"
              >
                + ADD_CARD
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="상세 내용 메모 (선택 사항)..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
          />
        </form>
      </div>

      {/* 3열 칸반 컬럼 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className={`border ${col.border} bg-[#161b22]/70 rounded-xl p-4 flex flex-col min-h-[500px] shadow-lg`}
            >
              {/* 컬럼 헤더 */}
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2.5 mb-3">
                <span className={`text-xs font-bold ${col.color} tracking-wider uppercase`}>
                  {col.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d1117] border border-[#30363d] text-white font-bold">
                  {colTasks.length}
                </span>
              </div>

              {/* 태스크 카드 스택 */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-12 text-[11px] text-[#8b949e]">태스크가 비어 있습니다.</div>
                ) : (
                  colTasks.map((t) => {
                    const dday = calculateDday(t.due_date);

                    return (
                      <div
                        key={t.id}
                        className="border border-[#30363d] bg-[#0d1117] p-3.5 rounded-lg text-xs space-y-2 hover:border-[#58a6ff] transition group shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-white font-bold leading-5">{t.title}</span>
                          <button
                            onClick={() => handleDeleteTask(t.id)}
                            className="text-[#8b949e] hover:text-[#f85149] text-xs px-1 opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                        </div>

                        {t.description && (
                          <p className="text-[11px] text-[#8b949e] leading-relaxed whitespace-pre-wrap">
                            {t.description}
                          </p>
                        )}

                        {/* 메타 태그 (우선순위 & D-Day) */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold border ${
                              t.priority === 'HIGH'
                                ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                                : t.priority === 'MEDIUM'
                                ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>

                          {dday && (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-indigo-950/40 text-indigo-300 border border-indigo-500/40">
                              {dday} ({t.due_date})
                            </span>
                          )}
                        </div>

                        {/* 상태 변경 제어 바 */}
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#21262d]">
                          {t.status !== 'TODO' && (
                            <button
                              onClick={() => handleMoveStatus(t.id, t.status === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                              className="text-[10px] px-2 py-0.5 rounded border border-[#30363d] bg-[#161b22] text-[#8b949e] hover:text-white"
                            >
                              ◀ 이전
                            </button>
                          )}
                          {t.status !== 'DONE' && (
                            <button
                              onClick={() => handleMoveStatus(t.id, t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                              className="text-[10px] px-2 py-0.5 rounded border border-[#1f6feb]/50 bg-[#1f6feb]/20 text-[#58a6ff] hover:bg-[#1f6feb]/40 font-bold"
                            >
                              다음 ▶
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}