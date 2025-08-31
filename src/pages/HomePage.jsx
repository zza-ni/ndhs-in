import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNoticeListCache, isNoticeCacheFresh, setNoticeListCache } from '../lib/noticeCache';

const days = ['월', '화', '수', '목', '금', '토', '일'];
const tz = 'Asia/Seoul';
const now = new Date();
const DateToStr = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: tz }).replace(/-/g, '');
const strToDate = (yyyymmdd) => new Date(yyyymmdd.slice(0, 4), yyyymmdd.slice(4, 6) - 1, yyyymmdd.slice(6, 8));
const getDayIdx = (dateStr) => {
  const date = strToDate(dateStr);
  return date.getDay() === 0 ? 6 : date.getDay() - 1;
};
const getWednesdayOfWeek = (dateStr) => {
  const d = strToDate(dateStr);
  const diffToMonday = (d.getDay() || 7) - 1;
  d.setDate(d.getDate() - diffToMonday + 2);
  return d;
};
const getActiveMeal = () => {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 60 + minute;
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  if (time >= 1170) return { meal: 'breakfast', dayIndex: (getTodayIndex() + 1) % 7, date: DateToStr(nextDay) };
  if (time < 480) return { meal: 'breakfast', dayIndex: getTodayIndex(), date: DateToStr(now) };
  if (time < 780) return { meal: 'lunch', dayIndex: getTodayIndex(), date: DateToStr(now) };
  return { meal: 'dinner', dayIndex: getTodayIndex(), date: DateToStr(now) };
};
const getTodayIndex = () => {
  let idx = now.getDay() - 1;
  return idx < 0 ? 6 : idx;
};
const formatNoticeDate = (yyyymmddHHMMSS) => {
  if (!yyyymmddHHMMSS) return '';
  const s = String(yyyymmddHHMMSS);
  const yy = s.slice(2, 4);
  const m = String(parseInt(s.slice(4, 6), 10));
  const d = String(parseInt(s.slice(6, 8), 10));
  return `${yy}/${m}/${d}`;
};

export default function HomePage() {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
  const NOTICE_API = `${API_ENDPOINT.replace(/\/$/, '')}/boards/notice`;
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [menuOfToday, setMenuOfToday] = useState(null); // { mealLabel, items, dateLabel }

  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeError, setNoticeError] = useState('');
  const [topNotices, setTopNotices] = useState([]); // [{id,title,created_at}]

  const active = useMemo(() => getActiveMeal(), []);

  useEffect(() => {
  // Load weekly menu and extract today's active meal (use active.date for week selection)
    (async () => {
      try {
        setMenuLoading(true);
    const wednesday = getWednesdayOfWeek(active.date);
        const jsonPath = `/data/${DateToStr(wednesday)}.json`;
        const res = await fetch(jsonPath);
        if (!res.ok) throw new Error('menu');
        const data = await res.json();
        const dayLabel = days[active.dayIndex];
        const dayMenu = Array.isArray(data) ? data.find((d) => d.day === dayLabel) : null;
        const mealLabel = active.meal === 'breakfast' ? '아침' : active.meal === 'lunch' ? '점심' : '저녁';
        const items = dayMenu?.[active.meal] || '-';
        const dateLabel = dayMenu?.date ? dayMenu.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${parseInt(m,10)}/${parseInt(d,10)}`) : '';
    setMenuOfToday({ mealLabel, items, dateLabel });
      } catch (e) {
        setMenuError('메뉴를 불러오지 못했어요.');
      } finally {
        setMenuLoading(false);
      }
    })();
  }, [active.dayIndex, active.meal, active.date]);

  useEffect(() => {
    // Load latest notices (top 3)
    (async () => {
      try {
        setNoticeLoading(true);
        if (isNoticeCacheFresh()) {
          const c = getNoticeListCache();
          setTopNotices((c.items || []).slice(0, 3));
        } else {
          const u = new URL(NOTICE_API);
          const res = await fetch(u.toString(), { headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error('notice');
          const data = await res.json();
          const items = Array.isArray(data?.posts) ? data.posts : [];
          setNoticeListCache({ items, cursor: data?.last ?? null, hasMore: !!(data?.last && items.length > 0) });
          setTopNotices(items.slice(0, 3));
        }
      } catch (e) {
        setNoticeError('공지사항을 불러오지 못했어요.');
      } finally {
        setNoticeLoading(false);
      }
    })();
  }, [NOTICE_API]);

  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>홈</h2>
      </div>
      <div className="container">
        <section className="home-cards">
          {/* 1) 현재 active된 메뉴 */}
          <article className="card">
            <div className="card-header">
              <div className="card-title-row">
                <h3 className="card-title">식단</h3>
                {menuOfToday?.mealLabel && (
                  <span
                    className={`chip chip-sm meal-${active.meal}`}
                    aria-label={`현재 식사: ${menuOfToday?.mealLabel}`}
                    title={`현재 식사: ${menuOfToday?.mealLabel}`}
                  >
                    {menuOfToday?.dateLabel} {menuOfToday?.mealLabel}
                  </span>
                )}
              </div>
              <Link className="card-link" to="/menu" aria-label="식단표 보러가기">→</Link>
            </div>
            {menuLoading ? (
              <div className="skeleton-list" style={{ margin: 0 }}>
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ) : menuError ? (
              <p className="card-error">{menuError}</p>
            ) : (
              <div className="card-body" role="status" aria-live="polite">
                <div className="card-text" style={{ whiteSpace: 'pre-line' }}>{menuOfToday?.items || '-'}</div>
              </div>
            )}
          </article>

          {/* 2) 공지사항 최신 글 3개 */}
          <article className="card">
            <div className="card-header">
              <h3 className="card-title">공지사항</h3>
              <Link className="card-link" to="/notice" aria-label="공지 더보기">→</Link>
            </div>
            {noticeLoading ? (
              <div className="skeleton-list" style={{ margin: 0 }}>
                {[0,1,2].map((i) => (
                  <div key={i} className="skeleton skeleton-line" style={{ marginTop: 8 }} />
                ))}
              </div>
            ) : noticeError ? (
              <p className="card-error">{noticeError}</p>
            ) : (
              <ul className="card-list" role="list">
                {topNotices.map((n, idx) => {
                  const id = n.id || n.post_id || idx;
                  return (
                    <li key={id} className="card-list-item" role="listitem">
                      <Link
                        to={`/notice/${id}`}
                        className="card-list-link"
                        aria-label={`${n.title || '공지'} ${formatNoticeDate(n.created_at)} 공지${n.tag ? `, 태그 ${n.tag}` : ''}`}
                      >
                        <span className="card-list-main">
                          {n.tag && <span className="chip chip-sm" aria-label={`태그 ${n.tag}`}>{n.tag}</span>}
                          <span className="card-list-title" title={n.title}>{n.title || '공지'}</span>
                        </span>
                        <span className="card-list-date">{formatNoticeDate(n.created_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          {/* 3) 빈 카드 (스켈레톤) */}
          <article className="card">
            <div className="card-header">
              <h3 className="card-title">곧 추가될 카드</h3>
              <span className="card-link" aria-hidden>준비중</span>
            </div>
            <div className="skeleton-list" style={{ margin: 0 }}>
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
