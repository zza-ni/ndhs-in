import React from "react";

// 전체 화면 이미지 모달
// props:
// - open: boolean
// - src: 이미지 URL
// - alt: 대체 텍스트
// - onClose(): 닫기 콜백
export default function ImageModal({ open, src, alt = "", onClose }) {
  if (!open) return null;
  return (
    <div className="modal image-modal" onClick={onClose}>
      <div className="modal-content full" onClick={onClose}>
        <img
          src={src}
          alt={alt}
          onClick={onClose}
          style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        />
      </div>
    </div>
  );
}
