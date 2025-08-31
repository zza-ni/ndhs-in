import React, { useEffect, useState } from 'react';
import { requestPushPermission, trySaveTokenIfGranted } from '../initApp';

function ThemeToggleInline() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  return (
    <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
      테마 전환: {theme === 'dark' ? '다크' : '라이트'}
    </button>
  );
}

export default function SettingsPage() {
  const [pushStatus, setPushStatus] = useState('확인 중');

  useEffect(() => {
    const saved = localStorage.getItem('savedPushToken');
    if (!('Notification' in window)) setPushStatus('미지원');
    else if (saved) setPushStatus('등록됨');
    else setPushStatus(Notification.permission === 'granted' ? '등록 대기' : '미허용');
  }, []);

  const onEnablePush = async () => {
    const ok = await requestPushPermission();
    setPushStatus(ok ? '등록됨' : '미허용');
  };

  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>외박/설정</h2>
      </div>
      <div className="container settings">
        <section>
          <h3>알림 설정</h3>
          <p>상태: {pushStatus}</p>
          <button onClick={onEnablePush}>푸시 알림 허용</button>
        </section>
        <section>
          <h3>테마</h3>
          <ThemeToggleInline />
        </section>
      </div>
    </main>
  );
}
