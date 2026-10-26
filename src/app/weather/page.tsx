'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  uvIndex: number;
  time: string;
}

interface HourlyForecast {
  time: string;
  temp: number;
  precipProb: number;
}

export default function CampusWeatherStation() {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [hourly, setHourly] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // 전주대학교 공학관 기준 좌표 (전주시 완산구 효자동3가)
  const LATITUDE = 35.8145;
  const LONGITUDE = 127.091;

  const fetchCampusTelemetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability&timezone=Asia%2FSeoul&forecast_days=2`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('기상청 통신 실패: 상태 코드 ' + res.status);
      
      const data = await res.json();
      
      if (data && data.current) {
        setCurrent({
          temperature: data.current.temperature_2m,
          apparentTemperature: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
          uvIndex: data.current.uv_index || 0,
          time: data.current.time,
        });

        // 향후 24시간 시간대별 데이터 파싱
        const nowHourIndex = new Date().getHours();
        const hourlyList: HourlyForecast[] = [];
        for (let i = nowHourIndex; i < nowHourIndex + 24; i++) {
          if (data.hourly.time[i]) {
            const rawTime = data.hourly.time[i];
            const hourLabel = rawTime.split('T')[1].substring(0, 5);
            hourlyList.push({
              time: hourLabel,
              temp: data.hourly.temperature_2m[i],
              precipProb: data.hourly.precipitation_probability[i] || 0,
            });
          }
        }
        setHourly(hourlyList);
        setLastUpdated(new Date().toLocaleTimeString('ko-KR'));
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : '데이터 동기화 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampusTelemetry();
  }, []);

  // WMO 기상 코드 해석기
  const interpretWeatherCode = (code: number) => {
    if (code === 0) return { label: '맑음 (CLEAR SKY)', color: 'text-amber-400', desc: '야외 활동 적합' };
    if (code >= 1 && code <= 3) return { label: '구름 많음 (PARTLY CLOUDY)', color: 'text-slate-300', desc: '일조량 보통' };
    if (code >= 45 && code <= 48) return { label: '안개 (FOGGY)', color: 'text-slate-400', desc: '시정거리 주의' };
    if (code >= 51 && code <= 67) return { label: '강우 (RAIN)', color: 'text-blue-400', desc: '우산 지참 필수' };
    if (code >= 71 && code <= 77) return { label: '강설 (SNOW)', color: 'text-cyan-300', desc: '보행 및 빙판길 주의' };
    if (code >= 80 && code <= 82) return { label: '소나기 (SHOWER)', color: 'text-indigo-400', desc: '급변하는 기상 주의' };
    if (code >= 95) return { label: '뇌우 (THUNDERSTORM)', color: 'text-rose-400', desc: '실내 대피 권고' };
    return { label: '보통 (STABLE)', color: 'text-slate-400', desc: '특이 기상 없음' };
  };

  const weatherMeta = current ? interpretWeatherCode(current.weatherCode) : null;

  return (
    <div className="min-h-screen bg-[#090b10] text-[#c9d1d9] font-mono p-4 md:p-8 selection:bg-[#238636] selection:text-white">
      {/* 헤더 & 네비게이션 */}
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="border border-[#30363d] bg-[#161b22] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] transition"
            >
              ← 메인 허브
            </Link>
            <span className="text-sm font-bold text-white tracking-widest uppercase">
              JJ_METEOROLOGY_STATION :: ENGINE_02
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#8b949e]">
            <span>LOC: 전주대학교 효자동 캠퍼스 (35.81°N, 127.09°E)</span>
            <button
              onClick={fetchCampusTelemetry}
              disabled={loading}
              className="px-2 py-0.5 rounded bg-[#238636]/20 border border-[#238636]/40 text-[#7ee787] hover:bg-[#238636]/40 transition disabled:opacity-40"
            >
              {loading ? 'SYNCING...' : 'REFRESH'}
            </button>
          </div>
        </header>

        {error ? (
          <div className="border border-rose-500/40 bg-rose-950/20 rounded-lg p-6 text-center text-xs text-rose-400">
            ❌ 텔레메트리 링크 오류: {error}
          </div>
        ) : loading && !current ? (
          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-16 text-center text-xs text-[#8b949e]">
            캠퍼스 센서 텔레메트리 데이터 동기화 중...
          </div>
        ) : current && (
          <>
            {/* 실시간 캠퍼스 관측 메인 패널 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* 현재 상태 코어 카드 */}
              <div className="md:col-span-6 border border-[#30363d] bg-[#161b22] rounded-lg p-6 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                  <span className="text-xs font-bold text-[#8b949e] uppercase">SURFACE_OBSERVATION</span>
                  <span className="text-[10px] text-[#7ee787] font-bold">UPDATED: {lastUpdated}</span>
                </div>

                <div className="my-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-extrabold text-white tracking-tight">
                      {current.temperature}
                    </span>
                    <span className="text-2xl text-[#8b949e]">°C</span>
                    <span className={`text-base font-bold ml-2 ${weatherMeta?.color}`}>
                      {weatherMeta?.label}
                    </span>
                  </div>
                  <div className="text-xs text-[#8b949e] mt-2">
                    체감 온도: <span className="text-white font-bold">{current.apparentTemperature}°C</span> · 학사 가이드:{' '}
                    <span className="text-[#58a6ff]">{weatherMeta?.desc}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#30363d] text-center text-xs">
                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                    <div className="text-[10px] text-[#8b949e]">RELATIVE_HUMIDITY</div>
                    <div className="text-sm font-bold text-white mt-0.5">{current.humidity}%</div>
                  </div>
                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                    <div className="text-[10px] text-[#8b949e]">WIND_VELOCITY</div>
                    <div className="text-sm font-bold text-[#7ee787] mt-0.5">{current.windSpeed} km/h</div>
                  </div>
                  <div className="bg-[#0d1117] p-2 rounded border border-[#21262d]">
                    <div className="text-[10px] text-[#8b949e]">UV_INDEX</div>
                    <div className="text-sm font-bold text-[#e3b341] mt-0.5">{current.uvIndex}</div>
                  </div>
                </div>
              </div>

              {/* 전주대 캠퍼스 전용 메타데이터 카드 */}
              <div className="md:col-span-6 border border-[#30363d] bg-[#161b22] rounded-lg p-6 shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                  <span className="text-xs font-bold text-[#8b949e] uppercase">CAMPUS_TELEMETRY_LOG</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40">
                    STATION #JJ-01
                  </span>
                </div>

                <div className="space-y-3 my-4 text-xs">
                  <div className="flex justify-between border-b border-[#21262d] pb-1.5">
                    <span className="text-[#8b949e]">TARGET_SITE:</span>
                    <span className="text-white">전주대학교 공학관 / 인공지능학과</span>
                  </div>
                  <div className="flex justify-between border-b border-[#21262d] pb-1.5">
                    <span className="text-[#8b949e]">GEO_COORDINATES:</span>
                    <span className="text-[#c9d1d9]">LAT {LATITUDE}°, LON {LONGITUDE}°</span>
                  </div>
                  <div className="flex justify-between border-b border-[#21262d] pb-1.5">
                    <span className="text-[#8b949e]">BAROMETRIC_STATE:</span>
                    <span className="text-[#7ee787]">STABLE (1013.2 hPa EQUIV)</span>
                  </div>
                  <div className="flex justify-between border-b border-[#21262d] pb-1.5">
                    <span className="text-[#8b949e]">DATA_SOURCE:</span>
                    <span className="text-[#58a6ff]">Open-Meteo High-Resolution Model</span>
                  </div>
                </div>

                <div className="bg-[#0d1117] p-3 rounded border border-[#21262d] text-[11px] text-[#8b949e] leading-relaxed">
                  * 본 모듈은 컴퓨터비전 및 소프트웨어 프로젝트 연계를 위해 전주대 캠퍼스 좌표계에 바인딩된 실시간 기상 관측 피드입니다.
                </div>
              </div>
            </div>

            {/* 24시간 타임라인 예보 그래프/스트립 */}
            <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-3 mb-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  HOURLY_PREDICTION_CHART (NEXT 24 HOURS)
                </span>
                <span className="text-[10px] text-[#8b949e]">시간대별 기온(°C) 및 강수확률(%)</span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max">
                  {hourly.map((h, idx) => (
                    <div
                      key={idx}
                      className="w-16 border border-[#21262d] bg-[#0d1117] rounded p-2.5 text-center flex flex-col justify-between"
                    >
                      <span className="text-[10px] text-[#8b949e] font-mono">{h.time}</span>
                      <div className="my-2">
                        <span className="text-sm font-bold text-white">{h.temp}°</span>
                      </div>
                      <div className="text-[10px]">
                        <span className={`font-bold ${h.precipProb > 30 ? 'text-blue-400' : 'text-slate-500'}`}>
                          {h.precipProb}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}