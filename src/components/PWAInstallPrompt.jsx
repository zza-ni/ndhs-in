import React from "react";
import { useToast } from "./ui/Toast.jsx";

// Safe UA helpers (avoid crashing when window/navigator are unavailable)
const getUA = () => {
  try {
    return (typeof navigator !== "undefined" && navigator.userAgent) || "";
  } catch {
    return "";
  }
};

const isiOS = () => /iphone|ipad|ipod/i.test(getUA());
const isAndroid = () => /android/i.test(getUA());
// Naver/Kakao in-app browser detector
const isNAKAInAppBroswer = () => /(KAKAOTALK|NAVER)/i.test(getUA());
const isSafari = () => {
  const ua = getUA();
  return (
    isiOS() &&
    /Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !isNAKAInAppBroswer() &&
    !/FBAV|Line/i.test(ua)
  );
};

// Capture early fired beforeinstallprompt events so we don't miss them on mobile
let earlyBIPEvent = null;
// Track if we have already consumed (prompted) once on this page load
if (typeof window !== "undefined" && !window.__pwaInstallUsed) {
  window.__pwaInstallUsed = false;
}
if (typeof window !== "undefined") {
  window.addEventListener(
    "beforeinstallprompt",
    (e) => {
      try {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
      } catch {}
      earlyBIPEvent = e;
    },
    { once: true }
  );
}

export default function PWAInstallPrompt() {
  const toast = useToast();
  const [deferred, setDeferred] = React.useState(null);
  const [showSnack, setShowSnack] = React.useState(false);
  const [showIOSModal, setShowIOSModal] = React.useState(false);
  const snackTimerRef = React.useRef(null);
  const installingRef = React.useRef(false);
  const fallbackTimerRef = React.useRef(null);
  const HIDE_KEY = "pwa-snackbar-hide-until";

  const getHideUntil = React.useCallback(() => {
    try {
      if (typeof window === "undefined") return 0;
      const raw = window.localStorage.getItem(HIDE_KEY);
      const ts = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(ts) ? ts : 0;
    } catch {
      return 0;
    }
  }, []);

  const isSuppressedNow = React.useCallback(() => {
    try {
      return Date.now() < getHideUntil();
    } catch {
      return false;
    }
  }, [getHideUntil]);

  const suppressForHours = (hours) => {
    try {
      if (typeof window === "undefined") return;
      const until = Date.now() + hours * 60 * 60 * 1000;
      window.localStorage.setItem(HIDE_KEY, String(until));
    } catch {}
  };

  const isInstalled = React.useMemo(() => {
    try {
      const dm =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        typeof navigator !== "undefined" &&
        "standalone" in navigator &&
        navigator.standalone;
      const twa =
        typeof document !== "undefined" &&
        document.referrer &&
        document.referrer.startsWith("android-app://");
      return Boolean(dm || iosStandalone || twa);
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    // Do not show snackbar in installed PWA / TWA
    if (isInstalled) return;

    // iOS fallback: show snackbar after a short delay with manual install guidance
    if (isiOS()) {
      if (snackTimerRef.current) clearTimeout(snackTimerRef.current);
      snackTimerRef.current = setTimeout(() => {
        if (!isSuppressedNow()) setShowSnack(true);
      }, 3000);
    }
    // Android fallback: show snackbar after a delay if event hasn't fired yet
    if (!isiOS()) {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        if (!deferred && !isSuppressedNow()) setShowSnack(true);
      }, 3000);
    }

    const onBefore = (e) => {
      try {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
      } catch {}
      setDeferred(e);
      // Delay showing the snackbar to avoid popping in immediately on load
      if (snackTimerRef.current) clearTimeout(snackTimerRef.current);
      snackTimerRef.current = setTimeout(() => {
        if (!isSuppressedNow()) setShowSnack(true);
      }, 3000);
    };
    const onInstalled = () => {
      setDeferred(null);
      setShowSnack(false);
      setShowIOSModal(false);
      if (snackTimerRef.current) {
        clearTimeout(snackTimerRef.current);
        snackTimerRef.current = null;
      }
    };
    // Consume early event if it already fired before mount
    if (earlyBIPEvent && !deferred) {
      onBefore(earlyBIPEvent);
      earlyBIPEvent = null;
    }
    // Also listen for future events (if not already handled)
    window.addEventListener("beforeinstallprompt", onBefore, { once: true });
    window.addEventListener("appinstalled", onInstalled);
    const onSWMessage = (e) => {
      if (e && e.data && e.data.type === "OPEN_URL" && e.data.url) {
        try {
          window.location.href = e.data.url;
        } catch {}
      }
    };
    navigator.serviceWorker &&
      navigator.serviceWorker.addEventListener &&
      navigator.serviceWorker.addEventListener("message", onSWMessage);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
      try {
        navigator.serviceWorker &&
          navigator.serviceWorker.removeEventListener &&
          navigator.serviceWorker.removeEventListener("message", onSWMessage);
      } catch {}
      if (snackTimerRef.current) {
        clearTimeout(snackTimerRef.current);
        snackTimerRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [isSuppressedNow]);

  const requestInstall = async () => {
    if (isiOS()) {
      setShowIOSModal(true);
      return;
    }
    // Android Naver/Kakao in-app browsers: open externally via Chrome (fallback Samsung Internet)
    if (isAndroid() && isNAKAInAppBroswer()) {
      // Show a quick guidance toast, then attempt external open shortly after
      toast?.show("설치를 위해 크롬으로 이동합니다.", {
        type: "info",
        duration: 4000,
      });
      setTimeout(() => {
        try {
          openInChrome();
        } catch {}
      }, 600);
      return;
    }
    // If we've already used the install prompt on this page and no deferred/early event is available anymore,
    // we must reload to obtain a fresh beforeinstallprompt event (Chrome policy: one prompt per page load).
    if (
      !deferred &&
      !earlyBIPEvent &&
      typeof window !== "undefined" &&
      window.__pwaInstallUsed
    ) {
      try {
        sessionStorage.setItem("pwaInstallAfterReload", "1");
        // Reuse existing preloader if present
        try {
          sessionStorage.setItem("appReloading", "1");
          const pre = document.getElementById("preloader");
          if (pre) pre.classList.add("visible");
        } catch {}
      } catch {}
      window.location.reload();
      return;
    }
    // Android: if event not yet available, wait briefly for it then prompt immediately
    if (!deferred) {
      if (installingRef.current) return; // avoid duplicate waits
      installingRef.current = true;
      const eventOrNull = await new Promise((resolve) => {
        if (earlyBIPEvent) {
          const e = earlyBIPEvent;
          earlyBIPEvent = null;
          resolve(e);
          return;
        }
        const handler = (e) => {
          try {
            if (e && typeof e.preventDefault === "function") e.preventDefault();
          } catch {}
          window.removeEventListener("beforeinstallprompt", handler);
          resolve(e);
        };
        window.addEventListener("beforeinstallprompt", handler, { once: true });
        // timeout fallback: give up silently after 6000ms
        setTimeout(() => {
          try {
            window.removeEventListener("beforeinstallprompt", handler);
          } catch {}
          resolve(null);
        }, 6000);
      });
      installingRef.current = false;
      if (!eventOrNull) return;
      setDeferred(eventOrNull);
    }
    try {
      deferred.prompt();
      await deferred.userChoice;
      if (typeof window !== "undefined") {
        window.__pwaInstallUsed = true;
        try {
          sessionStorage.setItem("pwaInstallUsed", "1");
        } catch {}
      }
    } finally {
      setDeferred(null);
      setShowSnack(false);
    }
  };

  // Allow external triggers (e.g., Settings overlay) to invoke the same install flow
  React.useEffect(() => {
    const onTrigger = (e) => {
      try {
        e && e.stopPropagation && e.stopPropagation();
      } catch {}
      requestInstall();
    };
    window.addEventListener("pwa:install", onTrigger);
    return () => window.removeEventListener("pwa:install", onTrigger);
  }, [requestInstall]);

  // If we reloaded explicitly to retry install, show snackbar immediately (skip delay)
  React.useEffect(() => {
    try {
      if (
        !isInstalled &&
        sessionStorage.getItem("pwaInstallAfterReload") === "1"
      ) {
        sessionStorage.removeItem("pwaInstallAfterReload");
        // Show snackbar right away; earlyBIPEvent may arrive shortly (captured globally)
        setShowSnack(true);
      }
    } catch {}
  }, [isInstalled]);

  const closeSnackbar = (e) => {
    try {
      e && e.stopPropagation && e.stopPropagation();
    } catch {}
    setShowSnack(false);
    // Remember dismissal for 12 hours
    suppressForHours(12);
    // Clear any pending timers that might reshow it quickly on this session
    if (snackTimerRef.current) {
      clearTimeout(snackTimerRef.current);
      snackTimerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  // Deep-link opener: try Chrome intent, then Samsung Internet intent as fallback
  const openInChrome = React.useCallback(() => {
    try {
      const href = window.location.href;
      const u = new URL(href);
      const scheme = (u.protocol || "https:").replace(":", "");
      const base = `${u.host}${u.pathname}${u.search}${u.hash}`;

      const chromeIntent = `intent://${base}#Intent;scheme=${scheme};package=com.android.chrome;end`;
      const samsungIntent = `intent://${base}#Intent;scheme=${scheme};package=com.sec.android.app.sbrowser;end`;

      let leftPage = false;
      const onVisibility = () => {
        if (document.hidden) leftPage = true;
      };
      document.addEventListener("visibilitychange", onVisibility, {
        passive: true,
      });

      // Try Chrome first
      window.location.href = chromeIntent;

      // If still here after 900ms, try Samsung Internet
      const t1 = setTimeout(() => {
        if (!leftPage) {
          window.location.href = samsungIntent;
        }
      }, 900);

      // Cleanup listener later, and if still here, notify user
      setTimeout(() => {
        try {
          document.removeEventListener("visibilitychange", onVisibility);
        } catch {}
        clearTimeout(t1);
        if (!leftPage) {
          toast?.show(
            "외부 브라우저로 열 수 없어요. 링크를 복사해 크롬에서 열어주세요.",
            { type: "error", duration: 6000 }
          );
        }
      }, 3000);
    } catch (err) {
      // Best-effort graceful no-op
    }
  }, []);

  return (
    <>
      {/* Snackbar */}
      {showSnack && (
        <div id="pwa-snackbar">
          <div className="snackbar-content">
            <div>
              <strong>홈 화면에 행운의 아이콘을</strong>
              <div className="snackbar-desc">
                남도인🍀을 심어보세요!
                <br />
              </div>
            </div>
            <button id="snackbar-install-btn" onClick={requestInstall}>
              설치
            </button>
            <button
              id="snackbar-close-btn"
              aria-label="닫기"
              title="닫기"
              onClick={closeSnackbar}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 22,
                height: 22,
                border: "none",
                background: "transparent",
                color: "#ffffffcc",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
                cursor: "pointer",
                zIndex: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* iOS Install modal */}
      {showIOSModal && (
        <div
          className="modal"
          id="modal-ios-install"
          style={{ display: "flex" }}
        >
          <div className="modal-content">
            <img
              src="/src/ios-app-icon.png"
              alt="앱 아이콘"
              width="48"
              height="48"
            />
            <h2>남도인</h2>
            <div className="modal-guide">
              {isSafari() ? (
                <p>
                  <img
                    src="/src/ios-share.png"
                    alt="공유 버튼"
                    width="17"
                    style={{ verticalAlign: "middle" }}
                  />{" "}
                  &nbsp; 버튼을 누르고{" "}
                  <b style={{ color: "blue" }}>홈 화면에 추가하기</b>
                </p>
              ) : isNAKAInAppBroswer() ? (
                <div>
                  <p>
                    1.&nbsp;&nbsp;
                    <img
                      src="/src/ios-share.png"
                      alt="공유 버튼"
                      width="15"
                      style={{ verticalAlign: "middle" }}
                    />{" "}
                    &nbsp; 버튼을 누르고{" "}
                    <b style={{ color: "blue" }}>Safari로 열기</b>
                  </p>
                  <p>
                    2.&nbsp;&nbsp;
                    <img
                      src="/src/ios-share.png"
                      alt="공유 버튼"
                      width="15"
                      style={{ verticalAlign: "middle" }}
                    />{" "}
                    &nbsp; 버튼을 누르고{" "}
                    <b style={{ color: "blue" }}>홈 화면에 추가하기</b>
                  </p>
                </div>
              ) : (
                <div>
                  <p>
                    1. 링크 복사 후,&nbsp;
                    <b style={{ color: "blue" }}>Safari에서 열기</b>
                  </p>
                  <p>
                    2.&nbsp;&nbsp;
                    <img
                      src="/src/ios-share.png"
                      alt="공유 버튼"
                      width="15"
                      style={{ verticalAlign: "middle" }}
                    />{" "}
                    &nbsp; 버튼을 누르고{" "}
                    <b style={{ color: "blue" }}>홈 화면에 추가하기</b>
                  </p>
                </div>
              )}
            </div>
            <button
              className="modal-close"
              onClick={() => setShowIOSModal(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
