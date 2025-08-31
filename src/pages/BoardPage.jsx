import React from 'react';

export default function BoardPage() {
  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>게시판</h2>
      </div>
      <div className="container">
        <div className="card-grid">
          <a className="card" href="/notice">
            <h3>공지사항</h3>
            <p>학교/급식 관련 주요 공지를 확인하세요.</p>
          </a>
          <a className="card" href="https://forms.gle/" target="_blank" rel="noreferrer">
            <h3>건의하기</h3>
            <p>급식/서비스에 대한 의견을 보내주세요.</p>
          </a>
          <a className="card disabled" aria-disabled="true">
            <h3>자유게시판</h3>
            <p>준비 중입니다.</p>
          </a>
        </div>
      </div>
    </main>
  );
}
