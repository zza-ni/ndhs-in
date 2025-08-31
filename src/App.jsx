import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import NoticePage from './pages/NoticePage';
import BoardPage from './pages/BoardPage';
import SettingsPage from './pages/SettingsPage';

// 페이지 분리로 유틸/메뉴 렌더 로직은 MenuPage 내부로 이동했습니다.

function BottomNav() {
  // 홈을 가운데(3번째)로 배치
  const items = [
    { to: '/board', label: '게시판' },
    { to: '/notice', label: '공지사항' },
    { to: '/', label: '홈' },
    { to: '/menu', label: '식단표' },
    { to: '/settings', label: '외박' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          onClick={() => {
            if ('vibrate' in navigator) navigator.vibrate(50);
          }}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="nav-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return (
    <button id="theme-toggle-btn" aria-label="Toggle theme" title="테마 전환" onClick={toggle}>
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}

// usePWAInstallPrompt와 MenuPage 구현은 페이지로 분리되었습니다.

function SimplePage({ title, children }) {
  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도밥 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>{title}</h2>
      </div>
      <div className="container" style={{ padding: '16px' }}>
        {children || <p>남도밥에 오신 것을 환영합니다.</p>}
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
        {/* 홈 화면: 메뉴 표시 없음 */}
        <Route path="/" element={<SimplePage title="홈" />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/notice/:postId" element={<NoticePage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<SimplePage title="페이지를 찾을 수 없습니다" />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
