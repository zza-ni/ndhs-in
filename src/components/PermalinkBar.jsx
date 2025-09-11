import React from "react";
import { useToast } from "./ui/Toast.jsx";

// 고정 링크 표시 + 복사 버튼 바
// props:
// - href: 고정 링크 URL
// - className: 컨테이너 클래스
export default function PermalinkBar({ href, className }) {
  const toast = useToast();
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast?.show("링크가 복사되었습니다.", { type: "success" });
    } catch (e) {
      toast?.show("복사에 실패했습니다.", { type: "error" });
    }
  };

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(href);
  };

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <a href={href} onClick={onClick} title="링크 복사">
        {href}
      </a>
    </div>
  );
}
