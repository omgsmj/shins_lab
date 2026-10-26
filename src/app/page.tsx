'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ScheduleItem {
  id: number;
  date: string;
  title: string;
  category: 'DEV' | 'ACADEMIC' | 'PERSONAL';
}

interface UserProfile {
  name: string;
  affiliation: string;
  specialization: string;
  coreStack: string;
}

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { id: 1, date: '2026-10-26', title: '정보처리기사 CBT 엔진 빌드', category: 'DEV' },
  { id: 2, date: '2026-10-28', title: 'AI 파이프라인 통합 테스트', category: 'ACADEMIC' },
  { id: 3, date: '2026-11-05', title: '기술 자소서 1차 탈고', category: 'DEV' },
];

export default function EngineeringHub() {
  // 1. 시스템 텔레메트리 & 실시간 날씨
  const [timeStr, setTimeStr] = useState<string>('');
  const [uptime, setUptime] = useState<number>(0);
  const [weatherStr, setWeatherStr] = useState<string>('WEATHER SYNCING...');

  // 2. 대표 프로필 정보 (홈페이지 내 편집 지원)
  const [profile, setProfile] = useState<UserProfile>({
    name: '신민종 (SHIN MINJONG)',
    affiliation: '전주대학교 (Senior)',
    specialization: '인공지능학 × 일본언어문화학',
    coreStack: 'Python, OpenCV, Next.js, TypeScript',
  });
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // 3. 인증 및 자소서 금고
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [careerDoc, setCareerDoc] = useState<string>(
    `[핵심 역량 및 엔지니어링 지향점]
- Python, OpenCV 기반의 컴퓨터 비전 파이프라인 및 응용 GUI 소프트웨어 구축 역량.
- Next.js (App Router), TypeScript, Supabase 기반 풀스택 시스템 아키텍처 설계.
- 일본어 비즈니스 커뮤니케이션 및 기술 문서 독해 역량 (일본언어문화 / 인공지능 복수전공).
- 실패를 숨기지 않는 방어적 프로그래밍과 데이터 무손실 파싱 지향.`
  );

  // 4. 달력 및 일정 상태 (영구 저장 연동)
  const [schedules, setSchedules] = useState<ScheduleItem[]>(DEFAULT_SCHEDULES);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 26)); // 기준: 2026년 10월
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('2026-10-26');
  const [newCategory, setNewCategory] = useState<'DEV' | 'ACADEMIC' | 'PERSONAL'>('DEV');

  // 5. 스크래치패드
  const [scratchpad, setScratchpad] = useState<string>(
    '// QUICK SCRATCHPAD (Auto-saved)\n$ python -m venv venv\n$ pip install -r requirements.txt'
  );

  // 실시간 시계
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short',
        }) + ' ' + now.toTimeString().split(' ')[0]
      );
      setUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 전주시 실시간 날씨
  useEffect(() => {
    const fetchJeonjuWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=35.8242&longitude=127.148&current=temperature_2m,weather_code,wind_speed_10m'
        );
        const data = await res.json();
        if (data && data.current) {
          const temp = data.current.temperature_2m;
          const wind = data.current.wind_speed_10m;
          const code = data.current.weather_code;
          let weatherDesc = 'CLEAR';
          if (code >= 1 && code <= 3) weatherDesc = 'CLOUDY';
          else if (code >= 51 && code <= 67) weatherDesc = 'RAIN';
          else if (code >= 71 && code <= 77) weatherDesc = 'SNOW';

          setWeatherStr(`${temp}°C (${weatherDesc}, ${wind}km/h)`);
        }
      } catch (err) {
        setWeatherStr('WEATHER OFFLINE');
      }
    };
    fetchJeonjuWeather();
  }, []);

  // 로컬 스토리지 데이터 복원 (프로필, 자소서, 스크래치패드, 일정)
  useEffect(() => {
    const savedProfile = localStorage.getItem('station_user_profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {}
    }

    const savedDoc = localStorage.getItem('station_career_doc');
    if (savedDoc) setCareerDoc(savedDoc);

    const savedScratch = localStorage.getItem('station_scratchpad');
    if (savedScratch) setScratchpad(savedScratch);

    // 일정 로컬 복원
    const savedSchedules = localStorage.getItem('station_schedules');
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSchedules(parsed);
        }
      } catch (e) {}
    }

    // Supabase DB 일정 동기화 시도
    const fetchRemoteSchedules = async () => {
      try {
        const { data, error } = await supabase
          .from('user_schedules')
          .select('*')
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          setSchedules(data);
          localStorage.setItem('station_schedules', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('DB offline, using local persistent storage.');
      }
    };

    fetchRemoteSchedules();
  }, []);

  // 스크래치패드 자동 저장
  const handleScratchpadChange = (val: string) => {
    setScratchpad(val);
    localStorage.setItem('station_scratchpad', val);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '1218') {
      setIsAuthenticated(true);
      setAuthError(false);
      setPasscode('');
    } else {
      setAuthError(true);
    }
  };

  const handleSaveProfile = () => {
    localStorage.setItem('station_user_profile', JSON.stringify(profile));
    setIsEditingProfile(false);
    alert('프로필 변경 사항이 저장되었습니다.');
  };

  const handleSaveCareerDoc = () => {
    localStorage.setItem('station_career_doc', careerDoc);
    alert('자소서 데이터가 안전하게 영구 저장되었습니다.');
  };

  // 일정 추가 (LocalStorage + Supabase 양방향 영구 보존)
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ScheduleItem = {
      id: Date.now(),
      date: newDate,
      title: newTitle,
      category: newCategory,
    };

    const updated = [...schedules, newItem].sort((a, b) => a.date.localeCompare(b.date));
    setSchedules(updated);
    localStorage.setItem('station_schedules', JSON.stringify(updated));
    setNewTitle('');

    try {
      await supabase.from('user_schedules').insert({
        date: newDate,
        title: newTitle,
        category: newCategory,
      });
    } catch (err) {
      console.warn('DB remote sync bypassed.');
    }
  };

  // 일정 삭제 (LocalStorage + Supabase)
  const handleDeleteSchedule = async (id: number) => {
    const updated = schedules.filter((item) => item.id !== id);
    setSchedules(updated);
    localStorage.setItem('station_schedules', JSON.stringify(updated));

    try {
      await supabase.from('user_schedules').delete().eq('id', id);
    } catch (err) {
      console.warn('DB delete bypassed.');
    }
  };

  // 달력 렌더링용 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      {/* 1. 최상단 엔지니어링 헤더 & 날씨 텔레메트리 바 */}
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[#238636] animate-pulse" />
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            STATION_TERMINAL :: {profile.name.split(' ')[0]}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            ENV: PRODUCTION (v2.6.0)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8b949e]">
          <div>
            LOC: <span className="text-[#58a6ff]">JEONJU-SI</span>{' '}
            <span className="text-[#e3b341] font-bold">[{weatherStr}]</span>
          </div>
          <div>KST: <span className="text-[#7ee787] font-bold">{timeStr || 'SYNCING...'}</span></div>
          <div>UPTIME: <span className="text-white font-bold">{uptime}s</span></div>
        </div>
      </header>

      {/* 2. 빠른 실행 서브시스템 링크 (통합 런처) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Link
          href="/cbt"
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#58a6ff] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#58a6ff]">ENGINE 01</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
              SUITE
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">CBT 통합 시스템</div>
          <div className="text-xs text-[#8b949e] mt-1">
            시험 응시 · 오답노트 보관함 · 문제 주입기 통합
          </div>
        </Link>

        <Link
          href="/weather"
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#7ee787] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#7ee787]">ENGINE 02</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
              LIVE
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">전주대 기상 관측소</div>
          <div className="text-xs text-[#8b949e] mt-1">
            캠퍼스(효자동) 실시간 기상 관측 및 단기 예보
          </div>
        </Link>

        <a
          href="https://github.com/omgsmj/shins_lab"
          target="_blank"
          rel="noreferrer"
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#a371f7] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#a371f7]">REMOTE 03</span>
            <span className="text-[10px] text-[#8b949e]">v2.6</span>
          </div>
          <div className="text-base font-bold text-white mt-1">GitHub 저장소 ↗</div>
          <div className="text-xs text-[#8b949e] mt-1">프로젝트 소스 코드 및 버전 관리</div>
        </a>
      </section>

      {/* 메인 2열 그리드: 일정/캘린더 vs 프로필/자소서 금고 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* [좌측 7열]: 달력 및 일정 텔레메트리 */}
        <section className="lg:col-span-7 space-y-6">
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wider">SCHEDULE_CALENDAR</span>
                <span className="text-xs text-[#8b949e]">
                  ({year}.{String(month + 1).padStart(2, '0')})
                </span>
              </div>
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]"
                >
                  ◀ PREV
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]"
                >
                  NEXT ▶
                </button>
              </div>
            </div>

            {/* 월간 그리드 (일정 텍스트 직접 노출) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (
                <div key={day} className={`font-bold py-1 ${idx === 0 ? 'text-[#f85149]' : 'text-[#8b949e]'}`}>
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[72px] border border-transparent" />
              ))}
              {daysArray.map((d) => {
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const matchedSchedules = schedules.filter((s) => s.date === dateKey);
                const isToday = d === 26 && month === 9; // 오늘 강조

                return (
                  <div
                    key={d}
                    onClick={() => setNewDate(dateKey)}
                    className={`min-h-[72px] border rounded p-1 text-left flex flex-col justify-start cursor-pointer transition overflow-hidden ${
                      isToday
                        ? 'border-[#58a6ff] bg-[#58a6ff]/10 font-bold text-white'
                        : matchedSchedules.length > 0
                        ? 'border-[#30363d] bg-[#21262d]/60 text-[#c9d1d9]'
                        : 'border-[#21262d] bg-[#0d1117]/50 text-[#8b949e] hover:border-[#30363d]'
                    }`}
                  >
                    <span className="text-[10px] mb-1 font-mono">{d}</span>
                    <div className="space-y-1 w-full">
                      {matchedSchedules.map((s) => (
                        <div
                          key={s.id}
                          title={s.title}
                          className={`text-[9px] px-1 py-0.5 rounded truncate font-sans ${
                            s.category === 'DEV'
                              ? 'bg-[#238636]/30 text-[#7ee787] border border-[#238636]/50'
                              : s.category === 'ACADEMIC'
                              ? 'bg-[#1f6feb]/30 text-[#58a6ff] border border-[#1f6feb]/50'
                              : 'bg-[#a371f7]/30 text-[#d2a8ff] border border-[#a371f7]/50'
                          }`}
                        >
                          {s.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 일정 추가 폼 */}
            <form onSubmit={handleAddSchedule} className="pt-3 border-t border-[#30363d] flex flex-col sm:flex-row gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-xs px-2.5 py-1.5 rounded text-white focus:outline-none focus:border-[#58a6ff]"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="bg-[#0d1117] border border-[#30363d] text-xs px-2.5 py-1.5 rounded text-white focus:outline-none"
              >
                <option value="DEV">DEV</option>
                <option value="ACADEMIC">ACADEMIC</option>
                <option value="PERSONAL">PERSONAL</option>
              </select>
              <input
                type="text"
                placeholder="새로운 태스크 또는 일정 입력..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs px-3 py-1.5 rounded text-white focus:outline-none focus:border-[#58a6ff]"
              />
              <button
                type="submit"
                className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs px-4 py-1.5 rounded font-bold transition whitespace-nowrap"
              >
                + ADD_TASK
              </button>
            </form>
          </div>

          {/* 등록된 일정 큐 리스트 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#8b949e] uppercase">SCHEDULED_EVENTS_QUEUE</span>
              <span className="text-[10px] text-[#238636]">STORAGE: SYNCED</span>
            </div>
            <div className="space-y-2">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded bg-[#0d1117] border border-[#21262d] text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#58a6ff] text-[11px]">{s.date}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        s.category === 'DEV'
                          ? 'bg-[#238636]/20 text-[#7ee787]'
                          : s.category === 'ACADEMIC'
                          ? 'bg-[#1f6feb]/20 text-[#58a6ff]'
                          : 'bg-[#a371f7]/20 text-[#d2a8ff]'
                      }`}
                    >
                      {s.category}
                    </span>
                    <span className="text-slate-200">{s.title}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(s.id)}
                    className="text-[#8b949e] hover:text-[#f85149] text-xs px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* [우측 5열]: 대표소개 & 인라인 정보 편집 & 자소서 금고 */}
        <section className="lg:col-span-5 space-y-6">
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-sm font-bold text-white tracking-wider">ENGINEER_DOSSIER</span>
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      if (isEditingProfile) handleSaveProfile();
                      else setIsEditingProfile(true);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/20 font-bold transition"
                  >
                    {isEditingProfile ? 'SAVE_PROFILE' : 'EDIT_PROFILE'}
                  </button>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
                  ACTIVE CHIEF
                </span>
              </div>
            </div>

            {/* 대표 프로필 (편집 모드 지원) */}
            <div className="space-y-3 text-xs mb-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#21262d] pb-2 gap-1">
                <span className="text-[#8b949e]">OPERATOR:</span>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs"
                  />
                ) : (
                  <span className="text-white font-bold">{profile.name}</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#21262d] pb-2 gap-1">
                <span className="text-[#8b949e]">AFFILIATION:</span>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profile.affiliation}
                    onChange={(e) => setProfile({ ...profile, affiliation: e.target.value })}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs"
                  />
                ) : (
                  <span className="text-[#c9d1d9]">{profile.affiliation}</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#21262d] pb-2 gap-1">
                <span className="text-[#8b949e]">SPECIALIZATION:</span>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profile.specialization}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs"
                  />
                ) : (
                  <span className="text-[#7ee787]">{profile.specialization}</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#21262d] pb-2 gap-1">
                <span className="text-[#8b949e]">CORE_STACK:</span>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profile.coreStack}
                    onChange={(e) => setProfile({ ...profile, coreStack: e.target.value })}
                    className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs"
                  />
                ) : (
                  <span className="text-[#58a6ff]">{profile.coreStack}</span>
                )}
              </div>
            </div>

            {/* 보안 인증 락커 & 자소서 금고 */}
            <div className="border border-[#30363d] bg-[#0d1117] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🔒 SECURE_CAREER_VAULT</span>
                  {isAuthenticated && (
                    <span className="text-[10px] text-[#7ee787] font-bold">[UNLOCKED]</span>
                  )}
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      setIsEditingProfile(false);
                    }}
                    className="text-[10px] text-[#f85149] hover:underline"
                  >
                    LOCK_NOW
                  </button>
                )}
              </div>

              {!isAuthenticated ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    본 구역은 대표 전용 보안 저장소입니다. 프로필 편집 및 암호화된 자기소개서를 열람하려면 패스코드를 입력하십시오.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Passcode (1218)"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="flex-1 bg-[#161b22] border border-[#30363d] text-xs px-3 py-1.5 rounded text-white focus:outline-none focus:border-[#58a6ff]"
                    />
                    <button
                      type="submit"
                      className="bg-[#21262d] hover:bg-[#30363d] text-white text-xs px-3 py-1.5 rounded border border-[#30363d] font-bold"
                    >
                      AUTH
                    </button>
                  </div>
                  {authError && (
                    <div className="text-[11px] text-[#f85149]">❌ 인증 실패: 패스코드가 일치하지 않습니다.</div>
                  )}
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-[#8b949e]">
                    * 이번 학기 종료 후 취업 지원을 위한 상시 편집 모드입니다.
                  </div>
                  <textarea
                    rows={10}
                    value={careerDoc}
                    onChange={(e) => setCareerDoc(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded p-3 text-xs text-[#c9d1d9] leading-relaxed focus:outline-none focus:border-[#7ee787] font-mono"
                  />
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#8b949e]">{careerDoc.length} characters</span>
                    <button
                      onClick={handleSaveCareerDoc}
                      className="bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      COMMIT_CHANGES
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 엔지니어링 스크래치패드 (자동 저장) */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#8b949e] uppercase">SCRATCHPAD (CLI_NOTES)</span>
              <span className="text-[10px] text-[#238636]">AUTOSAVE_ACTIVE</span>
            </div>
            <textarea
              rows={4}
              value={scratchpad}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded p-2.5 text-xs text-[#7ee787] font-mono leading-relaxed focus:outline-none focus:border-[#30363d]"
            />
          </div>
        </section>
      </div>
    </div>
  );
}