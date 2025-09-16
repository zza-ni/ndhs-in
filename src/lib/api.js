// Shared API utilities
// Global fetchWithRetry: up to N retries with small backoff; on final failure, alert and redirect by default.
export async function fetchWithRetry(
  url,
  options = {},
  { retries = 3, onFinalFail } = {}
) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < retries) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      attempt += 1;
      if (attempt >= retries) {
        try {
          if (typeof onFinalFail === "function") {
            onFinalFail(e);
          } else {
            try {
              alert("서버 에러. 잠시 후 재시도해주세요");
            } catch {}
            try {
              window.location.href = "/";
            } catch {}
          }
        } catch {}
        throw e;
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr || new Error("network");
}
