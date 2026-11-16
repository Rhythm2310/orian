/**
 * In-Memory Snapshot Cache for Orian Dashboard & Allocation Snapshots
 * Invalidates atomically on mutations.
 */

class DashboardSnapshotCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = 30000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  invalidate(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const snapshotCache = new DashboardSnapshotCache();
