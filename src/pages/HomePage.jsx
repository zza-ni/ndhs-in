import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import {
  CardSkeleton,
  CardError,
  MenuSkeleton,
  NoticeListSkeleton,
  EquipmentsSkeleton,
} from "../components/ui/Skeletons";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useToast } from "../components/ui/Toast.jsx";
import {
  getNoticeListCache,
  isNoticeCacheFresh,
  setNoticeListCache,
} from "../lib/noticeCache";
import styles from "./HomePage.module.css";

const days = ["월", "화", "수", "목", "금", "토", "일"];
const tz = "Asia/Seoul";
const now = new Date();
const DateToStr = (date = new Date()) =>
  date.toLocaleDateString("en-CA", { timeZone: tz }).replace(/-/g, "");
const strToDate = (yyyymmdd) =>
  new Date(
    yyyymmdd.slice(0, 4),
    yyyymmdd.slice(4, 6) - 1,
    yyyymmdd.slice(6, 8)
  );
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
  if (time >= 1170)
    return {
      meal: "breakfast",
      dayIndex: (getTodayIndex() + 1) % 7,
      date: DateToStr(nextDay),
    };
  if (time < 480)
    return {
      meal: "breakfast",
      dayIndex: getTodayIndex(),
      date: DateToStr(now),
    };
  if (time < 780)
    return { meal: "lunch", dayIndex: getTodayIndex(), date: DateToStr(now) };
  return { meal: "dinner", dayIndex: getTodayIndex(), date: DateToStr(now) };
};
const getTodayIndex = () => {
  let idx = now.getDay() - 1;
  return idx < 0 ? 6 : idx;
};
const formatNoticeDate = (yyyymmddHHMMSS) => {
  if (!yyyymmddHHMMSS) return "";
  const s = String(yyyymmddHHMMSS);
  const yy = s.slice(2, 4);
  const m = String(parseInt(s.slice(4, 6), 10));
  const d = String(parseInt(s.slice(6, 8), 10));
  return `${yy}/${m}/${d}`;
};

export default function HomePage() {
  const toast = useToast();
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
  const NOTICE_API = `${API_ENDPOINT.replace(/\/$/, "")}/boards/notice`;
  // 세탁실 성별 (남 m / 여 f), 기본값 m. localStorage에 저장/복원
  const [gender, setGender] = useState(
    () =>
      (typeof localStorage !== "undefined" && localStorage.getItem("gender")) ||
      "m"
  );
  useEffect(() => {
    try {
      localStorage.setItem("gender", gender);
    } catch {}
  }, [gender]);
  const LAUNDRY_API = useMemo(
    () => `${API_ENDPOINT.replace(/\/$/, "")}/laundry/${gender}`,
    [API_ENDPOINT, gender]
  );
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [menuOfToday, setMenuOfToday] = useState(null); // { mealLabel, items, dateLabel }

  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeError, setNoticeError] = useState("");
  const [topNotices, setTopNotices] = useState([]); // [{id,title,created_at}]

  // Dryer status
  const [dryerLoading, setDryerLoading] = useState(true);
  const [dryerError, setDryerError] = useState("");
  const [dryers, setDryers] = useState([]); // from API
  const [dryersFetchedAt, setDryersFetchedAt] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const TOTAL_SECONDS = 3000;

  const active = useMemo(() => getActiveMeal(), []);

  useEffect(() => {
    // Load weekly menu and extract today's active meal (use active.date for week selection)
    (async () => {
      try {
        setMenuLoading(true);
        const wednesday = getWednesdayOfWeek(active.date);
        const jsonPath = `/data/${DateToStr(wednesday)}.json`;
        const res = await fetch(jsonPath);
        if (!res.ok) throw new Error("menu");
        const data = await res.json();
        const dayLabel = days[active.dayIndex];
        const dayMenu = Array.isArray(data)
          ? data.find((d) => d.day === dayLabel)
          : null;
        const mealLabel =
          active.meal === "breakfast"
            ? "아침"
            : active.meal === "lunch"
            ? "점심"
            : "저녁";
        const items = dayMenu?.[active.meal] || "-";
        const dateLabel = dayMenu?.date
          ? dayMenu.date.replace(
              /^(\d{4})-(\d{2})-(\d{2})$/,
              (_, y, m, d) => `${parseInt(m, 10)}/${parseInt(d, 10)}`
            )
          : "";
        setMenuOfToday({ mealLabel, items, dateLabel });
      } catch (e) {
        setMenuError("메뉴를 불러오지 못했어요.");
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
          const res = await fetch(u.toString(), {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error("notice");
          const data = await res.json();
          const items = Array.isArray(data?.posts) ? data.posts : [];
          setNoticeListCache({
            items,
            cursor: data?.last ?? null,
            hasMore: !!(data?.last && items.length > 0),
          });
          setTopNotices(items.slice(0, 3));
        }
      } catch (e) {
        setNoticeError("공지사항을 불러오지 못했어요.");
      } finally {
        setNoticeLoading(false);
      }
    })();
  }, [NOTICE_API]);

  // Fetch dryer status
  useEffect(() => {
    (async () => {
      try {
        setDryerLoading(true);
        setDryerError("");
        const res = await fetch(LAUNDRY_API, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("laundry");
        const data = await res.json();
        const onlyDryers = (Array.isArray(data) ? data : []).filter(
          (d) => d.equipmentTypeCd === "DRYER"
        );
        // sort by numeric suffix in name if present
        const num = (s) => {
          const m = String(s || "").match(/(\d+)/);
          return m ? parseInt(m[1], 10) : 9999;
        };
        onlyDryers.sort((a, b) => num(a.equipmentName) - num(b.equipmentName));
        setDryers(onlyDryers.slice(0, 5));
        setDryersFetchedAt(Date.now());
      } catch (e) {
        setDryerError("건조기 현황을 불러오지 못했어요.");
      } finally {
        setDryerLoading(false);
      }
    })();
  }, [LAUNDRY_API]);

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secToMMSS = (s) => {
    const sec = Math.max(0, Math.floor(s));
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // 하루 1회만 성별 변경 허용
  const handleGenderSelect = (next) => {
    if (next === gender) return;
    try {
      const lastAt = Number(localStorage.getItem("genderChangedAt") || 0);
      const nowMs = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (lastAt && nowMs - lastAt < oneDay) {
        toast?.show("성별은 하루에 1번만 변경할 수 있어요.", { type: "error" });
        return;
      }
      const ok = window.confirm(
        "성별은 하루에 1번만 변경할 수 있어요. 변경할까요?"
      );
      if (!ok) return;
      localStorage.setItem("genderChangedAt", String(nowMs));
      setGender(next);
    } catch {
      const ok = window.confirm(
        "성별은 하루에 1번만 변경할 수 있어요. 변경할까요?"
      );
      if (!ok) return;
      setGender(next);
    }
  };

  return (
    <main className="main-content page-content">
      <PageHeader title="홈" />
      <div className="container">
        <section className="home-cards">
          {/* 1) 현재 active된 메뉴 */}
          <Card
            as="article"
            onClick={() => {
              location.href = "/menu";
            }}
            style={{ cursor: "pointer" }}
          >
            <CardHeader>
              <div className="card-title-row">
                <CardTitle>식단</CardTitle>
                {menuOfToday?.mealLabel && (
                  <Chip
                    size="sm"
                    className={`meal-${active.meal}`}
                    aria-label={`현재 식사: ${menuOfToday?.mealLabel}`}
                    title={`현재 식사: ${menuOfToday?.mealLabel}`}
                  >
                    {menuOfToday?.dateLabel} {menuOfToday?.mealLabel}
                  </Chip>
                )}
              </div>
              <Link
                className="card-link"
                to="/menu"
                aria-label="식단표 보러가기"
              >
                →
              </Link>
            </CardHeader>
            {menuLoading ? (
              <MenuSkeleton />
            ) : menuError ? (
              <CardError message={menuError} />
            ) : (
              <CardBody role="status" aria-live="polite">
                <div className={`card-text ${styles.preline}`}>
                  {menuOfToday?.items || "-"}
                </div>
              </CardBody>
            )}
          </Card>

          {/* 2) 공지사항 최신 글 3개 */}
          <Card as="article">
            <CardHeader
              onClick={() => {
                location.href = "/notice";
              }}
              style={{ cursor: "pointer" }}
            >
              <CardTitle>공지사항</CardTitle>
              <Link className="card-link" to="/notice" aria-label="공지 더보기">
                →
              </Link>
            </CardHeader>
            {noticeLoading ? (
              <NoticeListSkeleton count={3} />
            ) : noticeError ? (
              <CardError message={noticeError} />
            ) : (
              <ul className="card-list" role="list">
                {topNotices.map((n, idx) => {
                  const id = n.id || n.post_id || idx;
                  return (
                    <li key={id} className="card-list-item" role="listitem">
                      <Link
                        to={`/notice/${id}`}
                        className="card-list-link"
                        aria-label={`${n.title || "공지"} ${formatNoticeDate(
                          n.created_at
                        )} 공지${n.tag ? `, 태그 ${n.tag}` : ""}`}
                      >
                        <span className="card-list-main">
                          {n.tag && (
                            <Chip size="sm" aria-label={`태그 ${n.tag}`}>
                              {n.tag}
                            </Chip>
                          )}
                          <span className="card-list-title" title={n.title}>
                            {n.title || "공지"}
                          </span>
                        </span>
                        <span className="card-list-date">
                          {formatNoticeDate(n.created_at)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* 3) 건조기 사용현황 */}
          <Card as="article">
            <CardHeader>
              <CardTitle>건조기 사용현황</CardTitle>
              <div
                className="card-link"
                role="tablist"
                aria-label="세탁실 성별 선택"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={gender === "m"}
                  className={styles.genderButton}
                  onClick={() => handleGenderSelect("m")}
                  title="남자 세탁실"
                >
                  남
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={gender === "f"}
                  className={styles.genderButton}
                  onClick={() => handleGenderSelect("f")}
                  title="여자 세탁실"
                >
                  여
                </button>
              </div>
            </CardHeader>
            {dryerLoading ? (
              <CardBody>
                <EquipmentsSkeleton count={5} />
              </CardBody>
            ) : dryerError ? (
              <CardError message={dryerError} />
            ) : (
              <CardBody>
                <div className={styles.equipments}>
                  {dryers.map((d, idx) => {
                    const status = String(
                      d.equipmentStatusCd || ""
                    ).toLowerCase();
                    const inUse = status === "use";
                    const usable = status === "usable";
                    const fetchedAgo = (nowTick - dryersFetchedAt) / 1000;
                    const initial = Math.max(0, Number(d.time_diff || 0));
                    const remaining = inUse
                      ? Math.max(
                          0,
                          Math.min(TOTAL_SECONDS, initial - fetchedAgo)
                        )
                      : 0;
                    const pct = usable
                      ? 1
                      : inUse
                      ? 1 - remaining / TOTAL_SECONDS
                      : 0; // usable=가득, inUse=경과비율, 기타=0
                    const size = 46; // svg size (약간 더 축소)
                    const stroke = 5; // 두께 축소
                    const r = size / 2 - stroke;
                    const c = 2 * Math.PI * r;
                    const dash = c * pct;
                    const name = (
                      d.equipmentName || `건조기 ${idx + 1}`
                    ).replace(/\s*\(.*\)\s*/, "");
                    const equipNumber = parseInt(name.match(/\d+/));
                    const statusColor = inUse || usable ? "#4caf50" : "#bdbdbd";
                    return (
                      <div
                        key={d.equipmentSeq || idx}
                        className="equipment-item"
                      >
                        <div
                          className={styles.equipmentSvg}
                          style={{ width: size, height: size }}
                          aria-label={`${name} 남은 시간 ${secToMMSS(
                            remaining
                          )}`}
                        >
                          <svg
                            width={size}
                            height={size}
                            viewBox={`0 0 ${size} ${size}`}
                          >
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={r}
                              stroke="#e0e0e0"
                              strokeWidth={stroke}
                              fill="none"
                            />
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={r}
                              stroke={statusColor}
                              strokeWidth={stroke}
                              fill="none"
                              strokeDasharray={`${c} ${c}`}
                              strokeDashoffset={`${c - dash}`}
                              strokeLinecap="round"
                              transform={`rotate(-90 ${size / 2} ${size / 2})`}
                            />
                          </svg>
                          <div className="equipment-number">{equipNumber}</div>
                        </div>
                        <div className={styles.equipmentTime}>
                          {secToMMSS(remaining)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}
