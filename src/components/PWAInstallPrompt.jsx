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

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = React.useState(null);
  const [showSnack, setShowSnack] = React.useState(false);
  const [showIOSModal, setShowIOSModal] = React.useState(false);
  const snackTimerRef = React.useRef(null);

  React.useEffect(() => {
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
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
      if (snackTimerRef.current) {
        clearTimeout(snackTimerRef.current);
        snackTimerRef.current = null;
      }
    };
  }, []);

  const requestInstall = async () => {
    if (isiOS()) {
      setShowIOSModal(true);
      return;
    }
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShowSnack(false);
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
