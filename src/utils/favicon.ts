/**
 * Dynamic Favicon Updater for Realtime Browser Tab Icon changes
 * Removes existing icon links and creates a fresh link to force instant browser tab repaint
 */
export function updateFavicon(url: string) {
  if (!url || typeof url !== 'string') return;
  try {
    // 1. Remove all existing favicon / icon link elements
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(el => el.remove());

    // 2. Create fresh link element
    const link = document.createElement('link');
    link.id = 'app-favicon';
    link.rel = 'icon';

    if (url.startsWith('data:image/svg')) {
      link.type = 'image/svg+xml';
      link.href = url;
    } else if (url.startsWith('data:image/png')) {
      link.type = 'image/png';
      link.href = url;
    } else if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) {
      link.type = 'image/jpeg';
      link.href = url;
    } else if (url.startsWith('data:image/x-icon') || url.startsWith('data:image/vnd.microsoft.icon')) {
      link.type = 'image/x-icon';
      link.href = url;
    } else {
      // It's a URL path, append cache buster timestamp
      link.type = url.endsWith('.svg') ? 'image/svg+xml' : url.endsWith('.png') ? 'image/png' : 'image/x-icon';
      const cacheBust = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
      link.href = `${url}${cacheBust}`;
    }

    document.head.appendChild(link);

    // Also add shortcut icon for maximum browser compatibility
    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = link.type;
    shortcutLink.href = link.href;
    document.head.appendChild(shortcutLink);

    // Save to localStorage for instant hydration on subsequent reloads
    try {
      localStorage.setItem('appFavicon', url);
    } catch (e) {}

    // Dispatch global event for other components if needed
    window.dispatchEvent(new CustomEvent('appFaviconUpdated', { detail: { favicon: url } }));
  } catch (e) {
    console.warn('Gagal memperbarui favicon secara dinamis:', e);
  }
}
