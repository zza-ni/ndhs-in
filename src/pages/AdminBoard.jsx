import React from "react";
import PageHeader from "../components/PageHeader";
import Divider from "../components/ui/Divider";
import form from "../components/ui/Form.module.css";
import { useToast } from "../components/ui/Toast.jsx";

export default function AdminBoard() {
  const toast = useToast();
  const API_ENDPOINT =
    import.meta.env.VITE_API_ENDPOINT?.replace(/\/$/, "") || "";
  const BOARD_ID = "board1"; // 현재 게시판 고정

  const [token, setToken] = React.useState(
    () => localStorage.getItem("adminToken") || ""
  );
  const [pendingPosts, setPendingPosts] = React.useState([]);
  const [loadingPosts, setLoadingPosts] = React.useState(false);
  const [selectedPostId, setSelectedPostId] = React.useState("");
  const [pendingComments, setPendingComments] = React.useState([]);
  const [loadingComments, setLoadingComments] = React.useState(false);

  const headers = React.useMemo(
    () => ({
      Accept: "application/json",
      ...(token ? { "X-Admin-Token": token } : {}),
    }),
    [token]
  );

  const fetchPendingPosts = React.useCallback(async () => {
    if (!API_ENDPOINT) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(
        `${API_ENDPOINT}/admin/boards/${BOARD_ID}/pending`,
        { headers }
      );
      if (!res.ok) throw new Error("list");
      const data = await res.json();
      setPendingPosts(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      toast?.show("대기 글 목록을 불러오지 못했어요.", { type: "error" });
    } finally {
      setLoadingPosts(false);
    }
  }, [API_ENDPOINT, headers, toast]);

  const fetchPendingComments = React.useCallback(
    async (postId) => {
      if (!API_ENDPOINT || !postId) return;
      setLoadingComments(true);
      try {
        const res = await fetch(
          `${API_ENDPOINT}/admin/boards/${BOARD_ID}/${postId}/comments/pending`,
          { headers }
        );
        if (!res.ok) throw new Error("list");
        const data = await res.json();
        setPendingComments(Array.isArray(data?.items) ? data.items : []);
      } catch (e) {
        toast?.show("대기 댓글 목록을 불러오지 못했어요.", { type: "error" });
      } finally {
        setLoadingComments(false);
      }
    },
    [API_ENDPOINT, headers, toast]
  );

  const approvePost = async (postId, accept = true) => {
    try {
      const res = await fetch(
        `${API_ENDPOINT}/admin/boards/${BOARD_ID}/${postId}/accept`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ accept }),
        }
      );
      if (!res.ok) throw new Error("approve");
      toast?.show(accept ? "글 승인 완료" : "글 반려 완료", {
        type: "success",
      });
      await fetchPendingPosts();
      if (postId === selectedPostId) await fetchPendingComments(postId);
    } catch {
      toast?.show("처리 실패", { type: "error" });
    }
  };

  const approveComment = async (postId, commentId, accept = true) => {
    try {
      const res = await fetch(
        `${API_ENDPOINT}/admin/boards/${BOARD_ID}/${postId}/comments/${commentId}/accept`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ accept }),
        }
      );
      if (!res.ok) throw new Error("approve");
      toast?.show(accept ? "댓글 승인 완료" : "댓글 반려 완료", {
        type: "success",
      });
      await fetchPendingComments(postId);
    } catch {
      toast?.show("처리 실패", { type: "error" });
    }
  };

  React.useEffect(() => {
    fetchPendingPosts();
  }, [fetchPendingPosts]);

  return (
    <main className="main-content page-content">
      <PageHeader title="관리자 승인" />
      <div className="container" style={{ paddingBottom: 16 }}>
        <section style={{ margin: "8px 0 16px" }}>
          <label className={form.label} htmlFor="adm-token">
            관리자 토큰
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="adm-token"
              className={form.input}
              placeholder="X-Admin-Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button
              className={form.btn}
              onClick={() => {
                localStorage.setItem("adminToken", token || "");
                toast?.show("토큰 저장", { type: "success" });
              }}
            >
              저장
            </button>
          </div>
        </section>
        <Divider />
        <section>
          <h3>대기중인 글</h3>
          {loadingPosts ? (
            <div>불러오는 중…</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(pendingPosts || []).map((p) => (
                <li
                  key={p.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "baseline",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, wordBreak: "break-word" }}>
                        {p.title || "(제목 없음)"}
                      </div>
                      {p.tag && (
                        <div
                          style={{ color: "var(--muted-color)", fontSize: 12 }}
                        >
                          #{p.tag}
                        </div>
                      )}
                      <div
                        style={{ color: "var(--muted-color)", fontSize: 12 }}
                      >
                        {new Date(p.created_at).toLocaleString("ko-KR")}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className={form.btn}
                        onClick={() => approvePost(p.id, true)}
                      >
                        승인
                      </button>
                      <button
                        className={form.btn}
                        onClick={() => approvePost(p.id, false)}
                      >
                        반려
                      </button>
                      <button
                        className={form.btn}
                        onClick={() => {
                          setSelectedPostId(p.id);
                          fetchPendingComments(p.id);
                        }}
                      >
                        댓글보기
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {(!pendingPosts || pendingPosts.length === 0) && (
                <li style={{ padding: "8px 0" }}>대기중인 글이 없습니다.</li>
              )}
            </ul>
          )}
        </section>
        {selectedPostId && (
          <>
            <Divider />
            <section>
              <h3>대기중인 댓글 (post: {selectedPostId})</h3>
              {loadingComments ? (
                <div>불러오는 중…</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {(pendingComments || []).map((c) => (
                    <li
                      key={c.id}
                      style={{
                        padding: "8px 0",
                        borderBottom: "1px dashed var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {c.content}
                          </div>
                          <div
                            style={{
                              color: "var(--muted-color)",
                              fontSize: 12,
                            }}
                          >
                            {new Date(c.created_at).toLocaleString("ko-KR")}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className={form.btn}
                            onClick={() =>
                              approveComment(selectedPostId, c.id, true)
                            }
                          >
                            승인
                          </button>
                          <button
                            className={form.btn}
                            onClick={() =>
                              approveComment(selectedPostId, c.id, false)
                            }
                          >
                            반려
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {(!pendingComments || pendingComments.length === 0) && (
                    <li style={{ padding: "8px 0" }}>
                      대기중인 댓글이 없습니다.
                    </li>
                  )}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
