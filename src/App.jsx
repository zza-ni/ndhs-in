import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import navStyles from './components/BottomNav.module.css';
import MenuPage from './pages/MenuPage';
import HomePage from './pages/HomePage';
import OvernightPage from './pages/OvernightPage';
import BoardPage from './pages/BoardPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PushPermissionPrompt from './components/PushPermissionPrompt';
import AdminPushTest from './pages/AdminPushTest';

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
          <g transform="translate(12 12) scale(1.2) translate(-12 -12)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.0175 19C10.6601 19 10.3552 18.7347 10.297 18.373C10.2434 18.0804 10.038 17.8413 9.76171 17.75C9.53658 17.6707 9.31645 17.5772 9.10261 17.47C8.84815 17.3365 8.54289 17.3565 8.30701 17.522C8.02156 17.7325 7.62943 17.6999 7.38076 17.445L6.41356 16.453C6.15326 16.186 6.11944 15.7651 6.33361 15.458C6.49878 15.2105 6.52257 14.8914 6.39601 14.621C6.31262 14.4332 6.23906 14.2409 6.17566 14.045C6.08485 13.7363 5.8342 13.5051 5.52533 13.445C5.15287 13.384 4.8779 13.0559 4.87501 12.669V11.428C4.87303 10.9821 5.18705 10.6007 5.61601 10.528C5.94143 10.4645 6.21316 10.2359 6.33751 9.921C6.37456 9.83233 6.41356 9.74433 6.45451 9.657C6.61989 9.33044 6.59705 8.93711 6.39503 8.633C6.1424 8.27288 6.18119 7.77809 6.48668 7.464L7.19746 6.735C7.54802 6.37532 8.1009 6.32877 8.50396 6.625L8.52638 6.641C8.82735 6.84876 9.21033 6.88639 9.54428 6.741C9.90155 6.60911 10.1649 6.29424 10.2375 5.912L10.2473 5.878C10.3275 5.37197 10.7536 5.00021 11.2535 5H12.1115C12.6248 4.99976 13.0629 5.38057 13.1469 5.9L13.1625 5.97C13.2314 6.33617 13.4811 6.63922 13.8216 6.77C14.1498 6.91447 14.5272 6.87674 14.822 6.67L14.8707 6.634C15.2842 6.32834 15.8528 6.37535 16.2133 6.745L16.8675 7.417C17.1954 7.75516 17.2366 8.28693 16.965 8.674C16.7522 8.99752 16.7251 9.41325 16.8938 9.763L16.9358 9.863C17.0724 10.2045 17.3681 10.452 17.7216 10.521C18.1837 10.5983 18.5235 11.0069 18.525 11.487V12.6C18.5249 13.0234 18.2263 13.3846 17.8191 13.454C17.4842 13.5199 17.2114 13.7686 17.1083 14.102C17.0628 14.2353 17.0121 14.3687 16.9562 14.502C16.8261 14.795 16.855 15.1364 17.0323 15.402C17.2662 15.7358 17.2299 16.1943 16.9465 16.485L16.0388 17.417C15.7792 17.6832 15.3698 17.7175 15.0716 17.498C14.8226 17.3235 14.5001 17.3043 14.2331 17.448C14.0428 17.5447 13.8475 17.6305 13.6481 17.705C13.3692 17.8037 13.1636 18.0485 13.1099 18.346C13.053 18.7203 12.7401 18.9972 12.3708 19H11.0175Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M13.9747 12C13.9747 13.2885 12.9563 14.333 11.7 14.333C10.4437 14.333 9.42533 13.2885 9.42533 12C9.42533 10.7115 10.4437 9.66699 11.7 9.66699C12.9563 9.66699 13.9747 10.7115 13.9747 12Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      ),
    },
  ];
  return (
    <nav className={navStyles.nav}>
      {items.map((it) => {
        if (it.to === '/board') {
          const active = location.pathname.startsWith('/board') || location.pathname.startsWith('/notice');
          return (
            <NavLink key={it.to} to="/notice" className={`${navStyles.item} ${active ? navStyles.active : ''}`} onClick={() => { if ('vibrate' in navigator) navigator.vibrate(50); }} aria-label={it.label}>
              {React.cloneElement(it.icon, { className: navStyles.icon })}
              <span className={navStyles.label}>{it.label}</span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) => `${navStyles.item} ${isActive ? navStyles.active : ''}`}
            onClick={() => {
              if ('vibrate' in navigator) navigator.vibrate(50);
            }}
            aria-label={it.label}
          >
            {React.cloneElement(it.icon, { className: navStyles.icon })}
            <span className={navStyles.label}>{it.label}</span>
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
  <Route path="/admin-push-test" element={<AdminPushTest />} />
        <Route path="*" element={<SimplePage title="페이지를 찾을 수 없습니다" />} />
      </Routes>
  {/* Global prompts */}
  <PWAInstallPrompt />
  <PushPermissionPrompt />
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
