// Utilities for enhancing and hydrating HTML content with images
// - enhanceHtml: sanitizes content and applies image loading strategy (defer or eager)
// - hydrateImagesInElement: converts data-src/srcset back to real attributes at runtime

// Precompiled regexes for performance
const SCRIPT_TAG_RE = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const IMG_TAG_RE = /<img\b[^>]*>/gi;
const ATTR_ON_EVENT_DQ_RE = /\son\w+="[^"]*"/gi; // on*="..."
const ATTR_ON_EVENT_SQ_RE = /\son\w+='[^']*'/gi; // on*='...'

/**
 * Enhance raw HTML for safe rendering and image loading behavior.
 * @param {string} html - Raw HTML from backend
 * @param {{ imageBase?: string, deferImages?: boolean }} options
 *  - imageBase: value for replacing [IMGPATH]
 *  - deferImages: if true, move src/srcset to data-* and set loading=lazy; if false, ensure src/srcset and loading=eager
 */
export function enhanceHtml(html, { imageBase = "", deferImages = true } = {}) {
  if (!html) return "";
  let out = html;
  if (imageBase) out = out.replaceAll("[IMGPATH]", imageBase);
  // Strip scripts and inline handlers
  out = out.replace(SCRIPT_TAG_RE, "");
  out = out.replace(ATTR_ON_EVENT_DQ_RE, "");
  out = out.replace(ATTR_ON_EVENT_SQ_RE, "");
  // Ensure anchors are safe
  out = out.replace(/<a /g, '<a target="_blank" rel="noreferrer noopener" ');

  if (deferImages) {
    // Move src/srcset => data-* and default to lazy
    out = out.replace(IMG_TAG_RE, (tag) => {
      let t = tag;
      t = t.replace(/\s+srcset=(["'])(.*?)\1/gi, ' data-srcset="$2"');
      t = t.replace(/\ssrc=(["'])(.*?)\1/gi, ' data-src="$2"');
      if (!/\bloading\s*=/.test(t))
        t = t.replace(/<img\b/i, '<img loading="lazy"');
      return t;
    });
  } else {
    // Eager: convert any data-* back, set decoding async and loading=eager
    out = out.replace(IMG_TAG_RE, (tag) => {
      let t = tag;
      t = t.replace(/\s+data-srcset=(["'])(.*?)\1/gi, ' srcset="$2"');
      t = t.replace(/\s+data-src=(["'])(.*?)\1/gi, ' src="$2"');
      if (!/\bdecoding\s*=/.test(t))
        t = t.replace(/<img\b/i, '<img decoding="async"');
      if (/\bloading\s*=\s*(["'])lazy\1/i.test(t))
        t = t.replace(/\bloading\s*=\s*(["'])lazy\1/i, ' loading="eager"');
      else if (!/\bloading\s*=/.test(t))
        t = t.replace(/<img\b/i, '<img loading="eager"');
      return t;
    });
    // Ensure any stray matches are normalized
    out = out.replace(/data-srcset=/gi, "srcset=");
    out = out.replace(/data-src=/gi, "src=");
  }
  return out;
}

/**
 * Hydrate images inside a container, converting data-src/srcset to real attributes.
 * @param {HTMLElement} root
 * @param {{ eager?: boolean }} opts - if eager, set loading=eager; otherwise default to lazy when missing
 */
export function hydrateImagesInElement(root, opts = {}) {
  if (!root) return;
  const { eager = false } = opts;
  const imgs = root.querySelectorAll("img[data-src], img[data-srcset]");
  imgs.forEach((img) => {
    const ds = img.getAttribute("data-src");
    const dss = img.getAttribute("data-srcset");
    if (dss) {
      img.setAttribute("srcset", dss);
      img.removeAttribute("data-srcset");
    }
    if (ds) {
      img.setAttribute("src", ds);
      img.removeAttribute("data-src");
    }
    img.setAttribute("decoding", "async");
    if (eager) img.setAttribute("loading", "eager");
    else if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
  });
}
