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

interface DevTask {
  id: number;
  task: string;
  is_completed: boolean;
}

const DEFAULT_SCHEDULES: ScheduleItem[] = [
  { id: 1, date: '2026-10-26', title: '정보처리기사 CBT 엔진 빌드', category: 'DEV', isDday: false },
  { id: 2, date: '2026-10-28', title: 'AI 파이프라인 통합 테스트', category: 'ACADEMIC', isDday: true },
  { id: 3, date: '2026-11-05', title: '기술 자소서 1차 탈고', category: 'DEV', isDday: true },
  { id: 4, date: '2026-12-18', title: '본인 생일', category: 'PERSONAL', isDday: true },
];

export default function EngineeringHub() {
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // 1. 관리자 통합 인증 상태
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminId, setAdminId] = useState<string>('');
  const [adminPw, setAdminPw] = useState<string>('');
  const [authError, setAuthError] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // 2. 시스템 텔레메트리 & 사운드
  const [timeStr, setTimeStr] = useState<string>('');
  const [uptime, setUptime] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 3. 기상 관측 및 특보
  const [weatherStr, setWeatherStr] = useState<string>('WEATHER SYNCING...');
  const [weatherAlert, setWeatherAlert] = useState<{ active: boolean; msg: string; type: 'rain' | 'snow' | 'storm' | 'clear' }>({
    active: false,
    msg: '',
    type: 'clear',
  });

  // 4. 프로필 정보
  const [profile, setProfile] = useState<UserProfile>({
    name: '신민종 (SHIN MINJONG)',
    affiliation: '전주대학교 (Senior)',
    specialization: '인공지능학 × 일본언어문화학',
    coreStack: 'Python, OpenCV, Next.js, TypeScript',
  });
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);

  // 5. 자소서 금고 내용
  const [careerDoc, setCareerDoc] = useState<string>(
    `[핵심 역량 및 엔지니어링 지향점]
- Python, OpenCV 기반의 컴퓨터 비전 파이프라인 및 응용 GUI 소프트웨어 구축 역량.
- Next.js (App Router), TypeScript, Supabase 기반 풀스택 시스템 아키텍처 설계.
- 일본어 비즈니스 커뮤니케이션 및 기술 문서 독해 역량 (일본언어문화 / 인공지능 복수전공).
- 실패를 숨기지 않는 방어적 프로그래밍과 데이터 무손실 파싱 지향.`
  );

  // 6. 올해/이달의 목표
  const [yearlyGoal, setYearlyGoal] = useState<string>('2026 목표: 정보처리기사 취득 및 컴퓨터비전 취업 포트폴리오 완성');
  const [monthlyGoal, setMonthlyGoal] = useState<string>('10월 목표: CBT 엔진 고도화 및 전주대 날씨 과제 아키텍처 배포');
  const [isEditingGoals, setIsEditingGoals] = useState<boolean>(false);

  // 7. 달력 및 일정 (D-Day 포함)
  const [schedules, setSchedules] = useState<ScheduleItem[]>(DEFAULT_SCHEDULES);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 28));
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>('2026-10-28');
  const [newCategory, setNewCategory] = useState<'DEV' | 'ACADEMIC' | 'PERSONAL'>('DEV');
  const [newIsDday, setNewIsDday] = useState<boolean>(false);
  const [isDdayHovered, setIsDdayHovered] = useState<boolean>(false);

  // 8. 다기능 크로노 모듈 (타이머 vs 스톱워치)
  const [clockMode, setClockMode] = useState<'TIMER' | 'STOPWATCH'>('TIMER');
  const [customMinInput, setCustomMinInput] = useState<number>(25);
  const [timerLeft, setTimerLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);

  // 9. 학습 로그 게시판
  const [studyLogs, setStudyLogs] = useState<StudyBoardLog[]>([]);
  const [logDate, setLogDate] = useState<string>('2026-10-28');
  const [logSubject, setLogSubject] = useState<string>('정처기 CBT');
  const [logHours, setLogHours] = useState<number>(1);
  const [logMinutes, setLogMinutes] = useState<number>(30);
  const [logSummary, setLogSummary] = useState<string>('');

  // 10. 엔지니어링 데일리 투두 체크리스트
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState<string>('');

  // 11. 스크래치패드
  const [scratchpad, setScratchpad] = useState<string>(
    '// QUICK SCRATCHPAD (Auto-saved)\n$ python -m venv venv\n$ pip install -r requirements.txt'
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStopwatchRunning) {
      interval = setInterval(() => setStopwatchTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem('station_auth_status') === 'true') {
      setIsAuthenticated(true);
    }

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

    const syncRemoteData = async () => {
      try {
        const { data: pData } = await supabase.from('user_profiles').select('*').eq('id', 1).maybeSingle();
        if (pData) {
          const remoteProfile: UserProfile = {
            name: pData.name,
            affiliation: pData.affiliation,
            specialization: pData.specialization,
            coreStack: pData.core_stack,
          };
          setProfile(remoteProfile);
          localStorage.setItem('station_user_profile', JSON.stringify(remoteProfile));
        }

        const { data: gData } = await supabase.from('user_goals').select('*').eq('id', 1).maybeSingle();
        if (gData) {
          setYearlyGoal(gData.yearly_goal);
          setMonthlyGoal(gData.monthly_goal);
          localStorage.setItem('station_yearly_goal', gData.yearly_goal);
          localStorage.setItem('station_monthly_goal', gData.monthly_goal);
        }

        const { data: cData } = await supabase.from('user_career_docs').select('*').eq('id', 1).maybeSingle();
        if (cData && cData.content) {
          setCareerDoc(cData.content);
          localStorage.setItem('station_career_doc', cData.content);
        }

        const { data: sData } = await supabase.from('user_schedules').select('*').order('date', { ascending: true });
        if (sData && sData.length > 0) {
          const mappedSchedules = sData.map((s) => ({
            id: s.id,
            date: s.date,
            title: s.title,
            category: s.category as 'DEV' | 'ACADEMIC' | 'PERSONAL',
            isDday: Boolean(s.is_dday),
          }));
          setSchedules(mappedSchedules);
          localStorage.setItem('station_schedules', JSON.stringify(mappedSchedules));
        }

        const { data: bData } = await supabase.from('study_board_logs').select('*').order('date', { ascending: false });
        if (bData && bData.length > 0) {
          const mappedLogs = bData.map((b) => ({
            id: b.id,
            date: b.date,
            subject: b.subject,
            durationHours: b.duration_hours,
            durationMinutes: b.duration_minutes,
            summary: b.summary,
          }));
          setStudyLogs(mappedLogs);
          localStorage.setItem('station_board_study_logs', JSON.stringify(mappedLogs));
        }

        const { data: tData } = await supabase.from('dev_checklist').select('*').order('id', { ascending: true });
        if (tData) {
          setTasks(tData);
        }
      } catch (err) {
        console.warn('Supabase DB 동기화 대기 중: 로컬 모드 유지');
      }
    };

    syncRemoteData();
  }, []);

  // 계정 검증 로직 (ddan1218 / TLSALSWHD)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (adminId === 'ddan1218' && adminPw === 'TLSALSWHD') {
      setIsAuthenticated(true);
      setAuthError(false);
      setShowLoginModal(false);
      setAdminId('');
      setAdminPw('');
      sessionStorage.setItem('station_auth_status', 'true');
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    playClickSound();
    setIsAuthenticated(false);
    setIsEditingProfile(false);
    setIsEditingGoals(false);
    sessionStorage.removeItem('station_auth_status');
  };

  const handleSaveProfile = async () => {
    playClickSound();
    setIsEditingProfile(false);
    localStorage.setItem('station_user_profile', JSON.stringify(profile));

    const { error } = await supabase.from('user_profiles').upsert({
      id: 1,
      name: profile.name,
      affiliation: profile.affiliation,
      specialization: profile.specialization,
      core_stack: profile.coreStack,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(`❌ DB 프로필 동기화 실패: ${error.message}`);
    } else {
      alert('✅ DB 프로필 동기화 완료!');
    }
  };

  const handleSaveGoals = async () => {
    if (!isAuthenticated) return;
    playClickSound();
    setIsEditingGoals(false);
    localStorage.setItem('station_yearly_goal', yearlyGoal);
    localStorage.setItem('station_monthly_goal', monthlyGoal);

    const { error } = await supabase.from('user_goals').upsert({
      id: 1,
      yearly_goal: yearlyGoal,
      monthly_goal: monthlyGoal,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(`❌ DB 목표 동기화 실패: ${error.message}`);
    } else {
      alert('✅ DB 목표 동기화 완료!');
    }
  };

  const handleSaveCareerDoc = async () => {
    if (!isAuthenticated) return;
    playClickSound();
    localStorage.setItem('station_career_doc', careerDoc);

    const { error } = await supabase.from('user_career_docs').upsert({
      id: 1,
      content: careerDoc,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(`❌ DB 자소서 동기화 실패: ${error.message}`);
    } else {
      alert('✅ DB 자소서 동기화 완료!');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();
    if (!newTitle.trim()) return;

    const tempItem: ScheduleItem = {
      id: Date.now(),
      date: newDate,
      title: newTitle,
      category: newCategory,
      isDday: newIsDday,
    };

    const updated = [...schedules, tempItem].sort((a, b) => a.date.localeCompare(b.date));
    setSchedules(updated);
    localStorage.setItem('station_schedules', JSON.stringify(updated));
    setNewTitle('');
    setNewIsDday(false);

    const { error } = await supabase.from('user_schedules').insert({
      date: tempItem.date,
      title: tempItem.title,
      category: tempItem.category,
      is_dday: tempItem.isDday,
    });

    if (error) {
      console.warn('DB 일정 등록 실패 (로컬 유지됨):', error.message);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();
    const updated = schedules.filter((item) => item.id !== id);
    setSchedules(updated);
    localStorage.setItem('station_schedules', JSON.stringify(updated));

    await supabase.from('user_schedules').delete().eq('id', id);
  };

  const handleAddStudyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();
    const durationTotalMin = logHours * 60 + logMinutes;
    if (durationTotalMin <= 0) return;

    const tempLog: StudyBoardLog = {
      id: Date.now(),
      date: logDate,
      subject: logSubject,
      durationHours: logHours,
      durationMinutes: logMinutes,
      summary: logSummary.trim() || '학습 내용 요약 없음',
    };

    const updated = [tempLog, ...studyLogs].sort((a, b) => b.date.localeCompare(a.date));
    setStudyLogs(updated);
    localStorage.setItem('station_board_study_logs', JSON.stringify(updated));
    setLogSummary('');

    const { error } = await supabase.from('study_board_logs').insert({
      date: tempLog.date,
      subject: tempLog.subject,
      duration_hours: tempLog.durationHours,
      duration_minutes: tempLog.durationMinutes,
      summary: tempLog.summary,
    });

    if (error) {
      console.warn('DB 학습로그 등록 실패 (로컬 유지됨):', error.message);
    }
  };

  const handleDeleteStudyLog = async (id: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();
    const updated = studyLogs.filter((item) => item.id !== id);
    setStudyLogs(updated);
    localStorage.setItem('station_board_study_logs', JSON.stringify(updated));

    await supabase.from('study_board_logs').delete().eq('id', id);
  };

  const handleToggleTask = async (task: DevTask) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();
    const nextStatus = !task.is_completed;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_completed: nextStatus } : t))
    );

    const { error } = await supabase
      .from('dev_checklist')
      .update({ is_completed: nextStatus })
      .eq('id', task.id);

    if (error) {
      console.error('투두 상태 변경 실패:', error.message);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_completed: !nextStatus } : t))
      );
      alert(`DB 반영 실패: ${error.message}`);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    playClickSound();

    setNewTaskInput('');

    const { data, error } = await supabase
      .from('dev_checklist')
      .insert({ task: trimmed, is_completed: false })
      .select('*')
      .single();

    if (error) {
      alert(`태스크 등록 실패: ${error.message}`);
      setNewTaskInput(trimmed);
      return;
    }

    if (data) {
      setTasks((prev) => [...prev, data]);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    playClickSound();

    const { error } = await supabase.from('dev_checklist').delete().eq('id', id);

    if (error) {
      alert(`태스크 삭제 실패: ${error.message}`);
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

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

  const calculateCoupleMilestones = () => {
    const startDate = new Date(2019, 11, 7);
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const nextHundreds = Math.ceil(diffDays / 100) * 100 === diffDays ? diffDays + 100 : Math.ceil(diffDays / 100) * 100;
    const daysUntilNextHundreds = nextHundreds - diffDays;

    const currentYear = today.getFullYear();
    let nextAnnivYear = currentYear;
    let nextAnnivDate = new Date(nextAnnivYear, 11, 7);
    if (today > nextAnnivDate) {
      nextAnnivYear += 1;
      nextAnnivDate = new Date(nextAnnivYear, 11, 7);
    }
    const nextAnnivYears = nextAnnivYear - 2019;
    const diffAnnivDays = Math.round((nextAnnivDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let gfNextBday = new Date(currentYear, 4, 21);
    if (today > gfNextBday) gfNextBday = new Date(currentYear + 1, 4, 21);
    const diffGfDays = Math.round((gfNextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const currentMonthLogs = studyLogs.filter((log) => log.date.startsWith(currentMonthKey));
  const currentMonthTotalMinutes = currentMonthLogs.reduce((acc, cur) => acc + cur.durationHours * 60 + cur.durationMinutes, 0);

  const subjectMap: Record<string, number> = {};
  currentMonthLogs.forEach((l) => {
    const mins = l.durationHours * 60 + l.durationMinutes;
    subjectMap[l.subject] = (subjectMap[l.subject] || 0) + mins;
  });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const ddayItems = schedules.filter((s) => s.isDday);

  const studyDateMinutesMap: Record<string, number> = {};
  studyLogs.forEach((l) => {
    const mins = l.durationHours * 60 + l.durationMinutes;
    studyDateMinutesMap[l.date] = (studyDateMinutesMap[l.date] || 0) + mins;
  });

  const heatmapDays = Array.from({ length: 84 }, (_, idx) => {
    const d = new Date(2026, 9, 28);
    d.setDate(d.getDate() - (83 - idx));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const minutes = studyDateMinutesMap[key] || 0;
    return { date: key, minutes };
  });

  const completedTasksCount = tasks.filter((t) => t.is_completed).length;
  const taskProgressPct = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono selection:bg-[#238636] selection:text-white p-4 md:p-8">
      {/* 0. 통합 관리자 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-[#30363d] bg-[#161b22] rounded-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔐 ROOT_ACCESS_AUTH</span>
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  setShowLoginModal(false);
                  setAuthError(false);
                }}
                className="text-[#8b949e] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#8b949e] uppercase block mb-1">OPERATOR ID</label>
                <input
                  type="text"
                  placeholder="ID"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs px-3 py-2 rounded text-white focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8b949e] uppercase block mb-1">PASSWORD</label>
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPw}
                  onChange={(e) => setAdminPw(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs px-3 py-2 rounded text-white focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              {authError && (
                <div className="text-[11px] text-[#f85149]">❌ 인증 실패: 아이디 또는 비밀번호가 올바르지 않습니다.</div>
              )}

              <button
                type="submit"
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white text-xs py-2 rounded font-bold transition mt-2 shadow-lg"
              >
                LOGIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 기상 특보 스트립 */}
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

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="text-[10px] px-2 py-0.5 rounded border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 transition font-bold"
            >
              LOGOUT [ROOT]
            </button>
          ) : (
            <button
              onClick={() => {
                playClickSound();
                setShowLoginModal(true);
              }}
              className="text-[10px] px-2 py-0.5 rounded border border-[#58a6ff]/50 bg-[#1f6feb]/20 text-[#58a6ff] hover:bg-[#1f6feb]/40 transition font-bold"
            >
              ADMIN LOGIN
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#8b949e]">
          {/* D-Day 호버 팝오버 */}
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
                {!isAuthenticated ? (
                  <div className="text-[11px] text-amber-400/90 py-2 text-center">
                    🔒 개인 일정 보안 잠금 상태입니다.
                  </div>
                ) : ddayItems.length === 0 ? (
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

      {/* 2. 풀스택 6대 엔지니어링 서브시스템 카드 그리드 (2열 x 3행) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {/* ENGINE 01: CBT 통합 시스템 */}
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
          <div className="text-xs text-[#8b949e] mt-1">시험 응시 · 오답노트 보관함 통합</div>
        </Link>

        {/* ENGINE 02: 전주대 기상 관측소 */}
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

        {/* ENGINE 03: 스마트 가계부 & 예산 (보안 구역) */}
        <Link
          href="/ledger"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#f85149] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#f85149]">ENGINE 03</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-[#f85149] border border-rose-500/40">
              {isAuthenticated ? 'UNLOCKED' : '🔒 LOCKED'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">스마트 가계부 & 예산</div>
          <div className="text-xs text-[#8b949e] mt-1">지출 기록 · 가용 예산 추적 · 비밀번호 보호</div>
        </Link>

        {/* ENGINE 04: 습관 & 루틴 매트릭스 (보안 구역) */}
        <Link
          href="/habits"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#7ee787] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#7ee787]">ENGINE 04</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-[#f85149] border border-rose-500/40">
              {isAuthenticated ? 'UNLOCKED' : '🔒 LOCKED'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">습관 & 루틴 매트릭스</div>
          <div className="text-xs text-[#8b949e] mt-1">데일리 루틴 체크 · 7일간의 연속 달성 추적</div>
        </Link>

        {/* ENGINE 05: 프로젝트 칸반 보드 (보안 구역) */}
        <Link
          href="/kanban"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#d2a8ff] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#d2a8ff]">ENGINE 05</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-[#f85149] border border-rose-500/40">
              {isAuthenticated ? 'UNLOCKED' : '🔒 LOCKED'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">프로젝트 칸반 보드</div>
          <div className="text-xs text-[#8b949e] mt-1">TODO ➔ IN PROGRESS ➔ DONE 3단계 관리</div>
        </Link>

        {/* ENGINE 06: 24H 타임블록 플래너 (보안 구역) */}
        <Link
          href="/planner"
          onClick={playClickSound}
          className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg hover:border-[#f0883e] hover:bg-[#1f242c] transition group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8b949e] group-hover:text-[#f0883e]">ENGINE 06</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/40 text-[#f85149] border border-rose-500/40">
              {isAuthenticated ? 'UNLOCKED' : '🔒 LOCKED'}
            </span>
          </div>
          <div className="text-base font-bold text-white mt-1">24H 타임블록 플래너</div>
          <div className="text-xs text-[#8b949e] mt-1">하루 24시간 블록 계획 · 실시간 시간 인디케이터</div>
        </Link>
      </section>

      {/* 메인 2열 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* [좌측 7열]: 올해/이달 목표 + 달력 + 히트맵 잔디밭 + 학습 통계 및 로그 */}
        <section className="lg:col-span-7 space-y-6">
          {/* 달력 상단: 목표 보드 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <span className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯 MISSION_OBJECTIVES</span>
              </span>
              {isAuthenticated ? (
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
              ) : (
                <span className="text-[10px] text-[#8b949e]">🔒 READ_ONLY</span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/40 shrink-0">
                  2026_YEAR
                </span>
                {isEditingGoals && isAuthenticated ? (
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
                {isEditingGoals && isAuthenticated ? (
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

          {/* 달력 컨테이너 (비로그인 시 블러 처리) */}
          <div className="relative border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg overflow-hidden">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-xl mb-3 shadow-lg">
                  🔒
                </div>
                <h3 className="text-sm font-bold text-white mb-1">SCHEDULE_CALENDAR LOCKED</h3>
                <p className="text-xs text-[#8b949e] max-w-sm mb-4 leading-relaxed">
                  개인 스케줄 및 학사/수험 일정 보호를 위해 블러 잠금 처리되었습니다. 관리자 인증 후 열람할 수 있습니다.
                </p>
                <button
                  onClick={() => {
                    playClickSound();
                    setShowLoginModal(true);
                  }}
                  className="bg-[#238636] hover:bg-[#2ea043] text-white text-xs px-4 py-2 rounded font-bold transition shadow-md"
                >
                  로그인하고 일정 열람
                </button>
              </div>
            )}

            <div className={!isAuthenticated ? 'blur-sm select-none pointer-events-none' : ''}>
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
                  const isToday = d === 28 && month === 9;

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
          </div>

          {/* 등록된 일정 큐 리스트 (비로그인 시 블러 처리) */}
          <div className="relative border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg overflow-hidden">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <span className="text-xs text-slate-300 font-bold bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg shadow-xl">
                  🔒 SCHEDULE_QUEUE LOCKED (로그인 필요)
                </span>
              </div>
            )}

            <div className={!isAuthenticated ? 'blur-sm select-none pointer-events-none' : ''}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#8b949e] uppercase">SCHEDULED_EVENTS_QUEUE</span>
                <span className="text-[10px] text-[#238636]">STORAGE: HYBRID_SYNC</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1f6feb] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#388bfd] [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[#161b22]">
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
                      {s.isDday && isMounted && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                          {calculateDday(s.date)}
                        </span>
                      )}
                    </div>
                    {isAuthenticated && (
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="text-[#8b949e] hover:text-[#f85149] text-xs px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 공부 기록 잔디밭 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">COMMIT_ACTIVITY_HEATMAP</span>
                <span className="text-[10px] text-[#8b949e]">(최근 12주간 잔디 심기)</span>
              </div>
              <span className="text-xs font-bold text-[#7ee787]">
                총 {Math.floor(currentMonthTotalMinutes / 60)}h {currentMonthTotalMinutes % 60}m (당월)
              </span>
            </div>

            <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3">
              <div className="flex gap-1.5 justify-center overflow-x-auto py-1">
                {Array.from({ length: 12 }).map((_, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1.5">
                    {heatmapDays.slice(colIdx * 7, (colIdx + 1) * 7).map((day) => {
                      let bgClass = 'bg-[#161b22] border-[#21262d]';
                      if (day.minutes > 0 && day.minutes < 60) bgClass = 'bg-[#0e4429] border-[#006d32]';
                      else if (day.minutes >= 60 && day.minutes < 180) bgClass = 'bg-[#006d32] border-[#26a641]';
                      else if (day.minutes >= 180 && day.minutes < 300) bgClass = 'bg-[#26a641] border-[#39d353]';
                      else if (day.minutes >= 300) bgClass = 'bg-[#39d353] border-emerald-300';

                      return (
                        <div
                          key={day.date}
                          title={`${day.date}: ${Math.floor(day.minutes / 60)}시간 ${day.minutes % 60}분 공부`}
                          className={`w-3.5 h-3.5 rounded-sm border transition-all hover:scale-125 cursor-pointer ${bgClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#8b949e] pt-2 px-1">
                <span>12 WEEKS AGO</span>
                <div className="flex items-center gap-1">
                  <span>LESS</span>
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#161b22] border border-[#21262d]" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#0e4429]" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#006d32]" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#26a641]" />
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#39d353]" />
                  <span>MORE</span>
                </div>
                <span>TODAY</span>
              </div>
            </div>

            {currentMonthTotalMinutes > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#0d1117] border border-[#21262d]">
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

                <div className="flex flex-wrap gap-3 text-[10px] text-[#8b949e]">
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

          {/* 학습 로그 게시판 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>📚 STUDY_BOARD_ARCHIVE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 font-bold">
                  HYBRID SYNC
                </span>
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e]">
                  당월: <strong className="text-white font-mono">{studyLogs.length}건</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[#8b949e]">
                  누적: <strong className="text-[#d2a8ff] font-mono">{Math.floor(currentMonthTotalMinutes / 60)}h {currentMonthTotalMinutes % 60}m</strong>
                </span>
              </div>
            </div>

            {isAuthenticated ? (
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
                    placeholder="학습 내용 상세..."
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
            ) : (
              <div className="bg-[#0d1117] p-2.5 rounded border border-[#21262d] mb-4 text-center text-xs text-[#8b949e]">
                🔒 학습 기록 등록 및 삭제는 관리자 로그인 후 이용 가능합니다.
              </div>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1.5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0d1117] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#6e40c9] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#8957e5] [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[#161b22]">
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
                    {isAuthenticated && (
                      <button
                        onClick={() => handleDeleteStudyLog(log.id)}
                        className="text-[#8b949e] hover:text-[#f85149] text-xs px-1 self-end sm:self-auto"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* [우측 5열]: 크로노 모듈 + 프로필/자소서 + 투두 체크리스트 + 커플 텔레메트리 + 스크래치패드 */}
        <section className="lg:col-span-5 space-y-6">
          {/* 다기능 크로노 모듈 */}
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
                      if (isEditingProfile) handleSaveProfile();
                      else {
                        playClickSound();
                        setIsEditingProfile(true);
                      }
                    }}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/20 font-bold transition"
                  >
                    {isEditingProfile ? 'SAVE_PROFILE' : 'EDIT_PROFILE'}
                  </button>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/40">
                  {isAuthenticated ? 'ROOT AUTHORIZED' : 'VISITOR MODE'}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-[#21262d] pb-2 gap-1">
                <span className="text-[#8b949e]">OPERATOR:</span>
                {isEditingProfile && isAuthenticated ? (
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
                {isEditingProfile && isAuthenticated ? (
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
                {isEditingProfile && isAuthenticated ? (
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
                {isEditingProfile && isAuthenticated ? (
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
              </div>

              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    본 구역은 대표 전용 보안 저장소입니다. 상단 [ADMIN LOGIN] 버튼을 통해 로그인해야 열람 및 수정이 가능합니다.
                  </p>
                  <button
                    onClick={() => {
                      playClickSound();
                      setShowLoginModal(true);
                    }}
                    className="w-full bg-[#21262d] hover:bg-[#30363d] text-white text-xs py-2 rounded border border-[#30363d] font-bold transition"
                  >
                    관리자 로그인 창 열기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-[10px] text-[#8b949e]">* 로컬 및 Supabase 영구 보존 모드입니다.</div>
                  <textarea
                    rows={8}
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

          {/* 오늘의 엔지니어링 투두 체크리스트 (비로그인 시 블러 처리) */}
          <div className="relative border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg space-y-3 overflow-hidden">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <span className="text-xs text-slate-300 font-bold bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg shadow-xl">
                  🔒 CHECKLIST LOCKED (로그인 필요)
                </span>
              </div>
            )}

            <div className={!isAuthenticated ? 'blur-sm select-none pointer-events-none' : ''}>
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">DEV_CHECKLIST</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/60 text-blue-300 border border-blue-500/40">
                    {completedTasksCount}/{tasks.length} ({taskProgressPct}%)
                  </span>
                </div>
                <span className="text-[10px] text-[#8b949e]">DAILY_SPRINT</span>
              </div>

              <div className="h-1.5 w-full bg-[#0d1117] rounded-full overflow-hidden border border-[#21262d] my-2">
                <div
                  style={{ width: `${taskProgressPct}%` }}
                  className="h-full bg-gradient-to-r from-[#238636] to-[#7ee787] transition-all duration-300"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="text-[11px] text-[#8b949e] py-3 text-center">등록된 데일리 태스크가 없습니다.</div>
                ) : (
                  tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#21262d] text-xs hover:border-[#30363d] transition"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                        <input
                          type="checkbox"
                          checked={t.is_completed}
                          onChange={() => handleToggleTask(t)}
                          className="rounded border-[#30363d] text-[#238636] focus:ring-0 cursor-pointer"
                        />
                        <span className={`${t.is_completed ? 'line-through text-[#8b949e]' : 'text-slate-200'}`}>
                          {t.task}
                        </span>
                      </label>
                      {isAuthenticated && (
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="text-[#8b949e] hover:text-[#f85149] text-xs px-1 ml-2"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="새 스프린트 태스크 추가..."
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] px-2.5 py-1 text-xs rounded text-white focus:outline-none focus:border-[#58a6ff]"
                />
                <button
                  type="submit"
                  className="bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1 rounded text-xs font-bold transition whitespace-nowrap"
                >
                  + ADD
                </button>
              </form>
            </div>
          </div>

          {/* 대문 오른쪽 아래: 커플 텔레메트리 & 마일스톤 */}
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2 mb-3">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>❤️ COUPLE_TELEMETRY</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40 font-bold">
                SINCE 2019.12.07
              </span>
            </div>

            <div className="mb-4">
              <div className="text-3xl font-extrabold font-mono text-white">
                Day <span className="text-rose-400">{milestones ? milestones.currentDays : '---'}</span>
              </div>
            </div>

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