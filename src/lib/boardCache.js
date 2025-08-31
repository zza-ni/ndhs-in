// Shared in-memory cache for /board first page (SPA session lifetime)
export const BOARD_CACHE_TTL = 60 * 1000; // 1 minute

let _cache = {
  ts: 0,
  items: null,
  cursor: null,
  hasMore: false,
};

export function getBoardListCache() {
  return _cache;
}

export function isBoardCacheFresh(now = Date.now()) {
  return Array.isArray(_cache.items) && now - _cache.ts < BOARD_CACHE_TTL;
}

export function setBoardListCache({ items, cursor, hasMore }) {
  _cache = {
    ts: Date.now(),
    items: items || [],
    cursor: cursor ?? null,
    hasMore: !!hasMore,
  };
}

export function clearBoardListCache() {
  _cache = { ts: 0, items: null, cursor: null, hasMore: false };
}
