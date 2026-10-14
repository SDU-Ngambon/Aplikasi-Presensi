/**
 * Image Utilities & Safe Logo Loader for Chromium Kiosk & Web App
 * - Handles Mixed Content (HTTP -> HTTPS / Relative URL conversions)
 * - Fallback Inline SVG for School Logo
 * - Error-safe image event handlers
 */

export const DEFAULT_SCHOOL_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="schoolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#schoolGrad)" filter="url(#shadow)"/>
  <circle cx="50" cy="50" r="41" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="3,3" opacity="0.85"/>
  
  <!-- Graduation Cap / School Emblem -->
  <path d="M50 20 L80 35 L50 50 L20 35 Z" fill="#ffffff" />
  <path d="M28 42 V60 C28 69 72 69 72 60 V42 L50 53 Z" fill="#f1f5f9" />
  
  <!-- Tassel -->
  <path d="M78 35 V58" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="78" cy="61" r="3.5" fill="#f59e0b" />
  
  <!-- Open Book Base -->
  <path d="M35 73 C42 68 47 70 50 72 C53 70 58 68 65 73 L63 77 C57 73 53 74 50 76 C47 74 43 73 37 77 Z" fill="#38bdf8" />
</svg>
`)}`;

/**
 * Converts any image source URL into a safe, HTTPS-compatible, or root-relative URL.
 * Prevents Chromium Kiosk Mixed Content blocking when web app runs over HTTPS.
 */
export function getSafeImageUrl(rawUrl?: string | null, fallback: string = DEFAULT_SCHOOL_LOGO_SVG): string {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return fallback;
  }

  const trimmed = rawUrl.trim();

  // 1. Data URI (Base64 / SVG) -> return directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // 2. Protocol-relative URL ("//example.com/logo.png")
  if (trimmed.startsWith('//')) {
    const protocol = typeof window !== 'undefined' && window.location.protocol.startsWith('http') 
      ? window.location.protocol 
      : 'https:';
    return `${protocol}${trimmed}`;
  }

  // 3. Root-relative path ("/uploads/logo.png")
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // 4. Relative path without leading slash ("uploads/logo.png" or "logo.png")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `/${trimmed}`;
  }

  // 5. Full URL with HTTP / HTTPS
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (typeof window !== 'undefined') {
      try {
        const parsed = new URL(trimmed);
        // If the URL points to the current host/port, make it root-relative
        if (parsed.host === window.location.host) {
          return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        // If current page is loaded over HTTPS, upgrade http:// to https://
        if (window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
          return trimmed.replace(/^http:\/\//i, 'https://');
        }
      } catch (e) {
        if (window.location.protocol === 'https:') {
          return trimmed.replace(/^http:\/\//i, 'https://');
        }
      }
    } else {
      // Server-side / fallback
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
  }

  return trimmed;
}

/**
 * Error event handler for <img> elements.
 * Automatically swaps the broken image with the fallback SVG and halts loop.
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_SCHOOL_LOGO_SVG
): void {
  const target = e.currentTarget;
  if (target.src !== fallbackSrc) {
    target.onerror = null; // Prevent infinite error loop
    target.src = fallbackSrc;
  }
}
