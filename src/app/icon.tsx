import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07090e',
          borderRadius: '6px',
          border: '1px solid #1f2937',
          position: 'relative',
        }}
      >
        {/* 시스템 온라인 LED 인디케이터 */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 4px #10b981',
          }}
        />

        {/* 인더스트리얼 기하학적 S 심볼 (SVG 벡터) */}
        <svg
          width="20"
          height="22"
          viewBox="0 0 20 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cyber-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="core-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* 상단 윙 & 꺾임 */}
          <path
            d="M18 5V2H2V8H14V11H2"
            stroke="url(#cyber-cyan)"
            strokeWidth="2.8"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* 하단 윙 & 마감 */}
          <path
            d="M2 17V20H18V14H6V11H18"
            stroke="url(#cyber-cyan)"
            strokeWidth="2.8"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* 중앙 코어 브릿지 라인 */}
          <line
            x1="5"
            y1="11"
            x2="15"
            y2="11"
            stroke="url(#core-glow)"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}