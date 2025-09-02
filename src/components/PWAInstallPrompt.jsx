import React from 'react';

// Safe UA helpers (avoid crashing when window/navigator are unavailable)
const getUA = () => {
  try {
    return (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  } catch {
    return '';
  }
};
const isiOS = () => /iphone|ipad|ipod/i.test(getUA());
const isKakaoInAppBrowser = () => /KAKAOTALK/i.test(getUA());
const isSafari = () => {
  const ua = getUA();
  return isiOS() && /Safari/i.test(ua) && !/CriOS/i.test(ua) && !isKakaoInAppBrowser() && !/FBAV|Line/i.test(ua);
};

// Capture early fired beforeinstallprompt events so we don't miss them on mobile
let earlyBIPEvent = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'beforeinstallprompt',
    (e) => {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch {}
      earlyBIPEvent = e;
    },
    { once: true }
  );
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = React.useState(null);
  const [showSnack, setShowSnack] = React.useState(false);
  const [showIOSModal, setShowIOSModal] = React.useState(false);
  const snackTimerRef = React.useRef(null);
  const installingRef = React.useRef(false);
  const fallbackTimerRef = React.useRef(null);

  const isInstalled = React.useMemo(() => {
    try {
      const dm = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = typeof navigator !== 'undefined' && 'standalone' in navigator && navigator.standalone;
      const twa = typeof document !== 'undefined' && document.referrer && document.referrer.startsWith('android-app://');
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
      snackTimerRef.current = setTimeout(() => setShowSnack(true), 1500);
    }
    // Android fallback: show snackbar after a delay if event hasn't fired yet
    if (!isiOS()) {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = setTimeout(() => {
        if (!deferred) setShowSnack(true);
      }, 1500);
    }

    const onBefore = (e) => {
      try {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
      } catch {}
      setDeferred(e);
      // Delay showing the snackbar to avoid popping in immediately on load
      if (snackTimerRef.current) clearTimeout(snackTimerRef.current);
      snackTimerRef.current = setTimeout(() => setShowSnack(true), 1500);
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
    window.addEventListener('beforeinstallprompt', onBefore, { once: true });
    window.addEventListener('appinstalled', onInstalled);
    return () => {
  window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
      if (snackTimerRef.current) {
        clearTimeout(snackTimerRef.current);
        snackTimerRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, []);

  const requestInstall = async () => {
    if (isiOS()) {
      setShowIOSModal(true);
      return;
    }
    // Android: if event not yet available, wait briefly for it then prompt immediately
    if (!deferred) {
      if (installingRef.current) return; // avoid duplicate waits
      installingRef.current = true;
      const eventOrNull = await new Promise((resolve) => {
        if (earlyBIPEvent) {
          const e = earlyBIPEvent; earlyBIPEvent = null; resolve(e); return;
        }
        const handler = (e) => {
          try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch {}
          window.removeEventListener('beforeinstallprompt', handler);
          resolve(e);
        };
        window.addEventListener('beforeinstallprompt', handler, { once: true });
        // timeout fallback: give up silently after 6000ms
        setTimeout(() => {
          try { window.removeEventListener('beforeinstallprompt', handler); } catch {}
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
    } finally {
      setDeferred(null);
      setShowSnack(false);
    }
  };

  return (
    <>
      {/* Snackbar */}
      {showSnack && (
        <div id="pwa-snackbar">
          <div className="snackbar-content">
            <div>
              <strong>홈 화면에 행운의 아이콘을</strong>
              <div className="snackbar-desc">남도인🍀을 심어보세요!<br /></div>
            </div>
            <button id="snackbar-install-btn" onClick={requestInstall}>설치</button>
          </div>
        </div>
      )}

      {/* iOS Install modal */}
      {showIOSModal && (
        <div className="modal" id="modal-ios-install" style={{ display: 'flex' }}>
          <div className="modal-content">
            <img src="/src/ios-app-icon.png" alt="앱 아이콘" width="48" height="48" />
            <h2>남도인</h2>
            <div className="modal-guide">
              {isSafari() ? (
                <p>
                  <img src="/src/ios-share.png" alt="공유 버튼" width="17" style={{ verticalAlign: 'middle' }} /> &nbsp; 버튼을 누르고{' '}
                  <b style={{ color: 'blue' }}>홈 화면에 추가하기</b>
                </p>
              ) : (
                <div>
                  <p>1.&nbsp;&nbsp;<img src="/src/ios-share.png" alt="공유 버튼" width="15" style={{ verticalAlign: 'middle' }} /> &nbsp; 버튼을 누르고 <b style={{ color: 'blue' }}>Safari로 열기</b></p>
                  <p>2.&nbsp;&nbsp;<img src="/src/ios-share.png" alt="공유 버튼" width="15" style={{ verticalAlign: 'middle' }} /> &nbsp; 버튼을 누르고 <b style={{ color: 'blue' }}>홈 화면에 추가하기</b></p>
                </div>
              )}
            </div>
            <button className="modal-close" onClick={() => setShowIOSModal(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
