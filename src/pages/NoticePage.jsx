import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getNoticeListCache, isNoticeCacheFresh, setNoticeListCache } from '../lib/noticeCache';

export default function NoticePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [selectedTag, setSelectedTag] = useState('전체');
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = React.useRef(null);
  const { postId } = useParams();
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const scrollRef = React.useRef(null);

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;
  const NOTICE_API = `${API_ENDPOINT.replace(/\/$/, '')}/boards/notice`;
  const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE;

  // Swap deferred image attributes to real ones within a given root element
  const loadImagesInElement = (root) => {
    if (!root) return;
    const imgs = root.querySelectorAll('img[data-src], img[data-srcset]');
    imgs.forEach((img) => {
      const ds = img.getAttribute('data-src');
      const dss = img.getAttribute('data-srcset');
      if (dss) {
        img.setAttribute('srcset', dss);
        img.removeAttribute('data-srcset');
      }
      if (ds) {
        img.setAttribute('src', ds);
        img.removeAttribute('data-src');
      }
      // Ensure lazy decoding for smoother paint
      img.setAttribute('decoding', 'async');
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
    });
  };

  const formatDate = (yyyymmddHHMMSS) => {
    if (!yyyymmddHHMMSS) return '';
    const s = String(yyyymmddHHMMSS);
    const yy = s.slice(2, 4);
    const m = String(parseInt(s.slice(4, 6), 10));
    const d = String(parseInt(s.slice(6, 8), 10));
    const hh = s.slice(8, 10) || '00';
    const mm = s.slice(10, 12) || '00';
    return `${yy}/${m}/${d} ${hh}:${mm}`;
  };

  const enhanceHtml = (html) => {
    if (!html) return '';
    // Replace placeholder image path and strip script tags for safety
    let out = html.replaceAll('[IMGPATH]', IMAGE_BASE);
    out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    // remove inline event handlers
    out = out.replace(/\son\w+="[^"]*"/gi, '');
    out = out.replace(/\son\w+='[^']*'/gi, '');
    // Ensure anchor tags open in new tab securely
    out = out.replace(/<a /g, '<a target="_blank" rel="noreferrer noopener" ');
    // Defer image loading: move src/srcset to data-* so they don't load until panel opens
    out = out.replace(/<img\b[^>]*>/gi, (tag) => {
      let t = tag;
      // Move srcset -> data-srcset
      t = t.replace(/\s+srcset=(['"])(.*?)\1/gi, ' data-srcset="$2"');
      // Move src -> data-src (doesn't match data-src)
      t = t.replace(/\ssrc=(['"])(.*?)\1/gi, ' data-src="$2"');
      // Ensure lazy attribute exists
      if (!/\sloading=/.test(t)) {
        // Put loading right after <img
        t = t.replace(/<img\b/, '<img loading="lazy"');
      }
      return t;
    });
    return out;
  };

  async function fetchNoticesPageWithCursor(nextCursor = null) {
    const u = new URL(NOTICE_API);
    if (nextCursor) u.searchParams.set('last', nextCursor);
    const res = await fetch(u.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    const posts = Array.isArray(data?.posts) ? data.posts : [];
    const newCursor = data?.last ?? null;
    return { posts, newCursor };
  }

  async function fetchSinglePost(id) {
    const url = `${NOTICE_API}/${id}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();
    if (Array.isArray(data?.posts)) return data.posts[0] || null;
    if (data && (data.id || data.post_id || data.title)) return data;
    return null;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (postId) {
          const post = await fetchSinglePost(postId);
          if (cancelled) return;
          setItems(post ? [post] : []);
          setHasMore(false);
          setCursor(null);
        } else {
          // Try shared cache first
          if (isNoticeCacheFresh()) {
            const c = getNoticeListCache();
            setItems(c.items || []);
            setCursor(c.cursor ?? null);
            setHasMore(!!c.hasMore);
          } else {
            const { posts, newCursor } = await fetchNoticesPageWithCursor(null);
            if (cancelled) return;
            setItems(posts);
            setCursor(newCursor);
            const more = !!newCursor && posts.length > 0;
            setHasMore(more);
            // Update cache
            setNoticeListCache({ items: posts, cursor: newCursor, hasMore: more });
          }
        }
      } catch (e) {
        if (!cancelled) setError('공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [NOTICE_API, postId]);

  // 아코디언 열 때 해당 아이템 상단으로 스크롤
  useEffect(() => {
    if (!openId) return;
    const itemEl = document.getElementById(`accordion-item-${openId}`);
    const panelEl = itemEl?.querySelector('.accordion-panel');
    const container = scrollRef.current;
    if (!itemEl || !panelEl || !container) return;

    let scrolled = false;
    const onTransitionEnd = (e) => {
      if (e.target !== panelEl || e.propertyName !== 'max-height' || scrolled) return;
      scrolled = true;
  // Hydrate deferred images within the opened panel
  loadImagesInElement(panelEl);
      // 패널이 완전히 열렸을 때 스크롤 이동
      const cRect = container.getBoundingClientRect();
      const eRect = itemEl.getBoundingClientRect();
      const offset = eRect.top - cRect.top;
      // 더 부드러운 스크롤: requestAnimationFrame + 작은 추가 오프셋
      const target = container.scrollTop + offset - 2; // 기존 -12에서 -15로 3px 더 위로
      let start = null;
      const initial = container.scrollTop;
      const distance = target - initial;
      const duration = 420; // ms, 더 부드럽게
      function step(ts) {
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / duration, 1);
        container.scrollTop = initial + distance * easeInOutCubic(progress);
        if (progress < 1) requestAnimationFrame(step);
      }
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }
      requestAnimationFrame(step);
      panelEl.removeEventListener('transitionend', onTransitionEnd);
    };
    panelEl.addEventListener('transitionend', onTransitionEnd);
    // 혹시 이미 transition이 없거나 바로 열려있으면 fallback
    if (getComputedStyle(panelEl).maxHeight === '1200px') {
      setTimeout(() => {
        if (!scrolled) {
          // Hydrate images even if no transition triggered
          loadImagesInElement(panelEl);
          const cRect = container.getBoundingClientRect();
          const eRect = itemEl.getBoundingClientRect();
          const offset = eRect.top - cRect.top;
          container.scrollTo({ top: container.scrollTop + offset - 12, behavior: 'smooth' });
        }
      }, 250);
    }
    return () => panelEl.removeEventListener('transitionend', onTransitionEnd);
  }, [openId]);

  // Ensure images in single-post mode are hydrated immediately, and also hydrate when items first load
  useEffect(() => {
    if (loading) return;
    const container = scrollRef.current;
    if (!container) return;
    if (postId) {
      container.querySelectorAll('.accordion-item.open .accordion-panel').forEach((el) => loadImagesInElement(el));
    } else if (openId) {
      const el = document.getElementById(`accordion-item-${openId}`)?.querySelector('.accordion-panel');
      if (el) loadImagesInElement(el);
    }
  }, [loading, items, postId, openId]);

  const toggle = (id) => setOpenId((cur) => (cur === id ? null : id));

  // 이미지 클릭 시 라이트박스 모달 열기 (이벤트 위임)
  const onContentClick = (e) => {
    // 이미지 또는 이미지 링크를 찾아 모달로 표시
    const img = e.target.closest('img');
    const link = e.target.closest('a');
    let src = '';
    if (img) {
      src = img.getAttribute('data-src') || img.currentSrc || img.src;
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

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape') setLightboxOpen(false);
    };
    if (lightboxOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  // Lock background scroll when modal open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [lightboxOpen]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (postId) return; // 단일 게시물 모드에서는 로드 중단
    const el = sentinelRef.current;
    const rootEl = scrollRef.current;
    if (!el || !hasMore || loading || loadingMore) return;
    let stopped = false;
    const io = new IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting || stopped) return;
      stopped = true;
      setLoadingMore(true);
      try {
        const { posts: more, newCursor } = await fetchNoticesPageWithCursor(cursor);
        // Build updated list using current state to also update cache deterministically
  const updated = (() => {
          const map = new Map((items || []).map((p) => [p.id || p.post_id, p]));
          more.forEach((p) => map.set(p.id || p.post_id, p));
          return Array.from(map.values());
        })();
        setItems(updated);
        setCursor(newCursor);
        const moreFlag = !!newCursor && more.length > 0;
        setHasMore(moreFlag);
  // Update cache
  setNoticeListCache({ items: updated, cursor: newCursor, hasMore: moreFlag });
      } catch {
        // ignore
      } finally {
        setLoadingMore(false);
        setTimeout(() => { stopped = false; }, 300);
      }
    }, { root: rootEl || null, rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, hasMore, loading, loadingMore, postId, items]);

  return (
    <main className="main-content page-content">
      <div className="header simple">
        <div onClick={() => (window.location.href = '/')}> 
          <img src="/src/logo.png" alt="남도인 로고" width="48" height="48" />
        </div>
        <h2 style={{ marginLeft: 12 }}>공지사항</h2>
      </div>
  <div className="container" ref={scrollRef}>
        {/* 태그 필터 탭: 단일 글(postId)에서는 숨김 */}
        {!loading && !postId && (
          <div className="tags-bar">
            {['전체', ...Array.from(new Set(items.map((i) => i.tag).filter(Boolean)))]
              .map((tag) => (
                <button
                  key={tag}
                  className={`tag-chip${selectedTag === tag ? ' active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
          </div>
        )}

        {loading && (
          <div className="skeleton-list">
            {[0,1,2].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-row">
                  <div className="skeleton skeleton-title" />
                  <div className="skeleton skeleton-date" />
                </div>
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </div>
        )}
        {error && <p style={{ color: 'tomato' }}>{error}</p>}
        {!loading && !error && items.length === 0 && postId && (
          <div className="empty-state">
            해당 공지를 찾을 수 없습니다.
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="accordion">
            {items
              .filter((it) => selectedTag === '전체' || it.tag === selectedTag)
              .map((it, idx) => {
              const id = it.id || it.post_id || idx;
              const isOpen = postId ? true : String(openId) === String(id);
              const title = it.title || `공지 ${idx + 1}`;
              const dateStr = formatDate(it.created_at);
              const html = enhanceHtml(it.content);
              const panelId = `notice-panel-${id}`;
              return (
                <div key={id} id={`accordion-item-${id}`} className={`accordion-item${postId ? ' open' : isOpen ? ' open' : ''}`}>
                  <button
                    className="accordion-header"
                    onClick={() => (postId ? null : toggle(id))}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className="accordion-title">{title}</span>
                    <span className="accordion-date">{dateStr}</span>
                    <span className="accordion-icon" aria-hidden>▾</span>
                  </button>
                  <div
                    className="accordion-panel"
                    id={panelId}
                    role="region"
                    aria-label={`${title} 내용`}
                    aria-hidden={postId ? false : !isOpen}
                  >
                    <div className="notice-content" onClick={onContentClick} dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!postId && (
          <>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <div className="skeleton-list more">
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            )}
          </>
        )}
      </div>
      {lightboxOpen && (
        <div className="modal image-modal" onClick={() => setLightboxOpen(false)}>
          <div className="modal-content full" onClick={() => setLightboxOpen(false)}>
            <img src={lightboxSrc} alt="공지 이미지" onClick={() => setLightboxOpen(false)} style={{ maxWidth: '100vw', maxHeight: '100vh' }} />
          </div>
        </div>
      )}
    </main>
  );
}
