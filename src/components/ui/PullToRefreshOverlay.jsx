import React from "react";

export default function PullToRefreshOverlay({
  visible,
  progress = 0,
  reached = false,
}) {
  const size = 28;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0.001, Math.min(1, progress)) * c;
  const translate = 8 + Math.min(40, progress * 40);
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 9999,
        transform: `translateY(${visible ? translate : 0}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 160ms ease, transform 160ms ease",
      }}
    >
      <div
        style={{
          background: "var(--white, #fff)",
          color: "var(--font-color, #111)",
          border: "1px solid var(--disable-color, #e0e0e0)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          borderRadius: 999,
          padding: "4px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#e0e0e0"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--focus-color, #1976d2)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={`${c - dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <g
            transform={`translate(${size / 2} ${size / 2}) rotate(${
              reached ? 180 : 0
            }) translate(${-size / 2} ${-size / 2})`}
          >
            <path
              d={`M ${size / 2} ${size / 2 - 6} v 8 m -4 -4 l 4 4 l 4 -4`}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </svg>
        <span style={{ fontSize: 12 }}>
          {reached ? "놓으면 새로고침" : "끌어내려 새로고침"}
        </span>
      </div>
    </div>
  );
}
