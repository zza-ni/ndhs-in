import React from "react";
import form from "./ui/Form.module.css";
import styles from "../pages/BoardPage.module.css";

// 게시판 댓글 입력 박스 (재사용 컴포넌트)
// props:
// - onSubmit(text: string): 댓글 전송 콜백
export default function BoardCommentBox({ onSubmit }) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      className={`comment-box ${styles.commentForm}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        try {
          await onSubmit(text.trim());
          setText("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea
        className={`${form.textarea} ${styles.commentTextarea}`}
        rows={1}
        placeholder="댓글을 입력하세요"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
        }}
      />
      <button
        className={form.btn}
        type="submit"
        disabled={busy || !text.trim()}
        title="등록"
      >
        ➤
      </button>
    </form>
  );
}
