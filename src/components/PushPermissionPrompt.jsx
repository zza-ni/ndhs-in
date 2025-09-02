import React from 'react';

export default function PushPermissionPrompt() {
  const [open, setOpen] = React.useState(false);
  const [asking, setAsking] = React.useState(false);

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
    let saved = null;
    try {
      saved = localStorage.getItem('savedPushToken');
    } catch {
      saved = null;
    }
    if (saved) return; // already registered
    if (!isInstalled) return; // only prompt inside installed PWA/TWA
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
  import('../initApp').then((m) => m.trySaveTokenIfGranted && m.trySaveTokenIfGranted()).catch(() => {});
        return;
      }
      if (Notification.permission === 'default') {
        const shownKey = 'pushPromptShownInApp';
        const alreadyShown = (() => { try { return localStorage.getItem(shownKey); } catch { return null; } })();
        if (!alreadyShown) {
          try { localStorage.setItem(shownKey, '1'); } catch {}
          setOpen(true);
        }
      }
    } catch {}
  }, []);

  const onRequest = async () => {
    if (asking) return;
    setAsking(true);
    try {
      const mod = await import('../initApp');
      if (mod && mod.requestPushPermission) {
        await mod.requestPushPermission();
      }
    } finally {
      setOpen(false); // always close after attempting permission
      setAsking(false);
    }
  };

  if (!open) return null;
  return (
    <div className="modal" id="modal-get-push" style={{ display: 'flex' }}>
      <div className="modal-content">
        <h2>알림 받기</h2>
        <p>공지사항을 받아보세요!</p>
        <button id="btnRequestPush" className="modal-close" onClick={onRequest}>
          닫기
        </button>
      </div>
    </div>
  );
}
