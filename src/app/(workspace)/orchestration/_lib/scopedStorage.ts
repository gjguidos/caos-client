/**
 * localStorage access namespaced under a fixed prefix and keyed by scope parts
 * (`<prefix>:<part>:<part>`).
 * All operations are wrapped in try/catch: localStorage is unavailable in SSR
 * and can throw in private-browsing modes or when storage is full.
 */

export interface ScopedStorage {
  save(scope: readonly string[], value: string): void;
  load(scope: readonly string[]): string | null;
  clear(scope: readonly string[]): void;
}

export function scopedStorage(prefix: string): ScopedStorage {
  const keyFor = (scope: readonly string[]) => [prefix, ...scope].join(":");

  return {
    save(scope, value) {
      try {
        localStorage.setItem(keyFor(scope), value);
      } catch {
        // SSR, quota exceeded, or private browsing — silently ignore.
      }
    },
    load(scope) {
      try {
        return localStorage.getItem(keyFor(scope));
      } catch {
        return null;
      }
    },
    clear(scope) {
      try {
        localStorage.removeItem(keyFor(scope));
      } catch {
        // ignore
      }
    },
  };
}
