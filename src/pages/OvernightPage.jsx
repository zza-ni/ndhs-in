import React from 'react';
import PageHeader from '../components/PageHeader';

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
  // 복귀 예정일만 사용 (기본값: 내일)
  const [returnDate, setReturnDate] = React.useState(tomorrow);
  const [dateError, setDateError] = React.useState('');

  // 복귀 예정일 유효성 (일부 iOS에서 min 무시 가능성 방어)
  React.useEffect(() => {
    if (returnDate < tomorrow) {
      setDateError('복귀 예정일은 내일 이후여야 합니다.');
    } else {
      setDateError('');
    }
  }, [returnDate, tomorrow]);


  return (
    <main className="main-content page-content">
  <PageHeader title="외박 신청" />
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">외박 신청</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontWeight: 700, minWidth: 60, marginBottom: 0 }}>복귀 예정일</label>
              <input
                className="input"
                style={{ flex: 1 }}
                type="date"
                value={returnDate}
                min={tomorrow}
                onChange={e => setReturnDate(e.target.value)}
              />
            </div>
            {dateError && (
              <div role="alert" style={{ color: 'var(--danger-color, #d32f2f)', fontSize: 12 }}>
                {dateError}
              </div>
            )}
            <label style={{ fontWeight: 700 }}>사유</label>
            <textarea className="textarea" rows={4} placeholder="간단한 사유를 입력하세요" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" disabled={!!dateError} aria-disabled={!!dateError} title={dateError || undefined}>신청</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
