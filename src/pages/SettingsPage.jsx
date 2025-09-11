import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import Divider from "../components/ui/Divider";
import seg from "../components/ui/SegmentedControl.module.css";
import form from "../components/ui/Form.module.css";
import { TagChip } from "../components/ui/Chip";
import {
  requestPushPermission,
  tryEnsurePushRegistered,
  disablePush,
} from "../initApp";
import { clearBoardListCache } from "../lib/boardCache";
import { clearNoticeListCache } from "../lib/noticeCache";

export default function SettingsPage() {
  // PWA 설치 여부
  const [isPWA, setIsPWA] = useState(() => {
    try {
      const mql =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)");
      const standalone = !!(mql && mql.matches);
      const iosStandalone =
        typeof navigator !== "undefined" &&
        "standalone" in navigator &&
        navigator.standalone;
      const twa =
        typeof document !== "undefined" &&
        document.referrer &&
        document.referrer.startsWith("android-app://");
      return Boolean(standalone || iosStandalone || twa);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    // One more pass after mount in case of late media query resolution
    try {
      const mql =
        window.matchMedia && window.matchMedia("(display-mode: standalone)");
      const standalone = !!(mql && mql.matches);
      const iosStandalone =
        typeof navigator !== "undefined" &&
        "standalone" in navigator &&
        navigator.standalone;
      const twa =
        typeof document !== "undefined" &&
        document.referrer &&
        document.referrer.startsWith("android-app://");
      setIsPWA(Boolean(standalone || iosStandalone || twa));
    } catch {}
  }, []);
  // 테마: light | dark | system
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );
  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "system") {
      const mql =
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      if (mql && mql.matches)
        document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // 푸시 알림 상태
  const [pushStatus, setPushStatus] = useState("확인 중");
  useEffect(() => {
    const hasFCM = !!localStorage.getItem("savedPushToken");
    if (!("Notification" in window)) {
      setPushStatus("미지원");
      return;
    }
    if (hasFCM) {
      setPushStatus("등록됨");
      return;
    }
    const perm = Notification.permission;
    if (perm === "granted") setPushStatus("허용됨");
    else if (perm === "denied") setPushStatus("차단됨");
    else setPushStatus("미설정");
  }, []);

  const onEnablePush = async () => {
    const ok = await requestPushPermission();
    setPushStatus(
      ok ? "등록됨" : Notification.permission === "denied" ? "차단됨" : "허용됨"
    );
  };

  const onRetryRegister = async () => {
    const ok = await tryEnsurePushRegistered();
    setPushStatus(
      ok
        ? "등록됨"
        : Notification.permission === "granted"
        ? "허용됨"
        : Notification.permission === "denied"
        ? "차단됨"
        : "미설정"
    );
  };

  const onClearCaches = () => {
    clearBoardListCache();
    clearNoticeListCache();
    alert("캐시를 비웠어요.");
  };

  return (
    <main className="main-content page-content">
      <PageHeader title="설정" />
      <div
        className="container"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* 테마 설정 */}
        <Card>
          <CardHeader style={{ padding: "10px 15px" }}>
            <CardTitle>테마</CardTitle>
            <div
              className={seg.root}
              role="tablist"
              aria-label="테마 선택"
              style={{ margin: 0, minWidth: 130 }}
            >
              <input
                className={seg.radio}
                type="radio"
                id="theme-light"
                name="theme"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
              />
              <label
                className={seg.label}
                htmlFor="theme-light"
                role="tab"
                aria-selected={theme === "light"}
                tabIndex={0}
              >
                라이트
              </label>
              <input
                className={seg.radio}
                type="radio"
                id="theme-dark"
                name="theme"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
              />
              <label
                className={seg.label}
                htmlFor="theme-dark"
                role="tab"
                aria-selected={theme === "dark"}
                tabIndex={0}
              >
                다크
              </label>
              {/* <input
                className={seg.radio}
                type="radio"
                id="theme-system"
                name="theme"
                checked={theme === "system"}
                onChange={() => setTheme("system")}
              />
              <label
                className={seg.label}
                htmlFor="theme-system"
                role="tab"
                aria-selected={theme === "system"}
                tabIndex={0}
              >
                시스템
              </label> */}
            </div>
          </CardHeader>
        </Card>

        <Divider />
        {/* 알림 설정 */}
        <div style={{ position: "relative" }}>
          {/* Overlay blocks interaction when not a PWA */}
          {!isPWA && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.7)",
                zIndex: 2,
                pointerEvents: "auto",
              }}
              onClick={() => {
                try {
                  window.dispatchEvent(new Event("pwa:install"));
                } catch {
                  // Fallback: noop
                }
              }}
            >
              <div
                style={{
                  background: "var(--white, #fff)",
                  color: "#111",
                  padding: "10px 14px",
                  borderRadius: 12,
                  boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                앱을 먼저 설치해주세요!
              </div>
            </div>
          )}
          <Card>
            <CardHeader style={{ padding: "10px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CardTitle>알림</CardTitle>
                <TagChip style={{ cursor: "default" }}>{pushStatus}</TagChip>
              </div>
              <div
                className={seg.root}
                role="tablist"
                aria-label="알림 설정"
                style={{ margin: 0, minWidth: 130 }}
              >
                {/* 켜기 */}
                <input
                  className={seg.radio}
                  type="radio"
                  id="notif-on"
                  name="notif"
                  checked={pushStatus === "등록됨"}
                  onChange={onEnablePush}
                />
                <label
                  className={seg.label}
                  htmlFor="notif-on"
                  role="tab"
                  aria-selected={pushStatus === "등록됨"}
                >
                  켜기
                </label>
                {/* 끄기 */}
                <input
                  className={seg.radio}
                  type="radio"
                  id="notif-off"
                  name="notif"
                  checked={pushStatus !== "등록됨"}
                  onChange={async () => {
                    try {
                      await disablePush();
                    } catch {}
                    // 권한은 유지될 수 있으므로 상태는 '허용됨'으로 둠
                    setPushStatus(
                      typeof Notification !== "undefined" &&
                        Notification.permission === "granted"
                        ? "허용됨"
                        : "미설정"
                    );
                  }}
                />
                <label
                  className={seg.label}
                  htmlFor="notif-off"
                  role="tab"
                  aria-selected={pushStatus !== "등록됨"}
                >
                  끄기
                </label>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Divider />
        {/* 데이터 (한 줄) */}
        <Card>
          <CardHeader
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 15px",
            }}
          >
            <CardTitle style={{ margin: 0 }}>데이터</CardTitle>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className={form.btn} onClick={onClearCaches}>
                캐시 비우기
              </button>
            </div>
          </CardHeader>
        </Card>

        <Divider />
        {/* 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>정보</CardTitle>
          </CardHeader>
          <CardBody style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">앱 이름</span>
              <span>남도인</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">버전</span>
              <span>v1</span>
            </div>
          </CardBody>
        </Card>

        <Divider />
        {/* 정보 */}
        <Card
          onClick={() => {
            window.open(
              "https://portal.ndhs.or.kr/index",
              "_blank",
              "noopener"
            );
          }}
          style={{ cursor: "pointer" }}
        >
          <CardHeader style={{ padding: "14px 16px" }}>
            <CardTitle>학사관리시스템 바로가기</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
