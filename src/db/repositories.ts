/**
 * Orian Database Repositories
 * 100% Strict TypeScript Transactional Repositories
 */

import type { DatabaseSync, StatementSync } from 'node:sqlite';
import crypto from 'node:crypto';
import type {
  Course,
  CourseInput,
  CourseUpdateInput,
  ClassSession,
  ClassSessionInput,
  RoutineSlot,
  RoutineSlotInput,
  Assessment,
  AssessmentInput,
  PomodoroSession,
  ActiveTimerState,
  SettingsState,
  BackupPayload,
  PomodoroMode
} from '../types/domain.ts';
import { parseSyllabusRange } from '../core/validators.ts';

function genId(prefix = ''): string {
  return `${prefix}${crypto.randomUUID()}`;
}

export class CoursesRepository {
  private db: DatabaseSync;
  private stmtGetById: StatementSync;
  private stmtGetAll: StatementSync;
  private stmtInsert: StatementSync;
  private stmtDelete: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGetById = db.prepare('SELECT * FROM courses WHERE id = ?');
    this.stmtGetAll = db.prepare('SELECT * FROM courses ORDER BY code ASC');
    this.stmtInsert = db.prepare(`
      INSERT INTO courses (id, name, code, color, effort_multiplier, multiplier_expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.stmtDelete = db.prepare('DELETE FROM courses WHERE id = ?');
  }

  create({ name, code, color = '#1A6B4E', effort_multiplier = 1.0, multiplier_expires_at = null }: CourseInput): Course {
    const id = genId('crs_');
    const createdAt = new Date().toISOString();
    this.stmtInsert.run(id, name, code, color, effort_multiplier, multiplier_expires_at, createdAt);
    return this.getById(id)!;
  }

  getById(id: string): Course | null {
    const row = this.stmtGetById.get(id);
    return (row as unknown as Course) || null;
  }

  getAll(): Course[] {
    return this.stmtGetAll.all() as unknown as Course[];
  }

  update(id: string, fields: CourseUpdateInput): Course | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (fields.name !== undefined) {
      updates.push('name = ?');
      values.push(fields.name);
    }
    if (fields.code !== undefined) {
      updates.push('code = ?');
      values.push(fields.code);
    }
    if (fields.color !== undefined) {
      updates.push('color = ?');
      values.push(fields.color);
    }
    if (fields.effort_multiplier !== undefined) {
      updates.push('effort_multiplier = ?');
      values.push(fields.effort_multiplier);
    }
    if (fields.multiplier_expires_at !== undefined) {
      updates.push('multiplier_expires_at = ?');
      values.push(fields.multiplier_expires_at);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE courses SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...(values as (string | number | bigint | null)[]));
    return this.getById(id);
  }

  delete(id: string): boolean {
    this.stmtDelete.run(id);
    return true;
  }
}

export class ClassesRepository {
  private db: DatabaseSync;
  private stmtGetById: StatementSync;
  private stmtGetByDate: StatementSync;
  private stmtGetUnwatched: StatementSync;
  private stmtInsert: StatementSync;
  private stmtDelete: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGetById = db.prepare(`
      SELECT cl.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM classes cl
      LEFT JOIN courses co ON cl.course_id = co.id
      WHERE cl.id = ?
    `);
    this.stmtGetByDate = db.prepare(`
      SELECT cl.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.date = ?
      ORDER BY cl.start_time ASC
    `);
    this.stmtGetUnwatched = db.prepare(`
      SELECT cl.*, co.name as course_name, co.code as course_code, co.color as course_color, co.effort_multiplier
      FROM classes cl
      JOIN courses co ON cl.course_id = co.id
      WHERE cl.status IN ('scheduled', 'missed', 'online_recorded')
      ORDER BY cl.date ASC, cl.lecture_number ASC
    `);
    this.stmtInsert = db.prepare(`
      INSERT INTO classes (id, course_id, date, start_time, end_time, lecture_number, title, status, is_makeup, is_crunch_deferred, attended_at, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.stmtDelete = db.prepare('DELETE FROM classes WHERE id = ?');
  }

  create({
    course_id,
    date,
    start_time = '09:00',
    end_time = '10:30',
    lecture_number = 1,
    status = 'scheduled',
    is_makeup = 0,
    is_crunch_deferred = 0,
    notes = null
  }: ClassSessionInput): ClassSession {
    const id = genId('cls_');
    this.stmtInsert.run(
      id,
      course_id,
      date,
      start_time,
      end_time,
      lecture_number ?? 1,
      notes || '',
      status,
      is_makeup ?? 0,
      is_crunch_deferred ?? 0,
      null,
      null
    );
    return this.getById(id)!;
  }

  getById(id: string): ClassSession | null {
    const row = this.stmtGetById.get(id);
    return (row as unknown as ClassSession) || null;
  }

  getByDate(dateStr: string): ClassSession[] {
    return this.stmtGetByDate.all(dateStr) as unknown as ClassSession[];
  }

  getUnwatched(): ClassSession[] {
    return this.stmtGetUnwatched.all() as unknown as ClassSession[];
  }

  getNextLectureNumber(courseId: string): number {
    const row = this.db.prepare('SELECT COALESCE(MAX(lecture_number), 0) + 1 as next_num FROM classes WHERE course_id = ?').get(courseId) as { next_num: number } | undefined;
    return row ? Number(row.next_num) : 1;
  }

  markCrunchDeferred(id: string, deferred = 1): ClassSession | null {
    this.db.prepare('UPDATE classes SET is_crunch_deferred = ? WHERE id = ?').run(deferred, id);
    return this.getById(id);
  }

  markAttended(id: string): ClassSession | null {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE classes SET status = 'attended', attended_at = ? WHERE id = ?").run(now, id);
    return this.getById(id);
  }

  markReviewed(id: string): ClassSession | null {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE classes SET status = 'reviewed', reviewed_at = ? WHERE id = ?").run(now, id);
    return this.getById(id);
  }

  update(id: string, fields: Partial<ClassSessionInput>): ClassSession | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    const allowedKeys: (keyof ClassSessionInput)[] = [
      'date', 'start_time', 'end_time', 'lecture_number', 'status', 'is_makeup', 'is_crunch_deferred'
    ];

    for (const key of allowedKeys) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key] as string | number | null);
      }
    }

    if (fields.notes !== undefined) {
      updates.push('title = ?');
      values.push(fields.notes);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE classes SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...(values as (string | number | bigint | null)[]));
    return this.getById(id);
  }

  delete(id: string): boolean {
    this.stmtDelete.run(id);
    return true;
  }
}

export class RoutineRepository {
  private db: DatabaseSync;
  private stmtGetById: StatementSync;
  private stmtGetAll: StatementSync;
  private stmtGetByDay: StatementSync;
  private stmtInsert: StatementSync;
  private stmtDelete: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGetById = db.prepare(`
      SELECT rs.*, rs.location as room, co.name as course_name, co.code as course_code, co.color as course_color
      FROM routine_slots rs
      LEFT JOIN courses co ON rs.course_id = co.id
      WHERE rs.id = ?
    `);
    this.stmtGetAll = db.prepare(`
      SELECT rs.*, rs.location as room, co.name as course_name, co.code as course_code, co.color as course_color
      FROM routine_slots rs
      JOIN courses co ON rs.course_id = co.id
      ORDER BY rs.day_of_week ASC, rs.start_time ASC
    `);
    this.stmtGetByDay = db.prepare(`
      SELECT rs.*, rs.location as room, co.name as course_name, co.code as course_code, co.color as course_color
      FROM routine_slots rs
      JOIN courses co ON rs.course_id = co.id
      WHERE rs.day_of_week = ?
      ORDER BY rs.start_time ASC
    `);
    this.stmtInsert = db.prepare(`
      INSERT INTO routine_slots (id, course_id, day_of_week, start_time, end_time, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.stmtDelete = db.prepare('DELETE FROM routine_slots WHERE id = ?');
  }

  create({ course_id, day_of_week, start_time, end_time, room = '' }: RoutineSlotInput): RoutineSlot {
    const id = genId('rot_');
    this.stmtInsert.run(id, course_id, day_of_week, start_time, end_time, room || '');
    return this.getById(id)!;
  }

  getById(id: string): RoutineSlot | null {
    const row = this.stmtGetById.get(id);
    return (row as unknown as RoutineSlot) || null;
  }

  getAll(): RoutineSlot[] {
    return this.stmtGetAll.all() as unknown as RoutineSlot[];
  }

  getByDay(dayOfWeek: number): RoutineSlot[] {
    return this.stmtGetByDay.all(dayOfWeek) as unknown as RoutineSlot[];
  }

  delete(id: string): boolean {
    this.stmtDelete.run(id);
    return true;
  }
}

export class AssessmentsRepository {
  private db: DatabaseSync;
  private stmtGetById: StatementSync;
  private stmtGetAll: StatementSync;
  private stmtGetUpcoming: StatementSync;
  private stmtInsert: StatementSync;
  private stmtDelete: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGetById = db.prepare(`
      SELECT a.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM assessments a
      LEFT JOIN courses co ON a.course_id = co.id
      WHERE a.id = ?
    `);
    this.stmtGetAll = db.prepare(`
      SELECT a.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM assessments a
      JOIN courses co ON a.course_id = co.id
      ORDER BY a.exam_date ASC
    `);
    this.stmtGetUpcoming = db.prepare(`
      SELECT a.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM assessments a
      JOIN courses co ON a.course_id = co.id
      WHERE a.is_completed = 0 AND a.exam_date >= ?
      ORDER BY a.exam_date ASC
    `);
    this.stmtInsert = db.prepare(`
      INSERT INTO assessments (id, course_id, title, assessment_type, exam_date, syllabus_range, revision_target_blocks, is_completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.stmtDelete = db.prepare('DELETE FROM assessments WHERE id = ?');
  }

  create({
    course_id,
    title,
    assessment_type = 'CT',
    exam_date,
    syllabus_range = 'ALL',
    revision_target_blocks = 4,
    is_completed = 0
  }: AssessmentInput): Assessment {
    const id = genId('asm_');
    const createdAt = new Date().toISOString();
    this.stmtInsert.run(
      id,
      course_id,
      title,
      assessment_type,
      exam_date,
      syllabus_range,
      revision_target_blocks,
      is_completed,
      createdAt
    );
    const item = this.getById(id)!;
    return {
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    };
  }

  getById(id: string): Assessment | null {
    const item = this.stmtGetById.get(id) as unknown as Assessment | undefined;
    if (!item) return null;
    return {
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    };
  }

  getAll(): Assessment[] {
    const rows = this.stmtGetAll.all() as unknown as Assessment[];
    return rows.map(item => ({
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    }));
  }

  getUpcoming(fromDateStr = new Date().toISOString().substring(0, 10)): Assessment[] {
    const rows = this.stmtGetUpcoming.all(fromDateStr) as unknown as Assessment[];
    return rows.map(item => ({
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    }));
  }

  markCompleted(id: string, isCompleted: number | boolean = 1): Assessment | null {
    const completedVal = isCompleted ? 1 : 0;
    this.db.prepare('UPDATE assessments SET is_completed = ? WHERE id = ?').run(completedVal, id);
    return this.getById(id);
  }

  update(id: string, fields: Partial<AssessmentInput>): Assessment | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    const allowedKeys: (keyof AssessmentInput)[] = [
      'title', 'assessment_type', 'exam_date', 'syllabus_range', 'revision_target_blocks', 'is_completed'
    ];

    for (const key of allowedKeys) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key] as string | number | null);
      }
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE assessments SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...(values as (string | number | bigint | null)[]));
    return this.getById(id);
  }

  delete(id: string): boolean {
    this.stmtDelete.run(id);
    return true;
  }
}

export interface SaveActiveTimerOptions {
  started_at?: number;
  target_duration_seconds?: number;
  status?: string;
  paused_elapsed_seconds?: number;
  course_id?: string | null;
  assessment_id?: string | null;
  class_id?: string | null;
  session_mode?: string;
  notes?: string;
}

export interface LogSessionOptions {
  course_id?: string | null;
  assessment_id?: string | null;
  class_id?: string | null;
  session_mode?: string;
  started_at?: number;
  ended_at?: number;
  duration_seconds?: number;
  status?: string;
  notes?: string;
}

export class PomodoroRepository {
  private db: DatabaseSync;
  private stmtGetActive: StatementSync;
  private stmtClearActive: StatementSync;
  private stmtInsertActive: StatementSync;
  private stmtInsertSession: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGetActive = db.prepare('SELECT * FROM active_timer LIMIT 1');
    this.stmtClearActive = db.prepare('DELETE FROM active_timer');
    this.stmtInsertActive = db.prepare(`
      INSERT INTO active_timer (id, started_at, target_duration_seconds, status, paused_elapsed_seconds, course_id, assessment_id, class_id, session_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.stmtInsertSession = db.prepare(`
      INSERT INTO pomodoro_sessions (id, course_id, assessment_id, class_id, session_mode, started_at, ended_at, duration_seconds, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  saveActiveTimer({
    started_at = Date.now(),
    target_duration_seconds = 1500,
    status = 'running',
    paused_elapsed_seconds = 0,
    course_id = null,
    assessment_id = null,
    class_id = null,
    session_mode = 'focus',
    notes = ''
  }: SaveActiveTimerOptions): ActiveTimerState | null {
    this.clearActiveTimer();
    const id = genId('act_');
    this.stmtInsertActive.run(
      id,
      started_at,
      target_duration_seconds,
      status,
      paused_elapsed_seconds,
      course_id,
      assessment_id,
      class_id,
      session_mode,
      notes
    );
    return this.getActiveTimer();
  }

  getActiveTimer(): ActiveTimerState | null {
    const row = this.stmtGetActive.get() as (ActiveTimerState & { session_mode?: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      mode: (row.mode || row.session_mode || 'free_focus') as PomodoroMode
    };
  }

  clearActiveTimer(): boolean {
    this.stmtClearActive.run();
    return true;
  }

  logSession({
    course_id = null,
    assessment_id = null,
    class_id = null,
    session_mode = 'focus',
    mode,
    started_at = Date.now(),
    ended_at = Date.now(),
    duration_seconds = 1500,
    status = 'completed',
    notes = ''
  }: LogSessionOptions & { mode?: PomodoroMode }): PomodoroSession {
    const id = genId('pom_');
    const effectiveMode = mode || session_mode || 'focus';
    this.stmtInsertSession.run(
      id,
      course_id,
      assessment_id,
      class_id,
      effectiveMode,
      started_at,
      ended_at,
      duration_seconds,
      status,
      notes
    );
    const row = this.db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id) as unknown as PomodoroSession & { session_mode?: string };
    return {
      ...row,
      mode: (row.mode || row.session_mode || 'free_focus') as PomodoroMode,
      session_mode: row.session_mode || row.mode || effectiveMode
    };
  }

  getSessionsForDate(dateStr: string): PomodoroSession[] {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startMs = new Date(y, m - 1, d, 4, 0, 0, 0).getTime();
    const endMs = new Date(y, m - 1, d + 1, 3, 59, 59, 999).getTime();

    return this.db.prepare(`
      SELECT ps.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM pomodoro_sessions ps
      LEFT JOIN courses co ON ps.course_id = co.id
      WHERE ps.started_at >= ? AND ps.started_at <= ?
      ORDER BY ps.started_at DESC
    `).all(startMs, endMs) as unknown as PomodoroSession[];
  }

  getAllSessions(limit = 100): PomodoroSession[] {
    return this.db.prepare(`
      SELECT ps.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM pomodoro_sessions ps
      LEFT JOIN courses co ON ps.course_id = co.id
      ORDER BY ps.started_at DESC
      LIMIT ?
    `).all(limit) as unknown as PomodoroSession[];
  }
}

interface SettingRow {
  key: string;
  value: string;
}

export class SettingsRepository {
  private db: DatabaseSync;
  private stmtGet: StatementSync;
  private stmtSet: StatementSync;
  private stmtGetAll: StatementSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.stmtGet = db.prepare('SELECT value FROM settings WHERE key = ?');
    this.stmtSet = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    this.stmtGetAll = db.prepare('SELECT * FROM settings');
  }

  get<T>(key: string, defaultValue: T | null = null): T | null {
    const row = this.stmtGet.get(key) as unknown as SettingRow | undefined;
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  set<T>(key: string, value: T): T {
    const serialized = JSON.stringify(value);
    this.stmtSet.run(key, serialized);
    return value;
  }

  getAll(): SettingsState {
    const rows = this.stmtGetAll.all() as unknown as SettingRow[];
    const result: SettingsState = {
      theme: 'light',
      contrast: 'normal',
      dyslexic_font: false,
      chimes_enabled: true,
      daily_study_blocks_target: 6,
      academic_cutoff_hour: 4,
      finals_prep_mode: false,
      onboarding_completed: false,
      last_active_academic_date: null
    };

    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }

    return result;
  }
}

export class BackupService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  exportState(): BackupPayload {
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      courses: this.db.prepare('SELECT * FROM courses').all() as unknown as Course[],
      classes: this.db.prepare('SELECT * FROM classes').all() as unknown as ClassSession[],
      routine: this.db.prepare('SELECT * FROM routine_slots').all() as unknown as RoutineSlot[],
      assessments: this.db.prepare('SELECT * FROM assessments').all() as unknown as Assessment[],
      pomodoro: this.db.prepare('SELECT * FROM pomodoro_sessions').all() as unknown as PomodoroSession[],
      settings: this.db.prepare('SELECT * FROM settings').all() as unknown as SettingsState
    };
  }

  importState(data: BackupPayload): boolean {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup data');
    }

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db.exec(`
        DELETE FROM pomodoro_sessions;
        DELETE FROM active_timer;
        DELETE FROM assessments;
        DELETE FROM classes;
        DELETE FROM routine_slots;
        DELETE FROM courses;
        DELETE FROM settings;
      `);

      if (Array.isArray(data.courses)) {
        const stmt = this.db.prepare(`
          INSERT INTO courses (id, name, code, color, effort_multiplier, multiplier_expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const c of data.courses) {
          stmt.run(
            c.id,
            c.name,
            c.code,
            c.color,
            c.effort_multiplier,
            c.multiplier_expires_at ?? null,
            c.created_at || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(data.classes)) {
        const stmt = this.db.prepare(`
          INSERT INTO classes (id, course_id, date, start_time, end_time, lecture_number, title, status, is_makeup, is_crunch_deferred, attended_at, reviewed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const cl of data.classes) {
          stmt.run(
            cl.id,
            cl.course_id,
            cl.date,
            cl.start_time,
            cl.end_time,
            cl.lecture_number ?? 1,
            cl.notes || '',
            cl.status,
            cl.is_makeup,
            cl.is_crunch_deferred,
            null,
            null
          );
        }
      }

      const routineList = data.routine || (data as unknown as { routine_slots?: RoutineSlot[] }).routine_slots;
      if (Array.isArray(routineList)) {
        const stmt = this.db.prepare(`
          INSERT INTO routine_slots (id, course_id, day_of_week, start_time, end_time, location)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const r of routineList) {
          stmt.run(r.id, r.course_id, r.day_of_week, r.start_time, r.end_time, r.room || '');
        }
      }

      if (Array.isArray(data.assessments)) {
        const stmt = this.db.prepare(`
          INSERT INTO assessments (id, course_id, title, assessment_type, exam_date, syllabus_range, revision_target_blocks, is_completed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of data.assessments) {
          stmt.run(a.id, a.course_id, a.title, a.assessment_type, a.exam_date, a.syllabus_range, a.revision_target_blocks, a.is_completed, a.created_at || new Date().toISOString());
        }
      }

      const pomoList = data.pomodoro || (data as unknown as { pomodoro_sessions?: PomodoroSession[] }).pomodoro_sessions;
      if (Array.isArray(pomoList)) {
        const stmt = this.db.prepare(`
          INSERT INTO pomodoro_sessions (id, course_id, assessment_id, class_id, session_mode, started_at, ended_at, duration_seconds, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of pomoList) {
          stmt.run(
            p.id,
            p.course_id ?? null,
            p.assessment_id ?? null,
            p.class_id ?? null,
            p.mode || 'focus',
            p.started_at,
            p.completed_at || p.started_at,
            p.target_duration_seconds || 1500,
            p.status,
            p.notes || ''
          );
        }
      }

      if (Array.isArray(data.settings)) {
        const stmt = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        for (const s of data.settings as unknown as SettingRow[]) {
          stmt.run(s.key, s.value);
        }
      }

      this.db.exec('COMMIT;');
      return true;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}
