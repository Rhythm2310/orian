/**
 * Orian Database Client
 * 100% Strict TypeScript node:sqlite WAL initialization
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Creates and initializes a node:sqlite DatabaseSync instance
 * with WAL mode, foreign keys, and busy timeout.
 */
export function createDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Set performance and integrity PRAGMAs
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');

  return db;
}
