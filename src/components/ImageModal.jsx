import React from "react";
import { createPortal } from "react-dom";

// 전체 화면 이미지 모달
// props:
// - open: boolean
// - src: 이미지 URL
// - alt: 대체 텍스트
// - onClose(): 닫기 콜백
export default function ImageModal({ open, src, alt = "", onClose }) {
  const [mounted, setMounted] = React.useState(false);
  const escHandler = React.useCallback(
    (e) => {
      if (e.key === "Escape") onClose && onClose();
    },
    [onClose]
  );
  React.useEffect(() => {
    setMounted(true);
  }, []);
  React.useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", escHandler);
    try {
      document.body.classList.add("modal-open");
    } catch {}
    return () => {
      document.removeEventListener("keydown", escHandler);
      try {
        document.body.classList.remove("modal-open");
      } catch {}
    };
  }, [open, escHandler]);
  if (!open || !mounted) return null;
  return createPortal(
    <div
      className="image-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "이미지 보기"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 12px 32px",
        boxSizing: "border-box",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose && onClose();
        }}
        aria-label="닫기"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          border: "none",
          width: 38,
          height: 38,
          borderRadius: 12,
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        ×
      </button>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 4,
          boxShadow: "0 4px 28px rgba(0,0,0,0.5)",
          userSelect: "none",
          WebkitUserDrag: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClose && onClose();
        }}
      />
    </div>,
    document.body
  );
}
