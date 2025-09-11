import React from "react";
import { useToast } from "../components/ui/Toast.jsx";
import PageHeader from "../components/PageHeader";
import Divider from "../components/ui/Divider";
import {
  CardSkeleton,
  CardError,
  LoadMoreSkeleton,
  AccordionListSkeleton,
} from "../components/ui/Skeletons";
import styles from "./BoardPage.module.css";
import acc from "../components/ui/Accordion.module.css";
import seg from "../components/ui/SegmentedControl.module.css";
import form from "../components/ui/Form.module.css";
import { TagChip } from "../components/ui/Chip";
import {
  getBoardListCache,
  isBoardCacheFresh,
  setBoardListCache,
} from "../lib/boardCache";
import {
  getNoticeListCache,
  isNoticeCacheFresh,
  setNoticeListCache,
} from "../lib/noticeCache";
import PermalinkBar from "../components/PermalinkBar";
import ImageModal from "../components/ImageModal";
import BoardCommentBox from "../components/BoardCommentBox";
import TagBar from "../components/TagBar";
import {
  enhanceHtml as enhanceHtmlUtil,
  hydrateImagesInElement,
} from "../lib/htmlUtils";

export default function BoardPage() {
  const toast = useToast();
  // 상태 최소화 및 역할 분리
  const [items, setItems] = React.useState([]); // 게시판 탭 데이터
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [openId, setOpenId] = React.useState(null); // 현재 열린 아코디언 아이템 ID
  const [cursor, setCursor] = React.useState(null); // 게시판 페이지네이션 커서
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const sentinelRef = React.useRef(null);
  // 라우터를 거치지 않고 경로만 갱신하여 현재 페이지를 유지
  const [locationPath, setLocationPath] = React.useState(
    () => window.location.pathname
  );
  const [lightboxSrc, setLightboxSrc] = React.useState("");
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const scrollRef = React.useRef(null);

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
  const BOARD_API = `${API_ENDPOINT.replace(/\/$/, "")}/boards/board1`;
  const NOTICE_API = `${API_ENDPOINT.replace(/\/$/, "")}/boards/notice`;
  const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE;

  // tab: 'board' | 'notice' (default derived from current path)
  const [activeTab, setActiveTab] = React.useState(() => {
    const p = window.location.pathname || "";
    if (p.startsWith("/board")) return "board";
    if (p.startsWith("/notice")) return "notice";
    return "notice";
  });

  // 탭별 태그 선택 상태 관리 (공지/게시판 각각 독립)
  const [selectedTagByTab, setSelectedTagByTab] = React.useState({
    board: "전체",
    notice: "전체",
  });
  const selectedTag = selectedTagByTab[activeTab];
  const setSelectedTag = (tag) =>
    setSelectedTagByTab((prev) => ({ ...prev, [activeTab]: tag }));

  // Notice-specific state (separate from board 'items')
  const [noticeItems, setNoticeItems] = React.useState([]); // 공지 탭 데이터
  const [noticeCursor, setNoticeCursor] = React.useState(null);
  const [noticeLoading, setNoticeLoading] = React.useState(false);
  const [noticeHasMore, setNoticeHasMore] = React.useState(true);
  const [noticeError, setNoticeError] = React.useState("");
  const scrollPositionsRef = React.useRef({ board: 0, notice: 0 });
  const segControlRef = React.useRef(null);
  const liveRegionRef = React.useRef(null);

  // 게시물별 댓글 상태 저장: { [postId]: { items?: any[], loading?: boolean, error?: string } }
  const [commentsByPost, setCommentsByPost] = React.useState({});

  // derived post id from the URL we manage. prefer explicit pathname parsing
  const urlPostId = React.useMemo(() => {
    const m = (locationPath || window.location.pathname || "").match(
      /^\/(notice|board)\/([^/]+)/
    );
    return m ? m[2] : null;
  }, [locationPath]);

  // keep our local path in sync with browser history (back/forward)
  React.useEffect(() => {
    const onPop = () => setLocationPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ISO 포맷("2025-08-30T05:08:56.353574Z")을 한국 시간 기준 YY/M/D HH:MM로 표시
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "2-digit",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type) => parts.find((p) => p.type === type)?.value || "";
    const yy = get("year");
    const m = String(parseInt(get("month"), 10));
    const day = String(parseInt(get("day"), 10));
    const hh = (get("hour") || "").padStart(2, "0");
    const mm = (get("minute") || "").padStart(2, "0");
    return `${yy}/${m}/${day} ${hh}:${mm}`;
  };

  // HTML 콘텐츠 가공: 공유 유틸 사용 (지연/즉시 로딩 일관 처리)
  const enhanceHtml = React.useCallback(
    (html, deferImages) =>
      enhanceHtmlUtil(html, { imageBase: IMAGE_BASE, deferImages }),
    [IMAGE_BASE]
  );

  // 현재 탭의 항목에서 태그 목록 도출 (첫 항목은 '전체')
  const activeItems = activeTab === "board" ? items : noticeItems;
  const tagOptions = React.useMemo(() => {
    const set = new Set();
    (activeItems || []).forEach((it) => {
      const t = (it.tag || "").trim();
      if (t) set.add(t);
    });
    return ["전체", ...Array.from(set)];
  }, [activeItems]);

  async function fetchBoardPageWithCursor(nextCursor = null) {
    const u = new URL(BOARD_API);
    if (nextCursor) u.searchParams.set("last", nextCursor);
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    const newCursor = data?.last ?? null;
    return { posts, newCursor };
  }

  async function fetchSinglePost(id, isNotice = false) {
    // choose API based on whether it's a notice or a board post
    const base = isNotice ? NOTICE_API : BOARD_API;
    const url = `${base}/${id}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    if (Array.isArray(data?.posts)) return data.posts[0] || null;
    if (data && (data.id || data.post_id || data.title)) return data;
    return null;
  }

  // Notice fetch (used when activeTab === 'notice')
  async function fetchNoticesPageWithCursor(nextCursor = null) {
    const u = new URL(NOTICE_API);
    if (nextCursor) u.searchParams.set("last", nextCursor);
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    const newCursor = data?.last ?? null;
    return { posts, newCursor };
  }

  // 글쓰기
  async function createPost({ title, content, tag }) {
    const res = await fetch(BOARD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, tag }),
    });
    if (!res.ok) throw new Error("create");
    return res.json();
  }

  // 댓글쓰기
  async function createComment(postId, { content }) {
    const res = await fetch(`${BOARD_API}/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("comment");
    return res.json();
  }

  // 댓글 목록 가져오기 (지연 로딩)
  async function fetchComments(postId) {
    const res = await fetch(`${BOARD_API}/${postId}/comments`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Failed to load comments");
    const data = await res.json();
    if (Array.isArray(data?.comments)) return data.comments;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }

  // 특정 게시물의 댓글을 필요시에만 로드
  const ensureComments = React.useCallback(
    async (postId) => {
      if (!postId) return;
      const key = String(postId);
      if (commentsByPost[key]?.items || commentsByPost[key]?.loading) return;
      setCommentsByPost((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), loading: true, error: "" },
      }));
      try {
        const items = await fetchComments(postId);
        setCommentsByPost((prev) => ({
          ...prev,
          [key]: { ...(prev[key] || {}), items, loading: false, error: "" },
        }));
      } catch (e) {
        setCommentsByPost((prev) => ({
          ...prev,
          [key]: { ...(prev[key] || {}), loading: false, error: "load" },
        }));
        toast?.show("댓글을 불러오지 못했어요.", { type: "error" });
      }
    },
    [commentsByPost, toast]
  );

  // 추천(좋아요)
  async function likePost(postId) {
    const res = await fetch(`${BOARD_API}/${postId}/like`, { method: "POST" });
    if (!res.ok) throw new Error("like");
    return res.json();
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // If the path indicates a notice post, load notice list/single post
        if (activeTab === "notice") {
          setNoticeLoading(true);
          setNoticeError("");
          if (urlPostId) {
            // 단일 글: 공지 API에서 직접 로드
            const post = await fetchSinglePost(urlPostId, true);
            if (cancelled) return;
            setNoticeItems(post ? [post] : []);
            setNoticeHasMore(false);
            setNoticeCursor(null);
          } else if (isNoticeCacheFresh()) {
            const c = getNoticeListCache();
            setNoticeItems(c.items || []);
            setNoticeCursor(c.cursor ?? null);
            setNoticeHasMore(!!c.hasMore);
          } else {
            const { posts, newCursor } = await fetchNoticesPageWithCursor(null);
            if (cancelled) return;
            setNoticeItems(posts);
            setNoticeCursor(newCursor);
            const more = !!newCursor && posts.length > 0;
            setNoticeHasMore(more);
            setNoticeListCache({
              items: posts,
              cursor: newCursor,
              hasMore: more,
            });
          }
          setNoticeLoading(false);
        } else {
          if (urlPostId) {
            // 단일 글: 게시판 API에서 직접 로드
            const post = await fetchSinglePost(urlPostId, false);
            if (cancelled) return;
            setItems(post ? [post] : []);
            setHasMore(false);
            setCursor(null);
          } else if (isBoardCacheFresh()) {
            const c = getBoardListCache();
            setItems(c.items || []);
            setCursor(c.cursor ?? null);
            setHasMore(!!c.hasMore);
          } else {
            const { posts, newCursor } = await fetchBoardPageWithCursor(null);
            if (cancelled) return;
            setItems(posts);
            setCursor(newCursor);
            const more = !!newCursor && posts.length > 0;
            setHasMore(more);
            setBoardListCache({
              items: posts,
              cursor: newCursor,
              hasMore: more,
            });
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (activeTab === "notice") {
            toast?.show(
              "공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
              { type: "error" }
            );
            setNoticeError("");
            setNoticeLoading(false);
          } else {
            toast?.show(
              "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
              { type: "error" }
            );
            setError("");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [BOARD_API, NOTICE_API, urlPostId, activeTab]);

  // Keep and restore scroll positions per tab, and track scrolling
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container) return undefined;
    let rafId = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        scrollPositionsRef.current[activeTab] = container.scrollTop;
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    // restore saved position for the active tab (small delay to allow content render)
    const pos = scrollPositionsRef.current[activeTab] || 0;
    requestAnimationFrame(() => {
      container.scrollTop = pos;
    });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeTab]);

  const handleSegKeyDown = (e) => {
    const tabs = ["notice", "board"];
    const idx = tabs.indexOf(activeTab);
    if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "Home" ||
      e.key === "End"
    ) {
      e.preventDefault();
      let next = idx;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft")
        next = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      setActiveTab(tabs[next]);
      if (tabs[next] === "notice") {
        window.history.replaceState({}, "", "/notice");
        setLocationPath("/notice");
      } else {
        window.history.replaceState({}, "", "/board");
        setLocationPath("/board");
      }
      // move focus to label for accessibility
      requestAnimationFrame(() => {
        const id = tabs[next] === "notice" ? "seg-notice" : "seg-board";
        const lbl = segControlRef.current?.querySelector(`label[for="${id}"]`);
        if (lbl) lbl.focus();
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const focused = document.activeElement;
      if (focused && focused.tagName.toLowerCase() === "label") {
        const forId = focused.getAttribute("for");
        if (forId === "seg-notice") {
          setActiveTab("notice");
          window.history.replaceState({}, "", "/notice");
          setLocationPath("/notice");
        }
        if (forId === "seg-board") {
          setActiveTab("board");
          window.history.replaceState({}, "", "/board");
          setLocationPath("/board");
        }
      }
    }
  };

  // announce tab change for screen readers
  React.useEffect(() => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent =
      activeTab === "notice" ? "공지사항 선택됨" : "게시판 선택됨";
    const t = setTimeout(() => {
      if (liveRegionRef.current) liveRegionRef.current.textContent = "";
    }, 1200);
    return () => clearTimeout(t);
  }, [activeTab]);

  // 아코디언 열릴 때 스크롤 및 이미지 하이드레이션
  React.useEffect(() => {
    if (!openId) return;
    const itemEl = document.getElementById(`board-accordion-item-${openId}`);
    const panelEl = itemEl?.querySelector(".accordion-panel");
    const container = scrollRef.current;
    if (!itemEl || !panelEl || !container) return;
    let scrolled = false;
    const onTransitionEnd = (e) => {
      if (e.target !== panelEl || e.propertyName !== "max-height" || scrolled)
        return;
      scrolled = true;
      // 아코디언 열릴 때 해당 패널 내부 이미지 지연 로딩 하이드레이션
      hydrateImagesInElement(panelEl, { eager: false });
      const cRect = container.getBoundingClientRect();
      const eRect = itemEl.getBoundingClientRect();
      const offset = eRect.top - cRect.top;
      const target = container.scrollTop + offset - 2;
      let start = null;
      const initial = container.scrollTop;
      const distance = target - initial;
      const duration = 420;
      function step(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        container.scrollTop =
          initial +
          distance *
            (progress < 0.5
              ? 4 * progress ** 3
              : 1 - Math.pow(-2 * progress + 2, 3) / 2);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      panelEl.removeEventListener("transitionend", onTransitionEnd);
    };
    panelEl.addEventListener("transitionend", onTransitionEnd);
    if (getComputedStyle(panelEl).maxHeight === "2000px") {
      setTimeout(() => {
        if (!scrolled) {
          hydrateImagesInElement(panelEl, { eager: false });
          const cRect = container.getBoundingClientRect();
          const eRect = itemEl.getBoundingClientRect();
          const offset = eRect.top - cRect.top;
          container.scrollTo({
            top: container.scrollTop + offset - 12,
            behavior: "smooth",
          });
        }
      }, 250);
    }
    return () => panelEl.removeEventListener("transitionend", onTransitionEnd);
  }, [openId]);

  // 단일 글 모드에서 이미지 즉시 하이드레이션 (eager)
  React.useEffect(() => {
    if (loading) return;
    const container = scrollRef.current;
    if (!container) return;
    if (urlPostId) {
      // 단일 글 모드: 모든 이미지 즉시 로딩으로 전환
      container
        .querySelectorAll(".accordion-panel")
        .forEach((el) => hydrateImagesInElement(el, { eager: true }));
    }
  }, [loading, items, noticeItems, urlPostId]);

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  // 이미지 클릭 라이트박스
  const onContentClick = (e) => {
    const img = e.target.closest("img");
    const link = e.target.closest("a");
    let src = "";
    if (img) {
      src = img.getAttribute("data-src") || img.currentSrc || img.src;
    } else if (link && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(link.href)) {
      src = link.href;
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setLightboxSrc(src);
    setLightboxOpen(true);
  };

  React.useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") setLightboxOpen(false);
    };
    if (lightboxOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  React.useEffect(() => {
    if (lightboxOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
  }, [lightboxOpen]);

  // 아코디언 열리거나 단일 글(게시판) 모드일 때 해당 글의 댓글을 로드
  React.useEffect(() => {
    if (activeTab !== "board") return;
    // 단일 글 모드: 해당 글의 댓글 로드
    if (urlPostId) {
      const pid = items?.[0]?.id || items?.[0]?.post_id || urlPostId;
      if (pid) ensureComments(pid);
      return;
    }
    // 목록 모드: 열린 아이템만 로드
    if (openId) ensureComments(openId);
  }, [activeTab, urlPostId, openId, items, ensureComments]);

  // 무한 스크롤
  React.useEffect(() => {
    if (urlPostId) return;
    const el = sentinelRef.current;
    const rootEl = scrollRef.current;
    const activeHasMore = activeTab === "board" ? hasMore : noticeHasMore;
    const activeLoading =
      loading ||
      loadingMore ||
      (activeTab === "notice" ? noticeLoading : false);
    if (!el || !activeHasMore || activeLoading) return;
    let stopped = false;
    const io = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || stopped) return;
        stopped = true;
        setLoadingMore(true);
        try {
          if (activeTab === "board") {
            const { posts: more, newCursor } = await fetchBoardPageWithCursor(
              cursor
            );
            const updated = (() => {
              const map = new Map(
                (items || []).map((p) => [p.id || p.post_id, p])
              );
              more.forEach((p) => map.set(p.id || p.post_id, p));
              return Array.from(map.values());
            })();
            setItems(updated);
            setCursor(newCursor);
            const moreFlag = !!newCursor && more.length > 0;
            setHasMore(moreFlag);
            setBoardListCache({
              items: updated,
              cursor: newCursor,
              hasMore: moreFlag,
            });
          } else {
            const { posts: more, newCursor } = await fetchNoticesPageWithCursor(
              noticeCursor
            );
            const updated = (() => {
              const map = new Map(
                (noticeItems || []).map((p) => [p.id || p.post_id, p])
              );
              more.forEach((p) => map.set(p.id || p.post_id, p));
              return Array.from(map.values());
            })();
            setNoticeItems(updated);
            setNoticeCursor(newCursor);
            const moreFlag = !!newCursor && more.length > 0;
            setNoticeHasMore(moreFlag);
            setNoticeListCache({
              items: updated,
              cursor: newCursor,
              hasMore: moreFlag,
            });
          }
        } catch {
          // ignore
        } finally {
          setLoadingMore(false);
          setTimeout(() => {
            stopped = false;
          }, 300);
        }
      },
      { root: rootEl || null, rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [
    activeTab,
    cursor,
    hasMore,
    loading,
    loadingMore,
    urlPostId,
    items,
    noticeCursor,
    noticeHasMore,
    noticeLoading,
    noticeItems,
  ]);

  // 새 글 작성 UI (간단 폼)
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const TAGS = ["일반", "홍보", "모집"];
  const [tag, setTag] = React.useState(TAGS[0]);
  const [submitting, setSubmitting] = React.useState(false);
  const [likingId, setLikingId] = React.useState(null);
  const [writeFormOpen, setWriteFormOpen] = React.useState(false); // 글쓰기 아코디언 상태

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 400) + "px";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const created = await createPost({
        title: title.trim(),
        content,
        tag: tag.trim() || undefined,
      });
      // 방금 작성한 글을 서버에서 다시 불러와 정규화된 데이터로 반영
      let hydrated = created;
      try {
        const postId = created?.id || created?.post_id;
        if (postId) {
          const full = await fetchSinglePost(postId, false);
          if (full) hydrated = full;
        }
      } catch {}
      const nextItems = [hydrated, ...(items || [])];
      setItems(nextItems);
      // 캐시도 함께 갱신
      try {
        setBoardListCache({ items: nextItems, cursor, hasMore });
      } catch {}
      setTitle("");
      setContent("");
      setTag(TAGS[0]);
      // 글쓰기 폼 닫기
      setWriteFormOpen(false);
    } catch {
      toast?.show("글쓰기에 실패했어요.", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onCommentSubmit = async (post, text) => {
    if (!text.trim()) return;
    try {
      const res = await createComment(post.id || post.post_id, {
        content: text.trim(),
      });
      // 성공 후 최신 댓글 목록을 서버에서 다시 로드하여 반영
      const pid = post.id || post.post_id;
      const list = await fetchComments(pid);
      const key = String(pid);
      setCommentsByPost((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), items: list, loading: false, error: "" },
      }));
      // 댓글 수를 실제 길이로 동기화
      setItems((prev) =>
        prev.map((p) =>
          p === post || (p.id || p.post_id) === pid
            ? {
                ...p,
                comments_count: Array.isArray(list)
                  ? list.length
                  : p.comments_count || 0,
              }
            : p
        )
      );
      return true;
    } catch {
      toast?.show("댓글 등록에 실패했어요.", { type: "error" });
    }
  };

  const onLike = async (post) => {
    try {
      setLikingId(post.id || post.post_id);
      await likePost(post.id || post.post_id);
      setItems((prev) =>
        prev.map((p) =>
          p === post || (p.id || p.post_id) === (post.id || post.post_id)
            ? { ...p, likes: (p.likes || 0) + 1 }
            : p
        )
      );
    } catch {
      toast?.show("추천에 실패했어요.", { type: "error" });
    } finally {
      setLikingId(null);
    }
  };

  return (
    <main className="main-content page-content">
      <PageHeader title={activeTab === "board" ? "게시판" : "공지사항"} />
      <div className="container" ref={scrollRef}>
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{ position: "absolute", left: -9999 }}
          ref={liveRegionRef}
        />
        {/* 공지사항 / 게시판 선택 segmanted */}
        <div className={styles.segmentedWrap}>
          <div
            className={seg.root}
            role="tablist"
            aria-label="콘텐츠 선택"
            ref={segControlRef}
            onKeyDown={handleSegKeyDown}
          >
            <input
              className={seg.radio}
              type="radio"
              id="seg-notice"
              name="seg"
              checked={activeTab === "notice"}
              onChange={() => {
                setActiveTab("notice");
                window.history.replaceState({}, "", "/notice");
                setLocationPath("/notice");
              }}
            />
            <label
              className={seg.label}
              htmlFor="seg-notice"
              role="tab"
              aria-selected={activeTab === "notice"}
              tabIndex={0}
              onClick={() => {
                // If already on notice in single-post mode, go to list
                if (activeTab !== "notice") setActiveTab("notice");
                window.history.replaceState({}, "", "/notice");
                setLocationPath("/notice");
              }}
            >
              공지사항
            </label>
            <input
              className={seg.radio}
              type="radio"
              id="seg-board"
              name="seg"
              checked={activeTab === "board"}
              onChange={() => {
                setActiveTab("board");
                window.history.replaceState({}, "", "/board");
                setLocationPath("/board");
              }}
            />
            <label
              className={seg.label}
              htmlFor="seg-board"
              role="tab"
              aria-selected={activeTab === "board"}
              tabIndex={0}
              onClick={() => {
                if (activeTab !== "board") setActiveTab("board");
                window.history.replaceState({}, "", "/board");
                setLocationPath("/board");
              }}
            >
              게시판
            </label>
          </div>
        </div>
        {/* 태그 필터: 게시판 탭에서만 */}
        {!urlPostId && activeTab === "board" && (
          <>
            <TagBar
              tags={tagOptions}
              selected={selectedTag}
              onSelect={setSelectedTag}
            />
            <Divider />
          </>
        )}
        {/* 게시판 탭에서만 글쓰기 표시 */}
        {!urlPostId && activeTab === "board" && (
          <div
            className={`${acc.item} ${writeFormOpen ? acc.open : ""}`}
            style={{ marginBottom: "10px" }}
          >
            <button
              className={acc.header}
              onClick={() => setWriteFormOpen(!writeFormOpen)}
              aria-expanded={writeFormOpen}
              aria-controls="write-form-panel"
            >
              <span className={acc.title} style={{ justifyContent: "center" }}>
                ✍️ 새 글 쓰기
              </span>
              <span className={acc.icon} aria-hidden>
                ▾
              </span>
            </button>
            <div
              className={`accordion-panel ${acc.panel}`}
              id="write-form-panel"
              role="region"
              aria-label="글쓰기 폼"
              aria-hidden={!writeFormOpen}
            >
              <form className={styles.boardWrite} onSubmit={onSubmit}>
                <div className={styles.boardWriteBody}>
                  <div className={styles.boardWriteTags}>
                    {TAGS.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={`tag-chip${tag === t ? " active" : ""}`}
                        onClick={() => setTag(t)}
                        aria-pressed={tag === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    className={form.input}
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                  />
                  <textarea
                    className={form.textarea}
                    placeholder="내용을 입력하세요"
                    rows={3}
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      autoResize(e.target);
                    }}
                    style={{ resize: "none" }}
                    onInput={(e) => autoResize(e.target)}
                  />
                  {/* <div className={styles.boardWriteMeta}>
                    <small className="muted">텍스트만 지원됩니다.</small>
                    <small className="muted">{content.length}/2000</small>
                  </div> */}
                  <div className={styles.boardWriteActions}>
                    <button
                      className={form.btn}
                      type="submit"
                      disabled={submitting || !title.trim() || !content.trim()}
                      title="등록"
                    >
                      {submitting ? "등록중…" : "등록"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "board" && loading && (
          <AccordionListSkeleton items={5} />
        )}
        {activeTab === "notice" && noticeLoading && (
          <AccordionListSkeleton items={5} />
        )}
        <CardError message={activeTab === "board" ? error : noticeError} />
        {!loading &&
          !(activeTab === "board" ? error : noticeError) &&
          (activeTab === "board"
            ? items.length === 0
            : noticeItems.length === 0) &&
          urlPostId && (
            <div className="empty-state">해당 게시글을 찾을 수 없습니다.</div>
          )}
        {!loading &&
          !(activeTab === "board" ? error : noticeError) &&
          (activeTab === "board"
            ? items.length > 0
            : noticeItems.length > 0) && (
            <div className={acc.accordion}>
              {(activeTab === "board" ? items : noticeItems)
                .filter((it) =>
                  selectedTag === "전체"
                    ? true
                    : String(it.tag || "").trim() === selectedTag
                )
                .map((it, idx) => {
                  const id = it.id || it.post_id || idx;
                  const isOpen = urlPostId
                    ? true
                    : String(openId) === String(id);
                  const title = it.title || `게시글 ${idx + 1}`;
                  const dateStr = formatDate(it.created_at);
                  const html = enhanceHtml(it.content, !urlPostId);
                  const panelId = `board-panel-${id}`;
                  const basePath = activeTab === "notice" ? "notice" : "board";
                  const origin =
                    typeof window !== "undefined" ? window.location.origin : "";
                  const permalink = `${origin}/${basePath}/${id}`;
                  return (
                    <div
                      key={id}
                      id={`board-accordion-item-${id}`}
                      className={`${acc.item} ${
                        urlPostId ? acc.open : isOpen ? acc.open : ""
                      }`}
                    >
                      <button
                        className={acc.header}
                        onClick={() => {
                          if (urlPostId) {
                            // 단일 게시물 모드에서 제목(헤더) 클릭 시 목록으로 돌아가기 동작
                            const dest =
                              activeTab === "notice" ? "/notice" : "/board";
                            setOpenId(null);
                            try {
                              if (scrollRef.current)
                                scrollRef.current.scrollTop = 0;
                            } catch {}
                            window.history.replaceState({}, "", dest);
                            setLocationPath(dest);
                          } else {
                            setOpenId((cur) => (cur === id ? null : id));
                          }
                        }}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                      >
                        <span className={acc.title}>
                          {it.tag ? (
                            <>
                              <TagChip style={{ marginRight: 6 }}>
                                {it.tag}
                              </TagChip>{" "}
                            </>
                          ) : null}
                          {title}
                        </span>
                        <span className={acc.date}>{dateStr}</span>
                        <span className={acc.icon} aria-hidden>
                          ▾
                        </span>
                      </button>
                      <div
                        className={`accordion-panel ${acc.panel}`}
                        id={panelId}
                        role="region"
                        aria-label={`${title} 내용`}
                        aria-hidden={urlPostId ? false : !isOpen}
                      >
                        <div
                          className={acc.noticeContent}
                          onClick={onContentClick}
                        >
                          {(urlPostId || isOpen) && (
                            <PermalinkBar
                              className={styles.permalink}
                              href={permalink}
                            />
                          )}
                          <div dangerouslySetInnerHTML={{ __html: html }} />
                        </div>
                        {activeTab === "board" && (
                          <>
                            <div className={styles.boardActions}>
                              <button
                                className={form.btn}
                                onClick={() => onLike(it)}
                                aria-label="추천"
                                aria-pressed={
                                  likingId === (it.id || it.post_id)
                                }
                                disabled={likingId === (it.id || it.post_id)}
                                title="추천하기"
                              >
                                {likingId === (it.id || it.post_id)
                                  ? "…"
                                  : "👍"}{" "}
                                {it.likes || 0}
                              </button>
                            </div>
                            {/* 댓글 목록 */}
                            {(() => {
                              const key = String(it.id || it.post_id);
                              const cstate = commentsByPost[key] || {};
                              const cloading = !!cstate.loading;
                              const cerror = cstate.error;
                              const list = Array.isArray(cstate.items)
                                ? cstate.items
                                : [];
                              return (
                                <div className={styles.commentSection}>
                                  <h4 className={styles.commentHeader}>
                                    댓글 {list.length || it.comments_count || 0}
                                  </h4>
                                  {cerror && (
                                    <div
                                      className="error"
                                      style={{ margin: "8px 0" }}
                                    >
                                      댓글을 불러오지 못했어요.
                                    </div>
                                  )}
                                  {list.length > 0 && (
                                    <ul className={styles.commentList}>
                                      {list.map((c) => (
                                        <li
                                          key={c.id || c.comment_id}
                                          className={styles.commentItem}
                                        >
                                          <div className={styles.commentMeta}>
                                            <span
                                              className={styles.commentAuthor}
                                            >
                                              {c.author || c.user || "익명"}
                                            </span>
                                            <span
                                              className={styles.commentDate}
                                            >
                                              {formatDate(c.created_at)}
                                            </span>
                                          </div>
                                          <div className={styles.commentBody}>
                                            {c.content}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })()}
                            <BoardCommentBox
                              onSubmit={async (text) => {
                                await onCommentSubmit(it, text);
                              }}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        {/* 단일 게시물 모드: 목록으로 돌아가기 버튼 */}
        {urlPostId && (
          <>
            <Divider />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "8px 12px 16px",
              }}
            >
              <button
                className={form.btn}
                onClick={() => {
                  const dest = activeTab === "notice" ? "/notice" : "/board";
                  setOpenId(null);
                  // reset scroll and path to list
                  try {
                    if (scrollRef.current) scrollRef.current.scrollTop = 0;
                  } catch {}
                  window.history.replaceState({}, "", dest);
                  setLocationPath(dest);
                }}
                aria-label="목록으로 돌아가기"
                title="목록으로 돌아가기"
              >
                ← 목록으로 돌아가기
              </button>
            </div>
          </>
        )}
        {!urlPostId && (
          <>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && <LoadMoreSkeleton />}
          </>
        )}
      </div>
      <ImageModal
        open={lightboxOpen}
        src={lightboxSrc}
        alt="게시글 이미지"
        onClose={() => setLightboxOpen(false)}
      />
    </main>
  );
}
