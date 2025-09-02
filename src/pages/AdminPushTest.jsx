import React from 'react';
import form from '../components/ui/Form.module.css';
import PageHeader from '../components/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import Divider from '../components/ui/Divider';

export default function AdminPushTest() {
  const [password, setPassword] = React.useState('');
  const [title, setTitle] = React.useState('테스트 알림');
  const [body, setBody] = React.useState('남도인에서 보내는 테스트 메시지');
  // 웹푸시 제거: URL/Icon 입력 제거
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState('');
  const [type, setType] = React.useState('all'); // all | fcm (둘 다 FCM 경로)

  const onSend = async () => {
    if (sending) return;
    setSending(true);
    setResult('');
    try {
  const path = type === 'all' ? '/api/sendAllPush' : '/api/sendPush';
  const payload = { password, title, body };
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      setResult(res.ok ? (data?.message || '전송 완료') : `오류: ${data?.message || res.statusText}`);
    } catch (e) {
      setResult(`예외 발생: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const TypeSelector = () => (
    <div className="segmented-control" role="tablist" aria-label="전송 대상" style={{ width: '100%', maxWidth: 420 }}>
      <input type="radio" id="type-all" name="push-type" checked={type === 'all'} onChange={() => setType('all')} />
      <label htmlFor="type-all" role="tab" aria-selected={type === 'all'}>전체</label>
      <input type="radio" id="type-fcm" name="push-type" checked={type === 'fcm'} onChange={() => setType('fcm')} />
      <label htmlFor="type-fcm" role="tab" aria-selected={type === 'fcm'}>FCM</label>
  {/* 웹푸시 옵션 제거 */}
    </div>
  );

  const Hint = ({ children }) => (
    <small className="muted" style={{ display: 'block', marginTop: 4 }}>{children}</small>
  );

  return (
    <main className="main-content page-content">
      <PageHeader title="Admin Push Test" />
      <div className="container" style={{ display: 'grid', gap: 10 }}>
        {/* 대상 & 실행 */}
        <Card style={{ margin: 0 }}>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <CardTitle as="h3" style={{ margin: 0 }}>전송</CardTitle>
            <TypeSelector />
          </CardHeader>
          <CardBody style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <span className="muted">모든 플랫폼은 FCM으로 전송됩니다.</span>
            </div>
            <button className={form.btn} onClick={onSend} disabled={sending || !password || !title || !body}>
              {sending ? '전송 중…' : '전송'}
            </button>
          </CardBody>
        </Card>

        {/* 자격 */}
          <Card style={{ margin: 0 }}>
            <CardHeader><CardTitle>자격</CardTitle></CardHeader>
            <CardBody style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
              <label>
                <span className="muted">비밀번호</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="PUSH_PASSWORD" />
                <Hint>서버 환경변수 PUSH_PASSWORD와 일치해야 합니다.</Hint>
              </label>
            </CardBody>
          </Card>

        {/* 메시지 */}
          <Card style={{ margin: 0 }}>
            <CardHeader><CardTitle>메시지</CardTitle></CardHeader>
            <CardBody style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr', maxWidth: 720 }}>
              <label>
                <span className="muted">제목</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="알림 제목" />
              </label>
              <label>
                <span className="muted">내용</span>
                <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="알림 본문" />
              </label>
            </div>

            <Divider />

            {/* 웹푸시 전용 필드 제거됨 */}
            </CardBody>
          </Card>

        {/* 결과 */}
        {result && (
            <Card style={{ margin: 0 }}>
              <CardHeader><CardTitle>결과</CardTitle></CardHeader>
              <CardBody>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{result}</pre>
              </CardBody>
            </Card>
        )}
      </div>
    </main>
  );
}
