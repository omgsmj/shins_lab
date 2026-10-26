'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ScheduleItem {
  id: number;
  date: string;
  title: string;
  category: 'DEV' | 'ACADEMIC' | 'PERSONAL';
  isDday?: boolean;
}

interface UserProfile {
  name: string;
  affiliation: string;
  specialization: string;
  coreStack: string;
}

interface StudyBoardLog {
  id: number;
  date: string;
  subject: string;
  durationHours: number;
  durationMinutes: number;
  summary: string;
}

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { id: 1, date: '2026-10-26', title: '정보처리기사 CBT 엔진 빌드', category: 'DEV', isDday: false },
  { id: 2, date: '2026-10-28', title: 'AI 파이프라인 통합 테스트', category: 'ACADEMIC', isDday: true },
  { id: 3, date: '2026-11-05', title: '기술 자소서 1차 탈고', category: 'DEV', isDday: true },
  { id: 4, date: '2026-12-18', title: '본인 생일', category: 'PERSONAL', isDday: true },
];

export default function EngineeringHub() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 1. 시스템 텔레메트리 & 사운드
  const [timeStr, setTimeStr] = useState<string>('');
  const [uptime, setUptime] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 2. 기상 관측 및 특보
  const [weatherStr, setWeatherStr] = useState<string>('WEATHER SYNCING...');
  const [weatherAlert, setWeatherAlert] = useState<{ active: boolean; msg: string; type: 'rain' | 'snow' | 'storm' | 'clear' }>({
    active: false,
    msg: '',
    type: 'clear',
  });

  // 3. 프로필 정보
  const [profile, setProfile] = useState<UserProfile>({
    name: '신민종 (SHIN MINJONG)',
    affiliation: '전주대학교 (Senior)',
    specialization: '인공지능학 × 일본언어문화학',
    coreStack: 'Python, OpenCV, Next.js, TypeScript',
  });
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // 4. 인증 & 자소서
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

  // 5. 올해/이달의 목표
  const [yearlyGoal, setYearlyGoal] = useState<string>('2026 목표: 정보처리기사 취득 및 컴퓨터비전 취업 포트폴리오 완성');
  const [monthlyGoal, setMonthlyGoal] = useState<string>('10월 목표: CBT 엔진 고도화 및 전주대 날씨 과제 아키텍처 배포');
  const [isEditingGoals, setIsEditingGoals] = useState<boolean>(false);

  // 6. 달력 및 일정 (D-Day 포함)
  const [schedules, setSchedules] = useState<ScheduleItem[]>(DEFAULT_SCHEDULES);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 26)); // 기준: 2026년 10월
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('2026-10-26');
  const [newCategory, setNewCategory] = useState<'DEV' | 'ACADEMIC' | 'PERSONAL'>('DEV');
  const [newIsDday, setNewIsDday] = useState<boolean>(false);
  const [isDdayHovered, setIsDdayHovered] = useState<boolean>(false);

  // 7. 다기능 크로노 모듈 (타이머 vs 스톱워치)
  const [clockMode, setClockMode] = useState<'TIMER' | 'STOPWATCH'>('TIMER');
  const [customMinInput, setCustomMinInput] = useState<number>(25);
  const [timerLeft, setTimerLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);

  // 8. 학습 로그 게시판 상태
  const [studyLogs, setStudyLogs] = useState<StudyBoardLog[]>([
    { id: 1, date: '2026-10-25', subject: '정처기 CBT', durationHours: 2, durationMinutes: 30, summary: '1과목 소프트웨어 설계 기출 80제 풀이' },
    { id: 2, date: '2026-10-26', subject: '인공지능/비전', durationHours: 3, durationMinutes: 10, summary: 'OpenCV 기반 텔레메트리 파이프라인 디버깅' },
  ]);
  const [logDate, setLogDate] = useState<string>('2026-10-26');
  const [logSubject, setLogSubject] = useState<string>('정처기 CBT');
  const [logHours, setLogHours] = useState<number>(1);
  const [logMinutes, setLogMinutes] = useState<number>(30);
  const [logSummary, setLogSummary] = useState<string>('');

  // 9. 스크래치패드
  const [scratchpad, setScratchpad] = useState<string>(
    '// QUICK SCRATCHPAD (Auto-saved)\n$ python -m venv venv\n$ pip install -r requirements.txt'
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Web Audio API 기계식 스위치 클릭음
  const playClickSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch (e) {}
  };

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

  // 타이머 루프
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerLeft > 0) {
      interval = setInterval(() => setTimerLeft((prev) => prev - 1), 1000);
    } else if (timerLeft === 0 && isTimerRunning) {
      playClickSound();
      alert('⏰ 타이머 시간이 종료되었습니다!');
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerLeft]);

  // 스톱워치 루프
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => setStopwatchTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // 기상 관측 및 특보 감지
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

          let desc = 'CLEAR';
          let alertActive = false;
          let alertMsg = '';
          let alertType: 'rain' | 'snow' | 'storm' | 'clear' = 'clear';

          if (code >= 51 && code <= 67) {
            desc = 'RAIN';
            alertActive = true;
            alertMsg = '강우 감지: 우산을 반드시 챙기십시오! (BRING AN UMBRELLA)';
            alertType = 'rain';
          } else if (code >= 71 && code <= 77) {
            desc = 'SNOW';
            alertActive = true;
            alertMsg = '강설 경보: 노면 빙판길 보행 및 이동 주의!';
            alertType = 'snow';
          } else if (code >= 95) {
            desc = 'STORM';
            alertActive = true;
            alertMsg = '뇌우/강풍 경보: 실외 장비 철수 및 실내 이동 권고!';
            alertType = 'storm';
          } else if (code >= 1 && code <= 3) {
            desc = 'CLOUDY';
          }

          setWeatherStr(`${temp}°C (${desc}, ${wind}km/h)`);
          setWeatherAlert({ active: alertActive, msg: alertMsg, type: alertType });
        }
      } catch (err) {
        setWeatherStr('WEATHER OFFLINE');
      }
    };
    fetchJeonjuWeather();
  }, []);

  // 로컬 스토리지 데이터 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedProfile = localStorage.getItem('station_user_profile');
    if (savedProfile) {
      try { setProfile(JSON.parse(savedProfile)); } catch (e) {}
    }
    const savedDoc = localStorage.getItem('station_career_doc');
    if (savedDoc) setCareerDoc(savedDoc);

    const savedScratch = localStorage.getItem('station_scratchpad');
    if (savedScratch) setScratchpad(savedScratch);

    const savedYearly = localStorage.getItem('station_yearly_goal');
    if (savedYearly) setYearlyGoal(savedYearly);

    const savedMonthly = localStorage.getItem('station_monthly_goal');
    if (savedMonthly) setMonthlyGoal(savedMonthly);

    const savedSchedules = localStorage.getItem('station_schedules');
    if (savedSchedules) {
      try {
        const parsed = JSON.parse(savedSchedules);
        if (Array.isArray(parsed) && parsed.length > 0) setSchedules(parsed);
      } catch (e) {}
    }

    const savedBoardLogs = localStorage.getItem('station_board_study_logs');
    if (savedBoardLogs) {
      try {
        const parsed = JSON.parse(savedBoardLogs);
        if (Array.isArray(parsed) && parsed.length > 0) setStudyLogs(parsed);
      } catch (e) {}
    }

    const fetchRemoteSchedules = async () => {
      try {
        const { data, error } = await supabase.from('user_schedules').select('*').order('date', { ascending: true });
        if (!error && data && data.length > 0) {
          setSchedules(data);
          localStorage.setItem('station_schedules', JSON.stringify(data));
        }
      } catch (err) {}
    };
    fetchRemoteSchedules();
  }, []);

  const handleSaveGoals = () => {
    playClickSound();
    localStorage.setItem('station_yearly_goal', yearlyGoal);
    localStorage.setItem('station_monthly_goal', monthlyGoal);
    setIsEditingGoals(false);
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!newTitle.trim()) return;

    const newItem: ScheduleItem = {
      id: Date.now(),
      date: newDate,
      title: newTitle,
      category: newCategory,
      isDday: newIsDday,
    };

    const updated = [...schedules, newItem].sort((a, b) => a.date.localeCompare(b.date));
    setSchedules(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('station_schedules', JSON.stringify(updated));
    }
    setNewTitle('');
    setNewIsDday(false);

    try {
      await supabase.from('user_schedules').insert({
        date: newDate,
        title: newTitle,
        category: newCategory,
        is_dday: newIsDday,
      });
    } catch (err) {}
  };

  const handleDeleteSchedule = async (id: number) => {
    playClickSound();
    const updated = schedules.filter((item) => item.id !== id);
    setSchedules(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('station_schedules', JSON.stringify(updated));
    }
    try {
      await supabase.from('user_schedules').delete().eq('id', id);
    } catch (err) {}
  };

  // 학습 로그 게시판 등록 핸들러
  const handleAddStudyLog = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const durationTotalMin = logHours * 60 + logMinutes;
    if (durationTotalMin <= 0) return;

    const newLog: StudyBoardLog = {
      id: Date.now(),
      date: logDate,
      subject: logSubject,
      durationHours: logHours,
      durationMinutes: logMinutes,
      summary: logSummary.trim() || '학습 내용 요약 없음',
    };

    const updated = [newLog, ...studyLogs].sort((a, b) => b.date.localeCompare(a.date));
    setStudyLogs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('station_board_study_logs', JSON.stringify(updated));
    }
    setLogSummary('');
  };

  const handleDeleteStudyLog = (id: number) => {
    playClickSound();
    const updated = studyLogs.filter((item) => item.id !== id);
    setStudyLogs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('station_board_study_logs', JSON.stringify(updated));
    }
  };

  // D-Day 계산 유틸리티
  const calculateDday = (targetDateStr: string) => {
    if (!targetDateStr) return 'D-DAY';
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = targetDateStr.split('-');
      if (parts.length < 3) return 'D-DAY';
      const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'D-DAY';
      if (diffDays > 0) return `D-${diffDays}`;
      return `D+${Math.abs(diffDays)}`;
    } catch (e) {
      return 'D-DAY';
    }
  };

  // 커플 기념일 및 다가오는 마일스톤 연산 엔진
  const calculateCoupleMilestones = () => {
    const startDate = new Date(2019, 11, 7); // 2019-12-07
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 1. 다음 100일 단위 (예: 2600일)
    const nextHundreds = Math.ceil(diffDays / 100) * 100 === diffDays ? diffDays + 100 : Math.ceil(diffDays / 100) * 100;
    const daysUntilNextHundreds = nextHundreds - diffDays;

    // 2. 다음 N주년 계산
    const currentYear = today.getFullYear();
    let nextAnnivYear = currentYear;
    let nextAnnivDate = new Date(nextAnnivYear, 11, 7);
    if (today > nextAnnivDate) {
      nextAnnivYear += 1;
      nextAnnivDate = new Date(nextAnnivYear, 11, 7);
    }
    const nextAnnivYears = nextAnnivYear - 2019;
    const diffAnnivDays = Math.round((nextAnnivDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 3. 여자친구 다음 생일 (05-21)
    let gfNextBday = new Date(currentYear, 4, 21);
    if (today > gfNextBday) gfNextBday = new Date(currentYear + 1, 4, 21);
    const diffGfDays = Math.round((gfNextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 4. 본인 다음 생일 (12-18)
    let myNextBday = new Date(currentYear, 11, 18);
    if (today > myNextBday) myNextBday = new Date(currentYear + 1, 11, 18);
    const diffMyDays = Math.round((myNextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      currentDays: diffDays,
      nextHundreds,
      daysUntilNextHundreds,
      nextAnnivYears,
      diffAnnivDays,
      diffGfDays,
      diffMyDays,
    };
  };

  const milestones = isMounted ? calculateCoupleMilestones() : null;

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 달력 및 이번 달 통계 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const currentMonthLogs = studyLogs.filter((log) => log.date.startsWith(currentMonthKey));
  const currentMonthTotalMinutes = currentMonthLogs.reduce((acc, cur) => acc + cur.durationHours * 60 + cur.durationMinutes, 0);

  // 과목별 점유율 통계
  const subjectMap: Record<string, number> = {};
  currentMonthLogs.forEach((l) => {
    const mins = l.durationHours * 60 + l.durationMinutes;
    subjectMap[l.subject] = (subjectMap[l.subject] || 0) + mins;
  });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const ddayItems = schedules.filter((s) => s.isDday);

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      {/* 기상 특보 스트립 (우산 지참 경보) */}
      {weatherAlert.active && (
        <div className="mb-4 border border-rose-500/60 bg-rose-950/40 text-rose-300 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-400">⚠️ [WEATHER_ALERT_TRIGGERED]</span>
            <span>{weatherAlert.msg}</span>
          </div>
          <span className="text-[10px] bg-rose-900/60 px-2 py-0.5 rounded border border-rose-500/50">LIVE SENSOR</span>
        </div>
      )}

      {/* 1. 최상단 엔지니어링 헤더 & 텔레메트리 바 */}
      <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[#238636] animate-pulse" />
          <span className="text-sm font-bold text-white tracking-widest uppercase">
            STATION_TERMINAL :: {profile.name.split(' ')[0]}
          </span>
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playClickSound();
            }}
            className={`text-[10px] px-2 py-0.5 rounded border transition ${
              soundEnabled ? 'border-[#238636] bg-[#238636]/20 text-[#7ee787]' : 'border-[#30363d] text-[#8b949e]'
            }`}
          >
            SFX: {soundEnabled ? 'ON' : 'MUTE'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8b949e]">
          {/* D-Day 호버 팝오버 트리거 */}
          <div
            className="relative cursor-pointer"
            onMouseEnter={() => setIsDdayHovered(true)}
            onMouseLeave={() => setIsDdayHovered(false)}
          >
            <span className="text-[#d2a8ff] border-b border-dashed border-[#d2a8ff] font-bold">
              [🎯 D-DAY TARGETS ({ddayItems.length})]
            </span>

            {isDdayHovered && isMounted && (
              <div className="absolute right-0 top-6 z-50 w-72 border border-[#30363d] bg-[#161b22] p-3 rounded-lg shadow-2xl space-y-2 backdrop-blur-md">
                <div className="text-[10px] font-bold text-[#8b949e] border-b border-[#30363d] pb-1 uppercase">
                  ACTIVE_COUNTDOWN_QUEUE
                </div>
                {ddayItems.length === 0 ? (
                  <div className="text-[11px] text-[#8b949e] py-2 text-center">지정된 D-Day 일정이 없습니다.</div>
                ) : (
                  ddayItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-[#21262d] last:border-0">
                      <span className="text-white truncate max-w-[150px]">{item.title}</span>
                      <span className="font-bold font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 text-[11px]">
                        {calculateDday(item.date)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            LOC: <span className="text-[#58a6ff]">JEONJU-SI</span>{' '}
            <span className="text-[#e3b341] font-bold">[{weatherStr}]</span>
          </div>
          <div>KST: <span className="text-[#7ee787] font-bold">{timeStr || 'SYNCING...'}</span></div>
          <div>UPTIME: <span className="text-white font-bold">{uptime}s</span></div>
        </div>
      </header>

      {/* 2. 빠른 실행 서브시스템 링크 (통합 런처: CBT + 전주대 날씨 + 학습 게시판) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Link
          href="/cbt"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#58a6ff] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#58a6ff]">ENGINE 01</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
              SUITE
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">CBT 통합 시스템</div>
          <div className="text-xs text-[#8b949e] mt-1">시험 응시 · 오답노트 보관함 · 문제 주입기 통합</div>
        </Link>

        <Link
          href="/weather"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#7ee787] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#7ee787]">ENGINE 02</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
              LIVE
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">전주대 기상 관측소</div>
          <div className="text-xs text-[#8b949e] mt-1">캠퍼스(효자동) 실시간 기상 관측 및 단기 예보</div>
        </Link>

        {/* ENGINE 03: 학습 보드 바로가기 카드 */}
        <div className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg shadow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e]">ENGINE 03</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#a371f7]/20 text-[#d2a8ff] border border-[#a371f7]/40">
              LOGS: {studyLogs.length}건
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">학습 로그 게시판</div>
          <div className="text-xs text-[#8b949e] mt-1">
            당월 누적: <span className="text-[#d2a8ff] font-bold">{Math.floor(currentMonthTotalMinutes / 60)}시간 {currentMonthTotalMinutes % 60}분</span> 기록 중
          </div>
        </div>
      </section>

      {/* 메인 2열 그리드: 일정/달력/학습게시판 vs 프로필/자소서/커플위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* [좌측 7열]: 올해/이달 목표 + 달력 + 학습 시간 통계 및 로그 게시판 */}
        <section className="lg:col-span-7 space-y-6">
          {/* 달력 상단: 올해 목표 & 이달의 목표 편집 보드 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <span className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯 MISSION_OBJECTIVES</span>
              </span>
              <button
                onClick={() => {
                  if (isEditingGoals) handleSaveGoals();
                  else {
                    playClickSound();
                    setIsEditingGoals(true);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded border border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/20 font-bold transition"
              >
                {isEditingGoals ? 'SAVE_GOALS' : 'EDIT_GOALS'}
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/40 shrink-0">
                  2026_YEAR
                </span>
                {isEditingGoals ? (
                  <input
                    type="text"
                    value={yearlyGoal}
                    onChange={(e) => setYearlyGoal(e.target.value)}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#58a6ff]"
                  />
                ) : (
                  <span className="text-slate-200 leading-5">{yearlyGoal}</span>
                )}
              </div>

              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-500/40 shrink-0">
                  THIS_MONTH
                </span>
                {isEditingGoals ? (
                  <input
                    type="text"
                    value={monthlyGoal}
                    onChange={(e) => setMonthlyGoal(e.target.value)}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#7ee787]"
                  />
                ) : (
                  <span className="text-slate-200 leading-5">{monthlyGoal}</span>
                )}
              </div>
            </div>
          </div>

          {/* 달력 컨테이너 */}
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
                  onClick={() => {
                    playClickSound();
                    setCurrentDate(new Date(year, month - 1, 1));
                  }}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]"
                >
                  ◀ PREV
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setCurrentDate(new Date(year, month + 1, 1));
                  }}
                  className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9]"
                >
                  NEXT ▶
                </button>
              </div>
            </div>

            {/* 월간 그리드 */}
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
                const isToday = d === 26 && month === 9;

                return (
                  <div
                    key={d}
                    onClick={() => {
                      playClickSound();
                      setNewDate(dateKey);
                      setLogDate(dateKey);
                    }}
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
                          className={`text-[9px] px-1 py-0.5 rounded truncate font-sans flex items-center justify-between ${
                            s.category === 'DEV'
                              ? 'bg-[#238636]/30 text-[#7ee787] border border-[#238636]/50'
                              : s.category === 'ACADEMIC'
                              ? 'bg-[#1f6feb]/30 text-[#58a6ff] border border-[#1f6feb]/50'
                              : 'bg-[#a371f7]/30 text-[#d2a8ff] border border-[#a371f7]/50'
                          }`}
                        >
                          <span className="truncate">{s.title}</span>
                          {s.isDday && <span className="text-[8px] text-amber-300 shrink-0 font-bold">★D</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 일정 추가 폼 */}
            <form onSubmit={handleAddSchedule} className="pt-3 border-t border-[#30363d] flex flex-col sm:flex-row gap-2 items-center">
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
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs px-3 py-1.5 rounded text-white focus:outline-none focus:border-[#58a6ff] w-full"
              />
              <label className="flex items-center gap-1.5 text-xs text-[#8b949e] whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsDday}
                  onChange={(e) => setNewIsDday(e.target.checked)}
                  className="rounded border-[#30363d] text-[#58a6ff]"
                />
                <span>★D-Day</span>
              </label>
              <button
                type="submit"
                className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs px-4 py-1.5 rounded font-bold transition whitespace-nowrap w-full sm:w-auto"
              >
                + ADD_TASK
              </button>
            </form>
          </div>

          {/* 달력 밑쪽: 이번 달 학습 누적 통계 & 미니 바 차트 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">MONTHLY_STUDY_METRICS</span>
                <span className="text-[10px] text-[#8b949e]">({year}년 {month + 1}월 기준)</span>
              </div>
              <span className="text-xs font-bold text-[#d2a8ff]">
                총 {Math.floor(currentMonthTotalMinutes / 60)}시간 {currentMonthTotalMinutes % 60}분
              </span>
            </div>

            {/* 과목별 누적 분포 미니 바 차트 */}
            {currentMonthTotalMinutes === 0 ? (
              <div className="text-[11px] text-[#8b949e] py-1 text-center">이번 달 등록된 공부 시간이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#0d1117] border border-[#21262d]">
                  {Object.entries(subjectMap).map(([subj, mins], idx) => {
                    const pct = Math.round((mins / currentMonthTotalMinutes) * 100);
                    const colors = ['bg-[#58a6ff]', 'bg-[#7ee787]', 'bg-[#d2a8ff]', 'bg-[#f0883e]', 'bg-[#f85149]'];
                    return (
                      <div
                        key={subj}
                        style={{ width: `${pct}%` }}
                        className={`${colors[idx % colors.length]} transition-all`}
                        title={`${subj}: ${Math.floor(mins / 60)}h ${mins % 60}m (${pct}%)`}
                      />
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 text-[10px] text-[#8b949e] pt-1">
                  {Object.entries(subjectMap).map(([subj, mins], idx) => {
                    const colors = ['text-[#58a6ff]', 'text-[#7ee787]', 'text-[#d2a8ff]', 'text-[#f0883e]', 'text-[#f85149]'];
                    return (
                      <div key={subj} className="flex items-center gap-1">
                        <span className={`font-bold ${colors[idx % colors.length]}`}>■</span>
                        <span>{subj}</span>
                        <span className="text-white font-bold">{Math.floor(mins / 60)}h {mins % 60}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 학습 로그 게시판 (Study Dev Logs) */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📚 STUDY_BOARD_ARCHIVE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40">
                  게시판 연동형
                </span>
              </span>
              <span className="text-[10px] text-[#8b949e]">날짜별 학습 기록</span>
            </div>

            {/* 학습 기록 주입 폼 */}
            <form onSubmit={handleAddStudyLog} className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d] mb-4 space-y-2 text-xs">
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] px-2 py-1 rounded text-white text-xs focus:outline-none"
                />
                <input
                  type="text"
                  value={logSubject}
                  onChange={(e) => setLogSubject(e.target.value)}
                  placeholder="과목 / 분야"
                  className="bg-[#161b22] border border-[#30363d] px-2 py-1 rounded text-white text-xs w-32 focus:outline-none focus:border-[#a371f7]"
                />
                <div className="flex items-center gap-1 text-[#8b949e]">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={logHours}
                    onChange={(e) => setLogHours(Number(e.target.value))}
                    className="w-12 bg-[#161b22] border border-[#30363d] px-1.5 py-1 rounded text-white text-xs text-center focus:outline-none"
                  />
                  <span>시간</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(Number(e.target.value))}
                    className="w-12 bg-[#161b22] border border-[#30363d] px-1.5 py-1 rounded text-white text-xs text-center focus:outline-none"
                  />
                  <span>분</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  placeholder="학습 내용 상세 (예: 기출문제 풀이, 논문 리딩, 알고리즘 구현 등)..."
                  className="flex-1 bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-white text-xs focus:outline-none focus:border-[#a371f7]"
                />
                <button
                  type="submit"
                  className="bg-[#6e40c9] hover:bg-[#8957e5] text-white px-3 py-1 rounded font-bold transition text-xs whitespace-nowrap"
                >
                  + 기록 등록
                </button>
              </div>
            </form>

            {/* 학습 기록 게시물 목록 */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {studyLogs.length === 0 ? (
                <div className="text-[11px] text-[#8b949e] py-4 text-center">등록된 학습 게시물이 없습니다.</div>
              ) : (
                studyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded bg-[#0d1117] border border-[#21262d] text-xs gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className="font-mono text-[#58a6ff] text-[11px] shrink-0">{log.date}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6e40c9]/20 text-[#d2a8ff] border border-[#6e40c9]/40 shrink-0">
                        {log.subject}
                      </span>
                      <span className="text-white font-bold shrink-0">{log.durationHours}h {log.durationMinutes}m</span>
                      <span className="text-slate-300 truncate max-w-[280px]">{log.summary}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStudyLog(log.id)}
                      className="text-[#8b949e] hover:text-[#f85149] text-xs px-1 self-end sm:self-auto"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* [우측 5열]: 크로노 모듈 + 대표소개/자소서 + 커플 텔레메트리 마일스톤 */}
        <section className="lg:col-span-5 space-y-6">
          {/* 다기능 크로노 모듈 (타이머 & 스톱워치) */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    playClickSound();
                    setClockMode('TIMER');
                  }}
                  className={`text-xs px-2 py-0.5 rounded font-bold transition ${
                    clockMode === 'TIMER' ? 'bg-[#58a6ff] text-black' : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  CUSTOM_TIMER
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setClockMode('STOPWATCH');
                  }}
                  className={`text-xs px-2 py-0.5 rounded font-bold transition ${
                    clockMode === 'STOPWATCH' ? 'bg-[#58a6ff] text-black' : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  STOPWATCH
                </button>
              </div>
              <span className="text-[10px] text-[#8b949e]">CHRONO_MODULE</span>
            </div>

            {clockMode === 'TIMER' ? (
              <div>
                <div className="flex items-center justify-between my-2">
                  <div className="text-4xl font-extrabold font-mono text-white tracking-wider">
                    {formatTimer(timerLeft)}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        playClickSound();
                        setIsTimerRunning(!isTimerRunning);
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                        isTimerRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-[#238636] hover:bg-[#2ea043] text-white'
                      }`}
                    >
                      {isTimerRunning ? 'PAUSE' : 'START'}
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        setIsTimerRunning(false);
                        setTimerLeft(customMinInput * 60);
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-slate-300 border border-[#30363d]"
                    >
                      RESET
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#21262d] text-xs text-[#8b949e]">
                  <span>시간 설정(분):</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMinInput}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomMinInput(val);
                      if (!isTimerRunning) setTimerLeft(val * 60);
                    }}
                    className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 text-white text-xs focus:outline-none"
                  />
                  <div className="flex gap-1 ml-auto">
                    {[15, 25, 45, 60].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          playClickSound();
                          setCustomMinInput(preset);
                          setIsTimerRunning(false);
                          setTimerLeft(preset * 60);
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]"
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between my-2">
                <div className="text-4xl font-extrabold font-mono text-[#7ee787] tracking-wider">
                  {formatTimer(stopwatchTime)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsStopwatchRunning(!isStopwatchRunning);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                      isStopwatchRunning ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-[#238636] hover:bg-[#2ea043] text-white'
                    }`}
                  >
                    {isStopwatchRunning ? 'PAUSE' : 'START'}
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsStopwatchRunning(false);
                      setStopwatchTime(0);
                    }}
                    className="px-2.5 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-xs text-slate-300 border border-[#30363d]"
                  >
                    RESET
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 대표 프로필 & 자소서 금고 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-sm font-bold text-white tracking-wider">ENGINEER_DOSSIER</span>
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      playClickSound();
                      if (isEditingProfile) {
                        localStorage.setItem('station_user_profile', JSON.stringify(profile));
                        setIsEditingProfile(false);
                        alert('프로필 변경 사항이 저장되었습니다.');
                      } else {
                        setIsEditingProfile(true);
                      }
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
                  {isAuthenticated && <span className="text-[10px] text-[#7ee787] font-bold">[UNLOCKED]</span>}
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      playClickSound();
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    playClickSound();
                    if (passcode === '1218') {
                      setIsAuthenticated(true);
                      setAuthError(false);
                      setPasscode('');
                    } else {
                      setAuthError(true);
                    }
                  }}
                  className="space-y-3"
                >
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    대표 전용 보안 저장소입니다. 패스코드를 입력해 자소서를 잠금 해제하십시오.
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
                  {authError && <div className="text-[11px] text-[#f85149]">❌ 인증 실패: 패스코드가 일치하지 않습니다.</div>}
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-[#8b949e]">* 상시 수정 및 영구 보존 모드입니다.</div>
                  <textarea
                    rows={8}
                    value={careerDoc}
                    onChange={(e) => setCareerDoc(e.target.value)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded p-3 text-xs text-[#c9d1d9] leading-relaxed focus:outline-none focus:border-[#7ee787] font-mono"
                  />
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#8b949e]">{careerDoc.length} characters</span>
                    <button
                      onClick={() => {
                        playClickSound();
                        localStorage.setItem('station_career_doc', careerDoc);
                        alert('자소서 데이터가 안전하게 영구 저장되었습니다.');
                      }}
                      className="bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      COMMIT_CHANGES
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 대문 오른쪽 아래: 커플 텔레메트리 & 마일스톤 자동 알리미 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>❤️ COUPLE_TELEMETRY</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold">
                SINCE 2019.12.07
              </span>
            </div>

            {/* 현재 일수 (단백한 공대 스타일) */}
            <div className="mb-4">
              <div className="text-3xl font-extrabold font-mono text-white">
                Day <span className="text-rose-400">{milestones ? milestones.currentDays : '---'}</span>
              </div>
            </div>

            {/* 다가오는 4대 마일스톤 자동 알리미 */}
            <div className="space-y-2 border-t border-[#21262d] pt-3 text-xs">
              <div className="text-[10px] font-bold text-[#8b949e] uppercase">UPCOMING_MILESTONES</div>

              {milestones && (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d] flex justify-between items-center">
                    <span className="text-[#c9d1d9]">{milestones.nextHundreds}일</span>
                    <span className="font-bold text-amber-400">D-{milestones.daysUntilNextHundreds}</span>
                  </div>

                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d] flex justify-between items-center">
                    <span className="text-[#c9d1d9]">{milestones.nextAnnivYears}주년</span>
                    <span className="font-bold text-amber-400">D-{milestones.diffAnnivDays}</span>
                  </div>

                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d] flex justify-between items-center">
                    <span className="text-[#c9d1d9]">여친 생일 (05.21)</span>
                    <span className="font-bold text-rose-400">D-{milestones.diffGfDays}</span>
                  </div>

                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d] flex justify-between items-center">
                    <span className="text-[#c9d1d9]">내 생일 (12.18)</span>
                    <span className="font-bold text-[#58a6ff]">D-{milestones.diffMyDays}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 엔지니어링 스크래치패드 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#8b949e] uppercase">SCRATCHPAD (CLI_NOTES)</span>
              <span className="text-[10px] text-[#238636]">AUTOSAVE_ACTIVE</span>
            </div>
            <textarea
              rows={3}
              value={scratchpad}
              onChange={(e) => {
                setScratchpad(e.target.value);
                localStorage.setItem('station_scratchpad', e.target.value);
              }}
              className="w-full bg-[#0d1117] border border-[#21262d] rounded p-2.5 text-xs text-[#7ee787] font-mono leading-relaxed focus:outline-none focus:border-[#30363d]"
            />
          </div>
        </section>
      </div>
    </div>
  );
}