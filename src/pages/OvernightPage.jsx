import React from 'react';

export default function OvernightPage() {
  // 오늘 날짜 yyyy-mm-dd
  const today = React.useMemo(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);
  // 내일 날짜 yyyy-mm-dd
  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(tomorrow);

  // startDate가 바뀌면 endDate가 startDate보다 빠르면 endDate를 startDate+1로 맞춤
  React.useEffect(() => {
    if (endDate <= startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setEndDate(`${d.getFullYear()}-${mm}-${dd}`);
    }
  }, [startDate]);

  // 아이디 저장 및 불러오기
  const [userId, setUserId] = React.useState(() => localStorage.getItem('overnightUserId') || '');
  const [password, setPassword] = React.useState('');

  // 아이디 입력시 localStorage에 저장
  React.useEffect(() => {
    if (userId) localStorage.setItem('overnightUserId', userId);
  }, [userId]);

  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>외박 신청</h2>
      </div>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">외박 신청</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontWeight: 700, minWidth: 60, marginBottom: 0 }}>아이디</label>
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="아이디를 입력하세요"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontWeight: 700, minWidth: 60, marginBottom: 0 }}>비밀번호</label>
              <input
                className="input"
                style={{ flex: 1 }}
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <label style={{ fontWeight: 700 }}>외박 날짜</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--muted-color)', marginBottom: 6 }}>시작일</label>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--muted-color)', marginBottom: 6 }}>종료일</label>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <label style={{ fontWeight: 700 }}>사유</label>
            <textarea className="textarea" rows={4} placeholder="간단한 사유를 입력하세요" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn">신청</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
