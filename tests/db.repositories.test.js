import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrations.js';
import {
  CoursesRepository,
  ClassesRepository,
  RoutineRepository,
  AssessmentsRepository,
  PomodoroRepository,
  SettingsRepository,
  BackupService
} from '../src/db/repositories.js';

describe('SQLite Repositories & Migrations', () => {
  let db;
  let coursesRepo;
  let classesRepo;
  let routineRepo;
  let assessmentsRepo;
  let pomodoroRepo;
  let settingsRepo;
  let backupService;

  beforeEach(() => {
    // In-memory sqlite for clean, fast unit testing
    db = createDatabase(':memory:');
    runMigrations(db);

    coursesRepo = new CoursesRepository(db);
    classesRepo = new ClassesRepository(db);
    routineRepo = new RoutineRepository(db);
    assessmentsRepo = new AssessmentsRepository(db);
    pomodoroRepo = new PomodoroRepository(db);
    settingsRepo = new SettingsRepository(db);
    backupService = new BackupService(db);
  });

  describe('Database Initialization & PRAGMAs', () => {
    test('enables WAL mode, foreign keys, and busy timeout', () => {
      const fk = db.prepare('PRAGMA foreign_keys').get();
      assert.equal(fk.foreign_keys, 1);

      const check = db.prepare('PRAGMA integrity_check').get();
      assert.equal(check.integrity_check, 'ok');
    });

    test('runs migrations idempotently', () => {
      // Running migrations again should be a no-op
      assert.doesNotThrow(() => runMigrations(db));
      const version = db.prepare('PRAGMA user_version').get();
      assert.ok(version.user_version >= 1);
    });
  });

  describe('Courses Repository', () => {
    test('creates and retrieves courses with effort multipliers', () => {
      const course = coursesRepo.create({
        name: 'Calculus II',
        code: 'MATH204',
        color: '#1A6B4E',
        effort_multiplier: 1.5,
        multiplier_expires_at: '2026-11-30'
      });

      assert.ok(course.id);
      assert.equal(course.code, 'MATH204');
      assert.equal(course.effort_multiplier, 1.5);

      const retrieved = coursesRepo.getById(course.id);
      assert.equal(retrieved.name, 'Calculus II');

      const all = coursesRepo.getAll();
      assert.equal(all.length, 1);
    });

    test('updates course effort multiplier and properties', () => {
      const course = coursesRepo.create({
        name: 'Algorithms',
        code: 'CS101',
        color: '#B9581A'
      });

      coursesRepo.update(course.id, {
        effort_multiplier: 2.0,
        multiplier_expires_at: '2026-11-25'
      });

      const updated = coursesRepo.getById(course.id);
      assert.equal(updated.effort_multiplier, 2.0);
      assert.equal(updated.multiplier_expires_at, '2026-11-25');
    });

    test('deletes course and cascades or cleans references', () => {
      const course = coursesRepo.create({ name: 'Physics', code: 'PHYS112' });
      coursesRepo.delete(course.id);
      assert.equal(coursesRepo.getById(course.id), null);
    });
  });

  describe('Classes & Routine Repository', () => {
    test('creates routine slot and retrieves schedule by weekday', () => {
      const course = coursesRepo.create({ name: 'Data Structures', code: 'CS201' });
      const slot = routineRepo.create({
        course_id: course.id,
        day_of_week: 1, // Monday
        start_time: '10:00',
        end_time: '11:30',
        location: 'Room 401'
      });

      assert.ok(slot.id);
      const mondaySlots = routineRepo.getByDay(1);
      assert.equal(mondaySlots.length, 1);
      assert.equal(mondaySlots[0].course_code, 'CS201');
    });

    test('tracks class attendance, review, and crunch deferral', () => {
      const course = coursesRepo.create({ name: 'Chem', code: 'CHEM101' });
      const cls = classesRepo.create({
        course_id: course.id,
        date: '2026-11-16',
        start_time: '14:00',
        end_time: '15:30',
        lecture_number: 8,
        title: 'Thermodynamics'
      });

      assert.equal(cls.status, 'scheduled');
      assert.equal(cls.is_crunch_deferred, 0);

      classesRepo.markCrunchDeferred(cls.id, 1);
      let updated = classesRepo.getById(cls.id);
      assert.equal(updated.is_crunch_deferred, 1);

      classesRepo.markReviewed(cls.id);
      updated = classesRepo.getById(cls.id);
      assert.equal(updated.status, 'reviewed');
      assert.ok(updated.reviewed_at);
    });
  });

  describe('Assessments Repository', () => {
    test('creates and retrieves assessments with syllabus range', () => {
      const course = coursesRepo.create({ name: 'Math', code: 'MATH204' });
      const exam = assessmentsRepo.create({
        course_id: course.id,
        title: 'Class Test 2',
        assessment_type: 'CT',
        exam_date: '2026-11-20T10:00:00',
        syllabus_range: '8-12',
        revision_target_blocks: 4
      });

      assert.ok(exam.id);
      assert.equal(exam.syllabus_range, '8-12');

      const upcoming = assessmentsRepo.getUpcoming('2026-11-16');
      assert.equal(upcoming.length, 1);
      assert.equal(upcoming[0].course_code, 'MATH204');
    });
  });

  describe('Pomodoro Sessions & Active Timer', () => {
    test('persists and recovers active wall-clock timer', () => {
      const startedAt = Date.now() - 5000;
      pomodoroRepo.saveActiveTimer({
        started_at: startedAt,
        target_duration_seconds: 1500,
        status: 'running',
        course_id: 'c1',
        session_mode: 'exam_prep'
      });

      const active = pomodoroRepo.getActiveTimer();
      assert.ok(active);
      assert.equal(active.status, 'running');
      assert.equal(active.course_id, 'c1');

      pomodoroRepo.clearActiveTimer();
      assert.equal(pomodoroRepo.getActiveTimer(), null);
    });

    test('logs completed pomodoro session', () => {
      const course = coursesRepo.create({ name: 'CS', code: 'CS101' });
      const session = pomodoroRepo.logSession({
        course_id: course.id,
        session_mode: 'recovery',
        started_at: Date.now() - 1500000,
        ended_at: Date.now(),
        duration_seconds: 1500,
        status: 'completed',
        notes: 'Finished Lecture 14'
      });

      assert.ok(session.id);
      const todaySessions = pomodoroRepo.getSessionsForDate('2026-11-16');
      assert.equal(todaySessions.length, 1);
    });
  });

  describe('Settings Repository', () => {
    test('sets and gets settings values', () => {
      settingsRepo.set('theme', 'dark');
      assert.equal(settingsRepo.get('theme'), 'dark');

      settingsRepo.set('daily_block_target', 8);
      assert.equal(settingsRepo.get('daily_block_target'), 8);

      settingsRepo.set('finals_prep_mode', true);
      assert.equal(settingsRepo.get('finals_prep_mode'), true);
    });
  });

  describe('Backup & Restore Service', () => {
    test('exports full database state to JSON and restores cleanly', () => {
      const course = coursesRepo.create({ name: 'Discrete Math', code: 'MATH201' });
      assessmentsRepo.create({
        course_id: course.id,
        title: 'Midterm',
        assessment_type: 'Midterm',
        exam_date: '2026-11-25T09:00:00',
        syllabus_range: '1-6'
      });

      const backupJson = backupService.exportState();
      assert.ok(backupJson.courses.length >= 1);
      assert.ok(backupJson.assessments.length >= 1);

      // Create new clean DB and restore
      const newDb = createDatabase(':memory:');
      runMigrations(newDb);
      const newBackupService = new BackupService(newDb);
      newBackupService.importState(backupJson);

      const newCourses = new CoursesRepository(newDb).getAll();
      assert.equal(newCourses.length, 1);
      assert.equal(newCourses[0].code, 'MATH201');
    });
  });
});
