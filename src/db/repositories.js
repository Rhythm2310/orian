import crypto from 'node:crypto';
import { parseSyllabusRange } from '../core/validators.js';

function genId(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

export class CoursesRepository {
  constructor(db) {
    this.db = db;
    this.stmtGetById = db.prepare('SELECT * FROM courses WHERE id = ?');
    this.stmtGetAll = db.prepare('SELECT * FROM courses ORDER BY code ASC');
    this.stmtInsert = db.prepare(`
      INSERT INTO courses (id, name, code, color, effort_multiplier, multiplier_expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.stmtDelete = db.prepare('DELETE FROM courses WHERE id = ?');
  }

  create({ name, code, color = '#1A6B4E', effort_multiplier = 1.0, multiplier_expires_at = null }) {
    const id = genId('crs_');
    const createdAt = new Date().toISOString();
    this.stmtInsert.run(id, name, code, color, effort_multiplier, multiplier_expires_at, createdAt);
    return this.getById(id);
  }

  getById(id) {
    return this.stmtGetById.get(id) || null;
  }

  getAll() {
    return this.stmtGetAll.all();
  }

  update(id, fields) {
    const updates = [];
    const values = [];

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
    this.db.prepare(sql).run(...values);
    return this.getById(id);
  }

  delete(id) {
    this.stmtDelete.run(id);
    return true;
  }
}

export class ClassesRepository {
  constructor(db) {
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
    title = '',
    status = 'scheduled',
    is_makeup = 0,
    is_crunch_deferred = 0,
    attended_at = null,
    reviewed_at = null
  }) {
    const id = genId('cls_');
    this.stmtInsert.run(
      id,
      course_id,
      date,
      start_time,
      end_time,
      lecture_number,
      title,
      status,
      is_makeup,
      is_crunch_deferred,
      attended_at,
      reviewed_at
    );
    return this.getById(id);
  }

  getById(id) {
    return this.stmtGetById.get(id) || null;
  }

  getByDate(dateStr) {
    return this.stmtGetByDate.all(dateStr);
  }

  getUnwatched() {
    return this.stmtGetUnwatched.all();
  }

  markCrunchDeferred(id, deferred = 1) {
    this.db.prepare('UPDATE classes SET is_crunch_deferred = ? WHERE id = ?').run(deferred, id);
    return this.getById(id);
  }

  markAttended(id) {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE classes SET status = 'attended', attended_at = ? WHERE id = ?").run(now, id);
    return this.getById(id);
  }

  markReviewed(id) {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE classes SET status = 'reviewed', reviewed_at = ? WHERE id = ?").run(now, id);
    return this.getById(id);
  }

  update(id, fields) {
    const updates = [];
    const values = [];

    for (const key of ['date', 'start_time', 'end_time', 'lecture_number', 'title', 'status', 'is_makeup', 'is_crunch_deferred']) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE classes SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
    return this.getById(id);
  }

  delete(id) {
    this.stmtDelete.run(id);
    return true;
  }
}

export class RoutineRepository {
  constructor(db) {
    this.db = db;
    this.stmtGetById = db.prepare(`
      SELECT rs.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM routine_slots rs
      LEFT JOIN courses co ON rs.course_id = co.id
      WHERE rs.id = ?
    `);
    this.stmtGetAll = db.prepare(`
      SELECT rs.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM routine_slots rs
      JOIN courses co ON rs.course_id = co.id
      ORDER BY rs.day_of_week ASC, rs.start_time ASC
    `);
    this.stmtGetByDay = db.prepare(`
      SELECT rs.*, co.name as course_name, co.code as course_code, co.color as course_color
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

  create({ course_id, day_of_week, start_time, end_time, location = '' }) {
    const id = genId('rot_');
    this.stmtInsert.run(id, course_id, day_of_week, start_time, end_time, location);
    return this.getById(id);
  }

  getById(id) {
    return this.stmtGetById.get(id) || null;
  }

  getAll() {
    return this.stmtGetAll.all();
  }

  getByDay(dayOfWeek) {
    return this.stmtGetByDay.all(dayOfWeek);
  }

  delete(id) {
    this.stmtDelete.run(id);
    return true;
  }
}

export class AssessmentsRepository {
  constructor(db) {
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
  }) {
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
    const item = this.getById(id);
    return {
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    };
  }

  getById(id) {
    const item = this.stmtGetById.get(id);
    if (!item) return null;
    return {
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    };
  }

  getAll() {
    return this.stmtGetAll.all().map(item => ({
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    }));
  }

  getUpcoming(fromDateStr = new Date().toISOString().substring(0, 10)) {
    return this.stmtGetUpcoming.all(fromDateStr).map(item => ({
      ...item,
      parsed_syllabus: parseSyllabusRange(item.syllabus_range)
    }));
  }

  markCompleted(id, isCompleted = 1) {
    this.db.prepare('UPDATE assessments SET is_completed = ? WHERE id = ?').run(isCompleted, id);
    return this.getById(id);
  }

  update(id, fields) {
    const updates = [];
    const values = [];

    for (const key of ['title', 'assessment_type', 'exam_date', 'syllabus_range', 'revision_target_blocks', 'is_completed']) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const sql = `UPDATE assessments SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
    return this.getById(id);
  }

  delete(id) {
    this.stmtDelete.run(id);
    return true;
  }
}

export class PomodoroRepository {
  constructor(db) {
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
  }) {
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

  getActiveTimer() {
    return this.stmtGetActive.get() || null;
  }

  clearActiveTimer() {
    this.stmtClearActive.run();
    return true;
  }

  logSession({
    course_id = null,
    assessment_id = null,
    class_id = null,
    session_mode = 'focus',
    started_at = Date.now(),
    ended_at = Date.now(),
    duration_seconds = 1500,
    status = 'completed',
    notes = ''
  }) {
    const id = genId('pom_');
    this.stmtInsertSession.run(
      id,
      course_id,
      assessment_id,
      class_id,
      session_mode,
      started_at,
      ended_at,
      duration_seconds,
      status,
      notes
    );
    return this.db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(id);
  }

  getSessionsForDate(dateStr) {
    // Academic day spans 04:00 to next day 03:59:59
    const [y, m, d] = dateStr.split('-').map(Number);
    const startMs = new Date(y, m - 1, d, 4, 0, 0, 0).getTime();
    const endMs = new Date(y, m - 1, d + 1, 3, 59, 59, 999).getTime();

    return this.db.prepare(`
      SELECT ps.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM pomodoro_sessions ps
      LEFT JOIN courses co ON ps.course_id = co.id
      WHERE ps.started_at >= ? AND ps.started_at <= ?
      ORDER BY ps.started_at DESC
    `).all(startMs, endMs);
  }

  getAllSessions(limit = 100) {
    return this.db.prepare(`
      SELECT ps.*, co.name as course_name, co.code as course_code, co.color as course_color
      FROM pomodoro_sessions ps
      LEFT JOIN courses co ON ps.course_id = co.id
      ORDER BY ps.started_at DESC
      LIMIT ?
    `).all(limit);
  }
}

export class SettingsRepository {
  constructor(db) {
    this.db = db;
    this.stmtGet = db.prepare('SELECT value FROM settings WHERE key = ?');
    this.stmtSet = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    this.stmtGetAll = db.prepare('SELECT * FROM settings');
  }

  get(key, defaultValue = null) {
    const row = this.stmtGet.get(key);
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  set(key, value) {
    const serialized = JSON.stringify(value);
    this.stmtSet.run(key, serialized);
    return value;
  }

  getAll() {
    const rows = this.stmtGetAll.all();
    const result = {
      theme: 'light',
      contrast: 'normal',
      dyslexic_font: false,
      chimes_enabled: true,
      daily_block_target: 6,
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
  constructor(db) {
    this.db = db;
  }

  exportState() {
    return {
      version: 1,
      exported_at: new Date().toISOString(),
      courses: this.db.prepare('SELECT * FROM courses').all(),
      classes: this.db.prepare('SELECT * FROM classes').all(),
      routine_slots: this.db.prepare('SELECT * FROM routine_slots').all(),
      assessments: this.db.prepare('SELECT * FROM assessments').all(),
      pomodoro_sessions: this.db.prepare('SELECT * FROM pomodoro_sessions').all(),
      settings: this.db.prepare('SELECT * FROM settings').all()
    };
  }

  importState(data) {
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
          stmt.run(c.id, c.name, c.code, c.color, c.effort_multiplier, c.multiplier_expires_at, c.created_at);
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
            cl.lecture_number,
            cl.title,
            cl.status,
            cl.is_makeup,
            cl.is_crunch_deferred,
            cl.attended_at,
            cl.reviewed_at
          );
        }
      }

      if (Array.isArray(data.routine_slots)) {
        const stmt = this.db.prepare(`
          INSERT INTO routine_slots (id, course_id, day_of_week, start_time, end_time, location)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const r of data.routine_slots) {
          stmt.run(r.id, r.course_id, r.day_of_week, r.start_time, r.end_time, r.location);
        }
      }

      if (Array.isArray(data.assessments)) {
        const stmt = this.db.prepare(`
          INSERT INTO assessments (id, course_id, title, assessment_type, exam_date, syllabus_range, revision_target_blocks, is_completed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const a of data.assessments) {
          stmt.run(a.id, a.course_id, a.title, a.assessment_type, a.exam_date, a.syllabus_range, a.revision_target_blocks, a.is_completed, a.created_at);
        }
      }

      if (Array.isArray(data.pomodoro_sessions)) {
        const stmt = this.db.prepare(`
          INSERT INTO pomodoro_sessions (id, course_id, assessment_id, class_id, session_mode, started_at, ended_at, duration_seconds, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of data.pomodoro_sessions) {
          stmt.run(p.id, p.course_id, p.assessment_id, p.class_id, p.session_mode, p.started_at, p.ended_at, p.duration_seconds, p.status, p.notes);
        }
      }

      if (Array.isArray(data.settings)) {
        const stmt = this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        for (const s of data.settings) {
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
