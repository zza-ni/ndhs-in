import React, { useEffect, useMemo, useRef, useState } from 'react';
import seg from '../components/ui/SegmentedControl.module.css';


const days = ['월', '화', '수', '목', '금', '토', '일'];
const now = new Date();
const tz = 'Asia/Seoul';
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
const formatDate = (dateStr) => {
  const [, month, day] = dateStr.match(/(\d{2})-?(\d{2})$/) || [];
  return month && day ? `${parseInt(month, 10)}/${parseInt(day, 10)}` : dateStr;
};
const getTodayIndex = () => {
  let idx = now.getDay() - 1;
  return idx < 0 ? 6 : idx;
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

function useQueryDate() {
  const [date, setDate] = useState(() => new URLSearchParams(window.location.search).get('date') || DateToStr(now));
  useEffect(() => {
    const original = history.replaceState;
    history.replaceState = function (...args) {
      const result = original.apply(this, args);
      const current = new URLSearchParams(window.location.search).get('date') || DateToStr(now);
      setDate(current);
      return result;
    };
    return () => {
      history.replaceState = original;
    };
  }, []);
  const setQueryDate = (value) => {
    const url = new URL(window.location.href);
    url.searchParams.set('date', value.replace(/-/g, ''));
    history.replaceState({}, '', url);
  };
  return [date, setQueryDate];
}


function SegmentedTabs({ selectedIndex, onChange }) {
  return (
  <div className={seg.root}>
      {days.map((label, i) => (
        <React.Fragment key={label}>
      <input className={seg.radio} type="radio" id={`tab${i + 1}`} name="tab" checked={selectedIndex === i} onChange={() => onChange(i)} />
      <label className={seg.label} htmlFor={`tab${i + 1}`}>{label}</label>
        </React.Fragment>
      ))}
    </div>
  );
}

function MenuBlocks({ menu, highlight }) {
  const block = (title, items, active) => (
    <div className={`menu-block${active ? ' active' : ''}`}>
      <span className="meal-header">{title}</span>
      <span className="meal-time">{title === '아침' ? '07:00 ~ 08:00' : title === '점심' ? '11:30 ~ 13:00' : '18:00 ~ 19:30'}</span>
      <div className="menu-list">{items || '-'}</div>
    </div>
  );
  return (
    <>
      {block('아침', menu?.breakfast, highlight === 'breakfast')}
      {block('점심', menu?.lunch, highlight === 'lunch')}
      {block('저녁', menu?.dinner, highlight === 'dinner')}
    </>
  );
}

export default function MenuPage() {
  const [queryDate, setQueryDate] = useQueryDate();
  const [menuData, setMenuData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(() => getDayIdx(queryDate));
  const showWeekDateRef = useRef(getWednesdayOfWeek(queryDate));
  const nextBtnRef = useRef(null);

  // 글로벌 초기화가 main에서 이루어지므로 이 페이지에서는 불필요

  // Push prompt handled globally by component

  const fetchWeek = (wednesdayDateObj) => {
    const jsonPath = `/data/${DateToStr(wednesdayDateObj)}.json`;
    fetch(jsonPath)
      .then((res) => { if (!res.ok) throw new Error('server'); return res.json(); })
      .then((data) => {
        setMenuData(data);
        const maxDate = DateToStr(getWednesdayOfWeek(DateToStr(new Date(now.getTime() + 4 * 24 * 3600000 + 21540000))));
        const nextBtn = nextBtnRef.current;
        if (nextBtn) {
          const disabled = DateToStr(wednesdayDateObj) === maxDate;
          nextBtn.disabled = disabled;
          nextBtn.style.opacity = disabled ? '0.5' : '';
          nextBtn.style.cursor = disabled ? 'not-allowed' : '';
        }
      })
      .catch(() => { alert('식단 정보를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.'); window.location.href = '/'; });
  };

  useEffect(() => {
    const wednesday = getWednesdayOfWeek(queryDate);
    showWeekDateRef.current = wednesday;
    fetchWeek(wednesday);
    setSelectedTab(getDayIdx(queryDate));
  }, [queryDate]);

  useEffect(() => {
    const hour = now.getHours(); const minute = now.getMinutes(); const time = hour * 60 + minute;
    const nextDay = new Date(now); nextDay.setDate(now.getDate() + 1);
    const params = new URLSearchParams(window.location.search);
    if (time >= 1170 && !params.get('date')) setQueryDate(DateToStr(nextDay));
  }, []);

  const activeMeal = useMemo(() => getActiveMeal(), []);
  const currentMenu = useMemo(() => menuData?.find((m) => m.day === days[selectedTab]), [menuData, selectedTab]);
  const titleDate = useMemo(() => (menuData?.[selectedTab]?.date ? formatDate(menuData[selectedTab].date) : ''), [menuData, selectedTab]);

  const onPrev = () => { const a = strToDate(queryDate); setQueryDate(DateToStr(new Date(a.setDate(a.getDate() - 7)))); };
  const onNext = () => { const a = strToDate(queryDate); setQueryDate(DateToStr(new Date(a.setDate(a.getDate() + 7)))); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'ArrowLeft') setSelectedTab((i) => Math.max(0, i - 1)); else if (e.key === 'ArrowRight') setSelectedTab((i) => Math.min(6, i + 1)); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <main className="main-content page-content">
        <div className="header">
          <div onClick={() => (window.location.href = '/')}> 
            <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
          </div>
          <button id="prev-week" className="week-control" onClick={onPrev}>
            &#60;
          </button>
          <p className="today-date">{titleDate ? `${titleDate} (${days[selectedTab]})` : ''}</p>
          <button id="next-week" className="week-control" onClick={onNext} ref={nextBtnRef}>
            &#62;
          </button>
        </div>

        <div className="container" id="menu1">
          <SegmentedTabs selectedIndex={selectedTab} onChange={(i) => setSelectedTab(i)} />
          <div className="menu-wrapper">
            <MenuBlocks
              menu={currentMenu}
              highlight={
                menuData?.[selectedTab]?.date?.replace(/-/g, '') === activeMeal.date && selectedTab === activeMeal.dayIndex
                  ? activeMeal.meal
                  : undefined
              }
            />
          </div>
        </div>
      </main>

  {/* Prompts moved to App root for global display */}
    </>
  );
}
