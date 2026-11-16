/**
 * In-Memory Snapshot Cache for Orian Dashboard & Allocation Snapshots
 * 100% Strict TypeScript Implementation
 * Invalidates atomically on mutations.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class DashboardSnapshotCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 30000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const snapshotCache = new DashboardSnapshotCache();
