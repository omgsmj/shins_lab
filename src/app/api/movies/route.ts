import { NextResponse } from 'next/server';

interface KobisBoxOfficeItem {
  rank: string;
  rankInten: string;
  rankOldAndNew: string;
  movieCd: string;
  movieNm: string;
  openDt: string;
  audiCnt: string;
  audiAcc: string;
}

interface KobisMovieDetail {
  showTm?: string;
  nations?: Array<{ nationNm: string }>;
  genres?: Array<{ genreNm: string }>;
  audits?: Array<{ watchGradeNm: string }>;
}

function getYesterdayKstString(): string {
  const now = new Date();
  const kstYesterday = new Date(now.getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  const yyyy = kstYesterday.getUTCFullYear();
  const mm = String(kstYesterday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kstYesterday.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function formatWatchGrade(rawGrade?: string): string {
  if (!rawGrade) return '미정';
  if (rawGrade.includes('전체')) return '전체';
  if (rawGrade.includes('12')) return '12세';
  if (rawGrade.includes('15')) return '15세';
  if (rawGrade.includes('청소년') || rawGrade.includes('불가')) return '청불';
  return rawGrade;
}

async function fetchMovieDetail(apiKey: string, movieCd: string): Promise<KobisMovieDetail | null> {
  const detailUrl = `https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieInfo.json?key=${apiKey}&movieCd=${movieCd}`;
  try {
    const res = await fetch(detailUrl, {
      next: { revalidate: 86400 }, // 영화 상세 메타데이터는 24시간 캐싱
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.movieInfoResult?.movieInfo ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const apiKey = process.env.KOBIS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'KOBIS_API_KEY is missing in environment variables.' },
      { status: 500 }
    );
  }

  const targetDt = getYesterdayKstString();
  const boxOfficeUrl = `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${targetDt}`;

  try {
    const res = await fetch(boxOfficeUrl, {
      next: { revalidate: 3600 }, // 일별 박스오피스 1시간 캐싱
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `KOBIS HTTP Error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const list: KobisBoxOfficeItem[] | undefined = data?.boxOfficeResult?.dailyBoxOfficeList;

    if (!Array.isArray(list)) {
      return NextResponse.json(
        { error: 'Invalid KOBIS response payload' },
        { status: 502 }
      );
    }

    const top10 = list.slice(0, 10);

    // 10개 영화의 상세 스펙(상영시간, 등급, 장르, 국가) 병렬 조회
    const enrichedMovies = await Promise.all(
      top10.map(async (item) => {
        const detail = await fetchMovieDetail(apiKey, item.movieCd);

        const showTm = detail?.showTm ? `${detail.showTm}분` : '-';
        const watchGrade = formatWatchGrade(detail?.audits?.[0]?.watchGradeNm);
        const genres =
          detail?.genres && detail.genres.length > 0
            ? detail.genres.map((g) => g.genreNm).slice(0, 2).join('/')
            : '-';
        const nations =
          detail?.nations && detail.nations.length > 0
            ? detail.nations.map((n) => n.nationNm).slice(0, 2).join('/')
            : '-';

        return {
          rank: Number(item.rank),
          rankInten: Number(item.rankInten),
          isNew: item.rankOldAndNew === 'NEW',
          movieCd: item.movieCd,
          title: item.movieNm,
          openDt: item.openDt || '개봉일 미정',
          audiCnt: Number(item.audiCnt),
          audiAcc: Number(item.audiAcc),
          showTm,
          watchGrade,
          genres,
          nations,
        };
      })
    );

    return NextResponse.json({
      targetDt,
      movies: enrichedMovies,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to connect KOBIS API' },
      { status: 500 }
    );
  }
}