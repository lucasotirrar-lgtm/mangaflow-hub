/**
 * Safe localStorage wrapper with in-memory fallback for Private Browsing / quota restrictions.
 */
const memoryStore = new Map<string, string>();
const fallbackKeys = new Set<string>();

export const safeStorage = {
  getItem(key: string): string | null {
    if (fallbackKeys.has(key)) return memoryStore.get(key) ?? null;
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return memoryStore.get(key) ?? null;
      }
      const val = window.localStorage.getItem(key);
      return val;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      memoryStore.set(key, value);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        fallbackKeys.delete(key);
      } else {
        fallbackKeys.add(key);
      }
    } catch {
      fallbackKeys.add(key);
      // Gracefully fall back to in-memory store if storage quota or permissions block writes
    }
  },

  removeItem(key: string): void {
    try {
      memoryStore.delete(key);
      fallbackKeys.delete(key);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      memoryStore.delete(key);
      fallbackKeys.add(key);
    }
  },
};
