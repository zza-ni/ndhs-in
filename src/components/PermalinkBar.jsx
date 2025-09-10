import React from "react";

// 고정 링크 표시 + 복사 버튼 바
// props:
// - href: 고정 링크 URL
// - className: 컨테이너 클래스
export default function PermalinkBar({ href, className }) {
  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <a href={href} target="_blank" rel="noreferrer" title="새 탭에서 열기">
        {href}
      </a>
    </div>
  );
}
