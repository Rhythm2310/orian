import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrations.ts';
import { IpcService } from '../src/ipc/service.ts';
import type { DatabaseSync } from 'node:sqlite';

describe('Pure IPC Service Controller', () => {
  let db: DatabaseSync;
  let service: IpcService;

  beforeEach(() => {
    db = createDatabase(':memory:');
    runMigrations(db);
    service = new IpcService(db);
  });

  describe('Dashboard Snapshot Generation', () => {
    test('returns complete computed snapshot with allocation and quote', () => {
      // Setup initial course and exam
      const course = service.coursesCreate({ name: 'Calculus II', code: 'MATH204', effort_multiplier: 1.5 });
      service.assessmentsCreate({
        course_id: course.id,
        title: 'Class Test 2',
        assessment_type: 'CT',
        exam_date: '2026-11-19T09:00:00',
        syllabus_range: '8-12',
        revision_target_blocks: 4
      });

      const snapshot = service.dashboardGetSnapshot({ now: new Date('2026-11-16T10:00:00') });
      assert.ok(snapshot);
      assert.equal(snapshot.academicDate, '2026-11-16');
      assert.equal(snapshot.courses.length, 1);
      assert.equal(snapshot.upcomingExams.length, 1);
      assert.ok(snapshot.allocation);
      assert.ok(snapshot.quote);
      assert.ok(Array.isArray(snapshot.allocation.courseAllocations));
    });

    test('detects multi-day gap and flags in snapshot', () => {
      // Simulate last active academic date was 4 days ago
      service.settingsUpdate({ last_active_academic_date: '2026-11-12' });

      const snapshot = service.dashboardGetSnapshot({ now: new Date('2026-11-16T10:00:00') });
      assert.ok(snapshot.gapInfo);
      assert.equal(snapshot.gapInfo.gapDetected, true);
      assert.equal(snapshot.gapInfo.gapDays, 4);
    });
  });

  describe('Course and Assessment CRUD via Service', () => {
    test('creates, updates and lists courses', () => {
      const c = service.coursesCreate({ name: 'Operating Systems', code: 'CS301' });
      assert.equal(c.code, 'CS301');

      service.coursesUpdate(c.id, { effort_multiplier: 2.0 });
      const courses = service.coursesGetAll();
      assert.equal(courses[0].effort_multiplier, 2.0);

      service.coursesDelete(c.id);
      assert.equal(service.coursesGetAll().length, 0);
    });
  });

  describe('Pomodoro Lifecycle via Service', () => {
    test('starts, checks status, and completes pomodoro session', () => {
      const course = service.coursesCreate({ name: 'Algorithms', code: 'CS201' });

      const started = service.pomodoroStart({
        course_id: course.id,
        durationMinutes: 25,
        mode: 'free_focus'
      });
      assert.equal(started.status, 'running');

      const active = service.pomodoroGetActive();
      assert.ok(active);
      assert.equal(active.course_id, course.id);

      const completed = service.pomodoroComplete({
        notes: 'Chapter 4 graph search'
      })!;
      assert.equal(completed.status, 'completed');
      assert.equal(service.pomodoroGetActive(), null);
    });
  });

  describe('Disruption Quick Actions via Service', () => {
    test('handles sudden online/recorded switch and returns updated state', () => {
      const course = service.coursesCreate({ name: 'Physics', code: 'PHYS112' });
      const cls = service.classesCreate({
        course_id: course.id,
        date: '2026-11-16',
        lecture_number: 14,
        status: 'scheduled',
        start_time: '09:00',
        end_time: '10:30'
      });

      const res = service.classesHandleDisruption({
        class_id: cls.id,
        disruptionType: 'online_recorded'
      });

      assert.equal(res.updatedClass?.status, 'online_recorded');
      assert.equal(res.guardActive, true);
    });
  });
});
