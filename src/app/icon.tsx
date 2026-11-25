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

        {/* 입체 S자 리본 심볼 (SVG 벡터) */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shins-grad-top" x1="8" y1="4" x2="32" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="shins-grad-bottom" x1="8" y1="18" x2="32" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#4338CA" />
            </linearGradient>
            <linearGradient id="shins-grad-core" x1="12" y1="14" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>
          </defs>

          {/* 상단 S 커브 리본 */}
          <path
            d="M27.5 6C19.5 6 13 10.2 13 15.8C13 19.6 16.4 21.8 21.5 23.1C17.8 21.2 17.5 17.8 20.5 15.2C23.5 12.6 28.5 12.2 31 13.5C31 9.1 29.8 6 27.5 6Z"
            fill="url(#shins-grad-top)"
          />
          {/* 중앙 교차 섀도우 리본 */}
          <path
            d="M13.2 16.5C13.6 21.4 18.8 23.2 23.6 24.6C26.4 25.4 27.2 27.6 26.2 29.5C28.8 27.4 29.2 23.2 25.4 20.8C21.2 18.2 15.2 17.8 13.2 16.5Z"
            fill="url(#shins-grad-core)"
            opacity="0.9"
          />
          {/* 하단 S 커브 리본 */}
          <path
            d="M12.5 34C20.5 34 27 29.8 27 24.2C27 20.4 23.6 18.2 18.5 16.9C22.2 18.8 22.5 22.2 19.5 24.8C16.5 27.4 11.5 27.8 9 26.5C9 30.9 10.2 34 12.5 34Z"
            fill="url(#shins-grad-bottom)"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}