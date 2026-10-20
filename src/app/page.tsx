import Link from 'next/link';

export default function Home() {
  const modules = [
    {
      title: '정보처리기사 CBT',
      description: '실전 모의고사, OMR 마킹 시트, 타이머 및 인라인 관리자 오답 핫픽스 엔진.',
      href: '/cbt',
      badge: 'v1.0 Ready',
      color: 'from-blue-600 to-indigo-600'
    },
    {
      title: '개인 개발 아카이브',
      description: '추후 추가 예정인 코드 스니펫 및 기술 문서 관리 모듈.',
      href: '#',
      badge: 'Planned',
      color: 'from-slate-700 to-slate-800'
    },
    {
      title: '개인 유틸리티 & 도구함',
      description: 'API 테스트, 포맷터 등 일상 작업에 필요한 커스텀 유틸리티 집합체.',
      href: '#',
      badge: 'Planned',
      color: 'from-slate-700 to-slate-800'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
          <h1 className="font-mono text-xl font-bold tracking-tight">MY PERSONAL HUB</h1>
        </div>
        <span className="font-mono text-xs text-slate-400">Next.js 14 · Supabase · Vercel</span>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">모듈형 개인 워크스페이스</h2>
          <p className="text-slate-400">필요한 기능들을 하나씩 차곡차곡 추가하고 관리하는 전용 대시보드입니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => (
            <Link
              key={idx}
              href={m.href}
              className={`group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl ${
                m.href === '#' ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                    {m.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition mb-2">
                  {m.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-xs font-semibold text-blue-400">
                {m.href === '#' ? '개발 예정' : '모듈 실행하기 →'}
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center font-mono text-xs text-slate-500">
        Standalone Personal Hub &copy; 2026. All rights reserved.
      </footer>
    </div>
  );
}