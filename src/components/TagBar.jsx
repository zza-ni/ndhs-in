import React from "react";

// 태그 선택 바 (재사용 가능)
// props:
// - className: 컨테이너 클래스
// - tags: 문자열 배열 (첫 요소로 '전체' 포함 권장)
// - selected: 현재 선택된 태그 문자열
// - onSelect(tag): 태그 선택 콜백
export default function TagBar({ className, tags, selected, onSelect }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className={className}>
      {tags.map((tag) => (
        <button
          key={tag}
          className={`tag-chip${selected === tag ? " active" : ""}`}
          onClick={() => onSelect?.(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
