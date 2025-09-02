import React from 'react';

export default function AuthPage() {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
  // Assumption: login endpoint
  const AUTH_API = `${API_ENDPOINT?.replace(/\/$/, '') || ''}/auth/login`;

  const [userId, setUserId] = React.useState(() => localStorage.getItem('authUserId') || '');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(() => !!localStorage.getItem('authUserId'));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    if (remember && userId) {
      localStorage.setItem('authUserId', userId);
    } else {
      localStorage.removeItem('authUserId');
    }
  }, [remember, userId]);

  const canSubmit = !loading && userId.trim() && password.trim();

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: userId.trim(), password: password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || '로그인에 실패했어요.');
      }
      const token = data?.token || data?.accessToken || '';
      if (token) {
        localStorage.setItem('authToken', token);
        setSuccess('로그인되었습니다.');
      } else {
        setSuccess('로그인 성공');
      }
    } catch (err) {
      setError(err.message || '네트워크 오류입니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>로그인</h2>
      </div>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: 'calc(70vh)', padding: 16 }}>
        <div className="card" style={{ maxWidth: 480, width: '100%' }}>
          <div className="card-header">
            <h3 className="card-title">남도학숙 계정 로그인</h3>
          </div>
          <form className="card-body" style={{ display: 'grid', gap: 12 }} onSubmit={onSubmit}>
            <div style={{ position: 'relative' }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color, #888)' }}>
                <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z" fill="currentColor"/>
              </svg>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 36 }}
                placeholder="아이디"
                aria-label="아이디"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                inputMode="text"
              />
            </div>
            <div style={{ position: 'relative' }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-color, #888)' }}>
                <path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1Zm2 0h8V8a4 4 0 1 0-8 0v2Z" fill="currentColor"/>
              </svg>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 36 }}
                type="password"
                placeholder="비밀번호"
                aria-label="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>아이디 저장</span>
              </label>
            </div>
            <div
              role="note"
              aria-live="polite"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
                color: 'var(--sub-font-color)',
                fontSize: 12,
                background: 'var(--white)',
                border: '1px solid var(--disable-color)',
                padding: '8px 10px',
                borderRadius: 8
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" style={{ color: 'var(--focus-color)' }}>
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M12 17v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="7.5" r="1.25" fill="currentColor" />
              </svg>
              <div>남도인은 아이디, 비밀번호를 저장하지 않습니다.</div>
            </div>
            {error && (
              <div role="alert" className="card-error" style={{ marginTop: 4 }}>
                {error}
              </div>
            )}
            {success && (
              <div role="status" style={{ color: 'var(--success-color, #2e7d32)', fontSize: 14, marginTop: 4 }}>
                {success}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn" type="submit" disabled={!canSubmit} aria-disabled={!canSubmit}>
                {loading ? '로그인 중…' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
