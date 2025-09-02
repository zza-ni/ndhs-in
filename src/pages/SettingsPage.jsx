import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { TagChip } from '../components/ui/Chip';
import { requestPushPermission, tryEnsurePushRegistered } from '../initApp';
import { clearBoardListCache } from '../lib/boardCache';
import { clearNoticeListCache } from '../lib/noticeCache';

export default function SettingsPage() {
  // 테마: light | dark | system
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'system') {
      const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mql && mql.matches) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // 푸시 알림 상태
  const [pushStatus, setPushStatus] = useState('확인 중');
  useEffect(() => {
    const hasFCM = !!localStorage.getItem('savedPushToken');
    const hasWeb = !!localStorage.getItem('savedWebSub');
    if (!('Notification' in window)) {
      setPushStatus('미지원');
      return;
    }
    if (hasFCM || hasWeb) {
      setPushStatus('등록됨');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') setPushStatus('등록 대기');
    else if (perm === 'denied') setPushStatus('미허용');
    else setPushStatus('미설정');
  }, []);

  const onEnablePush = async () => {
    const ok = await requestPushPermission();
    setPushStatus(ok ? '등록됨' : (Notification.permission === 'denied' ? '미허용' : '등록 대기'));
  };

  const onRetryRegister = async () => {
    const ok = await tryEnsurePushRegistered();
    setPushStatus(ok ? '등록됨' : (Notification.permission === 'granted' ? '등록 대기' : (Notification.permission === 'denied' ? '미허용' : '미설정')));
  };

  const onClearCaches = () => {
    clearBoardListCache();
    clearNoticeListCache();
    alert('캐시를 비웠어요.');
  };

  return (
    <main className="main-content page-content">
      <PageHeader title="설정" />
  <div className="container" style={{ display: 'grid', gap: 6 }}>
        {/* 테마 (한 줄) */}
  <Card style={{ height: 70, margin: 0 }}>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <CardTitle style={{ margin: 0 }}>테마</CardTitle>
            <div className="segmented-control" role="tablist" aria-label="테마 선택" style={{ margin: 0, width: '50%' }}>
              <input type="radio" id="theme-light" name="theme" checked={theme === 'light'} onChange={() => setTheme('light')} />
              <label htmlFor="theme-light" role="tab" aria-selected={theme === 'light'} tabIndex={0}>라이트</label>
              <input type="radio" id="theme-dark" name="theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
              <label htmlFor="theme-dark" role="tab" aria-selected={theme === 'dark'} tabIndex={0}>다크</label>
              <input type="radio" id="theme-system" name="theme" checked={theme === 'system'} onChange={() => setTheme('system')} />
              <label htmlFor="theme-system" role="tab" aria-selected={theme === 'system'} tabIndex={0}>시스템</label>
            </div>
          </CardHeader>
        </Card>

        {/* 알림 설정 (한 줄) */}
  <Card style={{ height: 70, margin: 0 }}>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CardTitle style={{ margin: 0 }}>알림</CardTitle>
              <TagChip style={{ cursor: 'default' }}>{pushStatus}</TagChip>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={onEnablePush} disabled={pushStatus === '등록됨'}>푸시 알림 허용</button>
              <button className="btn" onClick={onRetryRegister}>등록 재시도</button>
            </div>
          </CardHeader>
        </Card>

        {/* 데이터 (한 줄) */}
  <Card style={{ height: 70, margin: 0 }}>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <CardTitle style={{ margin: 0 }}>데이터</CardTitle>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn" onClick={onClearCaches}>캐시 비우기</button>
            </div>
          </CardHeader>
        </Card>

        {/* 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>정보</CardTitle>
          </CardHeader>
          <CardBody style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">앱 이름</span>
              <span>남도인</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="muted">버전</span>
              <span>v1</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
