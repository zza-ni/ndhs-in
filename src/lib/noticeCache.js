// Shared in-memory cache for /notice first page (lives for SPA session)
export const NOTICE_CACHE_TTL = 60 * 1000; // 1 minute

let _cache = {
  ts: 0,
  items: null,
  cursor: null,
  hasMore: false,
};

export function getNoticeListCache() {
  return _cache;
}

export function isNoticeCacheFresh(now = Date.now()) {
  return Array.isArray(_cache.items) && now - _cache.ts < NOTICE_CACHE_TTL;
}

export function setNoticeListCache({ items, cursor, hasMore }) {
  _cache = {
    ts: Date.now(),
    items: items || [],
    cursor: cursor ?? null,
    hasMore: !!hasMore,
  };
}

export function clearNoticeListCache() {
  _cache = { ts: 0, items: null, cursor: null, hasMore: false };
}
