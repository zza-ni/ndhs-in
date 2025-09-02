import React from 'react';
import { requestPushPermission, trySaveTokenIfGranted } from '../initApp';

export default function PushPermissionPrompt() {
  const [open, setOpen] = React.useState(false);
  const [asked, setAsked] = React.useState(false);

  React.useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem('savedPushToken');
    } catch {
      saved = null;
    }
    if (saved) return; // already registered
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      setOpen(true);
    } else if (Notification.permission === 'granted') {
      // Try saving token when returning
      trySaveTokenIfGranted();
    }
  }, []);

  const onRequest = async () => {
    if (asked) return setOpen(false);
    setAsked(true);
    const ok = await requestPushPermission();
    if (ok) setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="modal" id="modal-get-push" style={{ display: 'flex' }}>
      <div className="modal-content">
        <h2>알림 받기</h2>
        <p>공지사항을 받아보세요!</p>
        <button id="btnRequestPush" className="modal-close" onClick={onRequest}>
          {asked ? '닫기' : '허용 요청'}
        </button>
      </div>
    </div>
  );
}
