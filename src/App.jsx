import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import HomePage from './pages/HomePage';
import OvernightPage from './pages/OvernightPage';
import BoardPage from './pages/BoardPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';

// 페이지 분리로 유틸/메뉴 렌더 로직은 MenuPage 내부로 이동했습니다.

// 공통 테마 적용 함수: 'light' | 'dark' | 'system'
function applyTheme(mode) {
  try {
    if (mode === 'system') {
      const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (mql && mql.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
  } catch { }
}

function BottomNav() {
  const location = useLocation();
  const items = [
    {
      to: '/board',
      label: '게시판',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
          <rect x="7" y="9" width="10" height="2" rx="1" fill="currentColor" />
          <rect x="7" y="13" width="6" height="2" rx="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      to: '/overnight',
      label: '외박',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2v4m8-4v4" stroke="currentColor" strokeWidth="2" />
          <rect x="7" y="11" width="2" height="2" rx="1" fill="currentColor" />
          <rect x="11" y="11" width="2" height="2" rx="1" fill="currentColor" />
          <rect x="15" y="11" width="2" height="2" rx="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      to: '/',
      label: '홈',
      icon: (
        <svg className="nav-icon" viewBox="0 0 192 192" fill="none" aria-hidden="true">
          <path d="M41.733 160.134v-59.2H21.999L96 31.865l74 69.067h-19.733v59.201H110.8v-44.4H81.2v44.4z" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      ),
    },
    {
      to: '/menu',
      label: '식단표',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5.5 20l4-5 1.8 2.3-4.2 5.2c-1.2 1.5-3.2-0.5-1.6-2.5Z" fill="currentColor" />
          <path d="M11.1 8.7c.4-1.2.2-2.2-.9-3.4L5.7 2.1c-.5-.6-1.5.2-1.1.9l2.7 3.3c.5.6-.5 1.5-1.1.8L2.9 3.7c-.5-.6-1.5.2-1 1l3.1 3.8c.5.6-.5 1.5-1.1.8L1.1 5.7c-.4-.5-1.1-.2-1.3.4-.2.6.3 1.1.6 1.6l4.2 5c1 .9 2.1 1.5 3.4 1.1.2-.1.4-.2.7-.4l8.7 11.2c.5.6 1.4.7 2 .2l.1-.1c.7-.6.8-1.6.2-2.3l-8.2-10.6c.3-.3.5-.6.6-.9Z" fill="currentColor" />
          <path d="M13.2 11.1l1.4-1.7c-2.2-3.7 2.7-8.1 5.7-5.6 3.1 2.7-1.2 8.5-3.7 7.3l-1.7 2.2-1.7-2.2Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: '설정',
      icon: (
        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 15v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => {
        if (it.to === '/board') {
          const active = location.pathname.startsWith('/board') || location.pathname.startsWith('/notice');
          return (
            <NavLink key={it.to} to="/notice" className={`nav-item${active ? ' active' : ''}`} onClick={() => { if ('vibrate' in navigator) navigator.vibrate(50); }} aria-label={it.label}>
              {it.icon}
              <span className="nav-label">{it.label}</span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate(50);
            }}
            aria-label={it.label}
          >
            {it.icon}
            <span className="nav-label">{it.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}


// usePWAInstallPrompt와 MenuPage 구현은 페이지로 분리되었습니다.

function SimplePage({ title, children }) {
  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}>
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>{title}</h2>
      </div>
      <div className="container" style={{ padding: '16px' }}>
        {children || <p>남도인에 오신 것을 환영합니다.</p>}
      </div>
    </main>
  );
}

function AppShell() {
  const location = useLocation();
  // 루트/메뉴/그 외 라우트에서 공통 네비게이션 노출
  const showNav = true;
  return (
    <>
      <Routes>
        {/* 홈 화면: 카드 3종 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/notice" element={<BoardPage />} />
        <Route path="/notice/:postId" element={<BoardPage />} />
        <Route path="/overnight" element={<OvernightPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/board/:postId" element={<BoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<SimplePage title="페이지를 찾을 수 없습니다" />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  // 초기 테마 설정 및 시스템 변경 동기화
  React.useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system';
    applyTheme(saved);

    // storage 이벤트로 다른 탭의 변경사항 동기화
    const onStorage = (e) => {
      if (e.key === 'theme') {
        const newVal = e.newValue || 'system';
        applyTheme(newVal);
      }
    };
    window.addEventListener('storage', onStorage);

    // 시스템 테마 변경 감지 (system 모드일 때만 반영)
    const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const onMqlChange = () => {
      const cur = localStorage.getItem('theme') || 'system';
      if (cur === 'system') applyTheme('system');
    };
    if (mql && 'addEventListener' in mql) mql.addEventListener('change', onMqlChange);
    else if (mql && 'addListener' in mql) mql.addListener(onMqlChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (mql && 'removeEventListener' in mql) mql.removeEventListener('change', onMqlChange);
      else if (mql && 'removeListener' in mql) mql.removeListener(onMqlChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
