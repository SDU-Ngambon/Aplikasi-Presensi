/**
 * Safe localStorage wrapper that handles iframe sandboxing and restricted environments.
 */

const memoryFallback: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string, fallback: string | null = null): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : (memoryFallback[key] ?? fallback);
      }
    } catch (e) {
      // In sandboxed iframes, localStorage might throw SecurityError
    }
    return memoryFallback[key] ?? fallback;
  },

  setItem: (key: string, value: string): void => {
    memoryFallback[key] = value;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      // Ignore security errors in sandboxed iframes
    }
  },

  removeItem: (key: string): void => {
    delete memoryFallback[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore
    }
  },

  getJSON: <T = any>(key: string, fallback: T): T => {
    try {
      const raw = safeStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      // Fallback
    }
    return fallback;
  },

  setJSON: (key: string, value: any): void => {
    try {
      safeStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Ignore
    }
  }
};
