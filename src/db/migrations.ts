/**
 * Orian Database Migrations
 * 100% Strict TypeScript idempotent, version-tracked database schema migrations.
 */

import type { DatabaseSync } from 'node:sqlite';

interface UserVersionRow {
  user_version: number;
}

export function runMigrations(db: DatabaseSync): void {
  const currentVersionRow = db.prepare('PRAGMA user_version').get() as unknown as UserVersionRow | undefined;
  const currentVersion = currentVersionRow ? currentVersionRow.user_version : 0;

  if (currentVersion < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#1A6B4E',
        effort_multiplier REAL DEFAULT 1.0,
        multiplier_expires_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        lecture_number INTEGER,
        title TEXT,
        status TEXT DEFAULT 'scheduled',
        is_makeup INTEGER DEFAULT 0,
        is_crunch_deferred INTEGER DEFAULT 0,
        attended_at TEXT,
        reviewed_at TEXT,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_classes_course_date ON classes(course_id, date);
      CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date);

      CREATE TABLE IF NOT EXISTS routine_slots (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_routine_day ON routine_slots(day_of_week);

      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        assessment_type TEXT NOT NULL DEFAULT 'CT',
        exam_date TEXT NOT NULL,
        syllabus_range TEXT DEFAULT 'ALL',
        revision_target_blocks INTEGER DEFAULT 4,
        is_completed INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(exam_date);

      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        course_id TEXT,
        assessment_id TEXT,
        class_id TEXT,
        session_mode TEXT DEFAULT 'focus',
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_seconds INTEGER NOT NULL,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE SET NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pomo_started ON pomodoro_sessions(started_at);

      CREATE TABLE IF NOT EXISTS active_timer (
        id TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        target_duration_seconds INTEGER NOT NULL,
        status TEXT NOT NULL,
        paused_elapsed_seconds INTEGER DEFAULT 0,
        course_id TEXT,
        assessment_id TEXT,
        class_id TEXT,
        session_mode TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      PRAGMA user_version = 1;
    `);
  }
}
