'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface LedgerItem {
  id: number;
  date: string;
  type: 'EXPENSE' | 'INCOME';
  category: string;
  amount: number;
  description: string;
  payment_method: string;
}

const CATEGORIES = ['식비', '카페/간식', '교통', '데이트', '도서/학습', '생활/쇼핑', '문화/취미', '기타'];
const PAYMENT_METHODS = ['CARD', 'CASH', 'TRANSFER'];

export default function LedgerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  const [loginId, setLoginId] = useState<string>('');
  const [loginPw, setLoginPw] = useState<string>('');
  const [loginError, setLoginError] = useState<boolean>(false);

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(600000);
  const [isEditingBudget, setIsEditingBudget] = useState<boolean>(false);
  const [budgetInput, setBudgetInput] = useState<number>(600000);

  const [inputDate, setInputDate] = useState<string>('');
  const [inputType, setInputType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [inputCategory, setInputCategory] = useState<string>('식비');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [inputDesc, setInputDesc] = useState<string>('');
  const [inputPayment, setInputPayment] = useState<string>('CARD');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayFormatted = `${yyyy}-${mm}-${dd}`;
      const monthFormatted = `${yyyy}-${mm}`;

      setInputDate(todayFormatted);
      setSelectedMonth(monthFormatted);

      const auth = sessionStorage.getItem('station_auth_status') === 'true';
      setIsAuthenticated(auth);
      setAuthChecked(true);
      if (auth) {
        fetchData();
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId === 'ddan1218' && loginPw === 'TLSALSWHD') {
      setIsAuthenticated(true);
      setLoginError(false);
      sessionStorage.setItem('station_auth_status', 'true');
      fetchData();
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('station_auth_status');
    setItems([]);
  };

  const fetchData = async () => {
    try {
      const { data: bData } = await supabase.from('monthly_budget_config').select('*').eq('id', 1).maybeSingle();
      if (bData && bData.target_budget) {
        setMonthlyBudget(bData.target_budget);
        setBudgetInput(bData.target_budget);
      }

      const { data: lData, error } = await supabase
        .from('daily_ledger')
        .select('*')
        .order('date', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;
      if (lData) setItems(lData);
    } catch (err) {
      console.error('가계부 데이터 로드 실패:', err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(inputAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('올바른 금액을 입력하십시오.');
      return;
    }

    const newItem = {
      date: inputDate,
      type: inputType,
      category: inputCategory,
      amount: amountNum,
      description: inputDesc.trim() || inputCategory,
      payment_method: inputPayment,
    };

    const { data, error } = await supabase.from('daily_ledger').insert(newItem).select().single();

    if (error) {
      alert(`등록 실패: ${error.message}`);
      return;
    }

    if (data) {
      setItems((prev) => [data, ...prev]);
      setInputAmount('');
      setInputDesc('');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('daily_ledger').delete().eq('id', id);
    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveBudget = async () => {
    if (budgetInput <= 0) return;
    const { error } = await supabase.from('monthly_budget_config').upsert({ id: 1, target_budget: budgetInput });
    if (error) {
      alert(`예산 설정 실패: ${error.message}`);
      return;
    }
    setMonthlyBudget(budgetInput);
    setIsEditingBudget(false);
  };

  if (authChecked && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono flex items-center justify-center p-4">
        <div className="w-full max-w-md border border-[#30363d] bg-[#161b22] p-8 rounded-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
            <span className="text-xs font-bold text-rose-400 tracking-wider flex items-center gap-2">
              <span>🔒 ENCRYPTED_LEDGER_VAULT</span>
            </span>
            <Link href="/" className="text-xs text-[#58a6ff] hover:underline font-bold">
              ← TERMINAL_HUB
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="text-base font-bold text-white">개인 자산 및 가계부 보안 구역</h1>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              본 모듈은 개인 금융 및 지출 내역을 포함하고 있어 인가된 관리자 계정으로 로그인하기 전까지 모든 데이터가 비공개로 유지됩니다.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 pt-2">
            <div>
              <label className="text-[10px] text-[#8b949e] uppercase block mb-1">OPERATOR ID</label>
              <input
                type="text"
                placeholder="ID"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#8b949e] uppercase block mb-1">PASSWORD</label>
              <input
                type="password"
                placeholder="Password"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              />
            </div>

            {loginError && (
              <div className="text-[11px] text-[#f85149]">❌ 인증 실패: 관리자 정보가 일치하지 않습니다.</div>
            )}

            <button
              type="submit"
              className="w-full bg-[#238636] hover:bg-[#2ea043] text-white py-2 rounded font-bold text-xs transition mt-2 shadow-lg"
            >
              인증 및 보안 해제 (UNLOCK)
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) => selectedMonth ? item.date.startsWith(selectedMonth) : true);
  const totalExpense = filteredItems.filter((i) => i.type === 'EXPENSE').reduce((acc, cur) => acc + cur.amount, 0);
  const totalIncome = filteredItems.filter((i) => i.type === 'INCOME').reduce((acc, cur) => acc + cur.amount, 0);
  const remainingBudget = monthlyBudget - totalExpense;
  const burnRatePct = monthlyBudget > 0 ? Math.min(100, Math.round((totalExpense / monthlyBudget) * 100)) : 0;

  const categoryStats: Record<string, number> = {};
  filteredItems
    .filter((i) => i.type === 'EXPENSE')
    .forEach((i) => {
      categoryStats[i.category] = (categoryStats[i.category] || 0) + i.amount;
    });

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-[#58a6ff] hover:underline font-bold">
            ← TERMINAL_HUB
          </Link>
          <span className="text-[#30363d]">|</span>
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            ENGINE 03 :: DEV_LEDGER
          </span>
          <button
            onClick={handleLogout}
            className="text-[10px] px-2 py-0.5 rounded border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 transition font-bold"
          >
            LOCK & LOGOUT
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8b949e]">TARGET_MONTH:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] px-2.5 py-1 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
          />
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-[#30363d] bg-[#161b22] p-5 rounded-lg shadow-lg">
          <div className="text-[10px] text-[#8b949e] uppercase mb-1">TOTAL_MONTHLY_EXPENSE</div>
          <div className="text-2xl font-extrabold text-[#f85149] font-mono">
            {totalExpense.toLocaleString()} <span className="text-sm font-normal text-[#8b949e]">KRW</span>
          </div>
          <div className="text-[11px] text-[#8b949e] mt-2">
            수입: <span className="text-[#7ee787] font-bold">+{totalIncome.toLocaleString()}원</span>
          </div>
        </div>

        <div className="border border-[#30363d] bg-[#161b22] p-5 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[#8b949e] uppercase">REMAINING_BUDGET</span>
            {isEditingBudget ? (
              <button onClick={handleSaveBudget} className="text-[10px] text-[#58a6ff] font-bold hover:underline">
                SAVE
              </button>
            ) : (
              <button onClick={() => setIsEditingBudget(true)} className="text-[10px] text-[#8b949e] hover:text-white">
                EDIT
              </button>
            )}
          </div>

          <div className={`text-2xl font-extrabold font-mono ${remainingBudget < 0 ? 'text-[#f85149]' : 'text-[#7ee787]'}`}>
            {remainingBudget.toLocaleString()} <span className="text-sm font-normal text-[#8b949e]">KRW</span>
          </div>

          <div className="text-[11px] text-[#8b949e] mt-2 flex items-center gap-1">
            <span>목표 예산:</span>
            {isEditingBudget ? (
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(Number(e.target.value))}
                className="w-24 bg-[#0d1117] border border-[#30363d] rounded px-1 text-white text-xs"
              />
            ) : (
              <span className="text-white font-bold">{monthlyBudget.toLocaleString()}원</span>
            )}
          </div>
        </div>

        <div className="border border-[#30363d] bg-[#161b22] p-5 rounded-lg shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] text-[#8b949e] uppercase mb-2">
              <span>BUDGET_BURN_RATE</span>
              <span className={`font-bold ${burnRatePct > 90 ? 'text-[#f85149]' : burnRatePct > 70 ? 'text-[#e3b341]' : 'text-[#7ee787]'}`}>
                {burnRatePct}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#0d1117] rounded-full overflow-hidden border border-[#21262d]">
              <div
                style={{ width: `${burnRatePct}%` }}
                className={`h-full transition-all duration-300 ${
                  burnRatePct > 90 ? 'bg-[#f85149]' : burnRatePct > 70 ? 'bg-[#e3b341]' : 'bg-[#238636]'
                }`}
              />
            </div>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-2">
            {burnRatePct >= 100 ? '🚨 이번 달 목표 예산 초과!' : burnRatePct >= 80 ? '⚠️ 예산 소진 80% 임박, 절약 모드 권장' : '✅ 안정적인 지출 속도 유지 중'}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="border border-[#30363d] bg-[#161b22] p-5 rounded-lg shadow-lg">
            <span className="text-xs font-bold text-white uppercase tracking-wider block border-b border-[#30363d] pb-2 mb-4">
              + QUICK_ENTRY
            </span>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-1 bg-[#0d1117] p-1 rounded border border-[#21262d]">
                <button
                  type="button"
                  onClick={() => setInputType('EXPENSE')}
                  className={`py-1 rounded text-xs font-bold transition ${
                    inputType === 'EXPENSE' ? 'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/50' : 'text-[#8b949e]'
                  }`}
                >
                  지출 (EXPENSE)
                </button>
                <button
                  type="button"
                  onClick={() => setInputType('INCOME')}
                  className={`py-1 rounded text-xs font-bold transition ${
                    inputType === 'INCOME' ? 'bg-[#238636]/20 text-[#7ee787] border border-[#238636]/50' : 'text-[#8b949e]'
                  }`}
                >
                  수입 (INCOME)
                </button>
              </div>

              <div>
                <label className="text-[10px] text-[#8b949e] uppercase block mb-1">DATE</label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8b949e] uppercase block mb-1">AMOUNT (KRW)</label>
                <input
                  type="number"
                  placeholder="예: 8500"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded text-white text-sm font-bold focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#8b949e] uppercase block mb-1">CATEGORY</label>
                  <select
                    value={inputCategory}
                    onChange={(e) => setInputCategory(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded text-white text-xs focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#8b949e] uppercase block mb-1">PAYMENT</label>
                  <select
                    value={inputPayment}
                    onChange={(e) => setInputPayment(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded text-white text-xs focus:outline-none"
                  >
                    {PAYMENT_METHODS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8b949e] uppercase block mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  placeholder="사용처 메모..."
                  value={inputDesc}
                  onChange={(e) => setInputDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded text-white text-xs focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white py-2 rounded font-bold transition text-xs shadow-md mt-1"
              >
                + RECORD_TRANSACTION
              </button>
            </form>
          </div>

          <div className="border border-[#30363d] bg-[#161b22] p-5 rounded-lg shadow-lg">
            <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block border-b border-[#30363d] pb-2 mb-3">
              CATEGORY_BREAKDOWN
            </span>

            {Object.keys(categoryStats).length === 0 ? (
              <div className="text-[11px] text-[#8b949e] py-3 text-center">이번 달 지출 내역이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(categoryStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => {
                    const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#c9d1d9]">{cat}</span>
                          <span className="font-mono text-white font-bold">
                            {amt.toLocaleString()}원 <span className="text-[10px] text-[#8b949e]">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#0d1117] rounded-full overflow-hidden">
                          <div style={{ width: `${pct}%` }} className="h-full bg-[#58a6ff]" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                TRANSACTION_LEDGER ({filteredItems.length}건)
              </span>
              <span className="text-[10px] text-[#8b949e]">{selectedMonth} 기준</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="text-xs text-[#8b949e] py-16 text-center">
                  선택한 달의 거래 기록이 없습니다. 좌측에서 첫 기록을 남겨보세요!
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded bg-[#0d1117] border border-[#21262d] text-xs hover:border-[#30363d] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#8b949e] text-[11px] shrink-0">{item.date}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          item.type === 'EXPENSE'
                            ? 'bg-rose-950/40 text-[#f85149] border border-rose-500/40'
                            : 'bg-emerald-950/40 text-[#7ee787] border border-emerald-500/40'
                        }`}
                      >
                        {item.category}
                      </span>
                      <span className="text-white truncate max-w-[200px] sm:max-w-xs">{item.description}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold text-xs ${
                          item.type === 'EXPENSE' ? 'text-[#f85149]' : 'text-[#7ee787]'
                        }`}
                      >
                        {item.type === 'EXPENSE' ? '-' : '+'}
                        {item.amount.toLocaleString()}원
                      </span>
                      <span className="text-[10px] text-[#8b949e] border border-[#21262d] px-1 py-0.2 rounded hidden sm:inline">
                        {item.payment_method}
                      </span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-[#8b949e] hover:text-[#f85149] text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}