import React from 'react';

export default function PageHeader({ title, right = null, onLogoClick }) {
  const handleLogoClick = onLogoClick || (() => (window.location.href = '/'));
  return (
    <div className="header simple">
      <div onClick={handleLogoClick}>
        <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
      </div>
      <h2>{title}</h2>
      {right}
    </div>
  );
}
