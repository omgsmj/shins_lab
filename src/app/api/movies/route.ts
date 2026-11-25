import { NextResponse } from 'next/server';

interface KobisBoxOfficeItem {
  rank: string;
  rankInten: string;
  rankOldAndNew: string;
  movieCd: string;
  movieNm: string;
  openDt: string;
  audiAcc: string;
}

function getYesterdayKstString(): string {
  const now = new Date();
  // UTC 기준 KST(+9시간) 보정 후 24시간(1일) 차감
  const kstYesterday = new Date(now.getTime() + 9 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  const yyyy = kstYesterday.getUTCFullYear();
  const mm = String(kstYesterday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kstYesterday.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
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
  const endpoint = `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${apiKey}&targetDt=${targetDt}`;

  try {
    const res = await fetch(endpoint, {
      next: { revalidate: 3600 }, // 1시간 단위 서버 캐싱
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

    const movies = list.slice(0, 10).map((item) => ({
      rank: Number(item.rank),
      rankInten: Number(item.rankInten),
      isNew: item.rankOldAndNew === 'NEW',
      movieCd: item.movieCd,
      title: item.movieNm,
      openDt: item.openDt,
      audiAcc: Number(item.audiAcc),
    }));

    return NextResponse.json({
      targetDt,
      movies,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to connect KOBIS API' },
      { status: 500 }
    );
  }
}