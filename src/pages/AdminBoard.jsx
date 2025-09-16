import React from "react";
import PageHeader from "../components/PageHeader";
import Divider from "../components/ui/Divider";
import form from "../components/ui/Form.module.css";
import { useToast } from "../components/ui/Toast.jsx";
import { fetchWithRetry } from "../lib/api";

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
    if (!API_ENDPOINT || !token) return;
    setLoadingPosts(true);
    try {
      const res = await fetchWithRetry(
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
  }, [API_ENDPOINT, headers, token, toast]);

  const fetchPendingComments = React.useCallback(
    async (postId) => {
      if (!API_ENDPOINT || !postId) return;
      setLoadingComments(true);
      try {
        const res = await fetchWithRetry(
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
      const res = await fetchWithRetry(
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
      // 반려 시에는 즉시 목록에서 제거
      if (!accept) {
        setPendingPosts((prev) =>
          prev.filter((p) => (p.id || p.post_id) !== postId)
        );
      } else {
        await fetchPendingPosts();
      }
      if (postId === selectedPostId) await fetchPendingComments(postId);
    } catch {
      toast?.show("처리 실패", { type: "error" });
    }
  };

  const approveComment = async (postId, commentId, accept = true) => {
    try {
      const res = await fetchWithRetry(
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

  // 초기 자동 호출 제거: 저장 버튼에서 명시적으로 호출

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
              onClick={async () => {
                // 저장 시 토큰 검증: 간단히 대기 목록 API 한 번 호출해 200 확인
                try {
                  const res = await fetchWithRetry(
                    `${API_ENDPOINT}/admin/boards/${BOARD_ID}/pending`,
                    {
                      headers: {
                        Accept: "application/json",
                        ...(token ? { "X-Admin-Token": token } : {}),
                      },
                    }
                  );
                  if (!res.ok) {
                    toast?.show("토큰이 유효하지 않습니다.", { type: "error" });
                    return;
                  }
                  localStorage.setItem("adminToken", token || "");
                  toast?.show("토큰 저장 및 확인 완료", { type: "success" });
                  // 토큰이 올바르면 목록 갱신
                  await fetchPendingPosts();
                } catch {
                  toast?.show("토큰 확인 중 오류", { type: "error" });
                }
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
                      flexDirection: "column",
                      gap: 8,
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
                      {/* 본문 표시 */}
                      {p.content && (
                        <div
                          style={{
                            marginTop: 6,
                            background: "var(--surface-2)",
                            padding: "8px 10px",
                            borderRadius: 8,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {p.content}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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
