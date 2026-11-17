import { NextResponse } from 'next/server';

export async function GET() {
  const LATITUDE = 35.8145;
  const LONGITUDE = 127.091;

  // 1차 시도: Open-Meteo API
  try {
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability&timezone=Asia%2FSeoul&forecast_days=2`;
    
    const res = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShinsLabWeather/1.0)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ source: 'open-meteo', ...data });
    }
  } catch (err) {
    console.warn('Open-Meteo 1차 호출 실패, 백업 API로 전환합니다:', err);
  }

  // 2차 폴백(Backup): Open-Meteo 장애 시 wttr.in JSON API 자동 전환
  try {
    const backupRes = await fetch(`https://wttr.in/${LATITUDE},${LONGITUDE}?format=j1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (backupRes.ok) {
      const wData = await backupRes.json();
      const cur = wData.current_condition[0];
      
      const normalized = {
        source: 'wttr-backup',
        current: {
          temperature_2m: Number(cur.temp_C),
          apparent_temperature: Number(cur.FeelsLikeC),
          relative_humidity_2m: Number(cur.humidity),
          wind_speed_10m: Number(cur.windspeedKmph),
          weather_code: Number(cur.weatherCode) === 113 ? 0 : 2,
          uv_index: Number(cur.uvIndex || 0),
          time: new Date().toISOString(),
        },
        hourly: {
          time: Array.from({ length: 48 }, (_, idx) => {
            const d = new Date();
            d.setHours(idx, 0, 0, 0);
            return d.toISOString().slice(0, 13) + ':00';
          }),
          temperature_2m: Array(48).fill(Number(cur.temp_C)),
          precipitation_probability: Array(48).fill(0),
        },
      };

      return NextResponse.json(normalized);
    }
  } catch (backupErr) {
    console.error('백업 기상 API 호출 실패:', backupErr);
  }

  return NextResponse.json(
    { error: '기상 관측 서버와 연결할 수 없습니다.' },
    { status: 502 }
  );
}