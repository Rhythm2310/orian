import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { allocateDailyStudyBlocks } from '../src/core/allocator.ts';
import { recoverWallClockTimer } from '../src/core/pomodoro.ts';
import { parseSyllabusRange } from '../src/core/validators.ts';
import { calculateMultiDayGap } from '../src/core/antiBacklog.ts';
import { createDatabase } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrations.ts';
import { ClassesRepository, RoutineRepository, AssessmentsRepository, CoursesRepository, BackupService } from '../src/db/repositories.ts';
import { IpcService } from '../src/ipc/service.ts';
import type { Course, Assessment, ClassSession } from '../src/types/domain.ts';

describe('Diagnostic Bug Reproduction Suite', () => {
  describe('Bug 1: Study Block Allocation Budget Invariant', () => {
    test('sum of allocated course blocks must strictly equal remainingStudyBudget even when courses > budget', () => {
      const courses: Course[] = [
        { id: 'c1', name: 'C1', code: 'C1', color: '#111', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c2', name: 'C2', code: 'C2', color: '#222', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c3', name: 'C3', code: 'C3', color: '#333', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c4', name: 'C4', code: 'C4', color: '#444', effort_multiplier: 1.0, multiplier_expires_at: null }
      ];
      // totalDailyBlocks = 4, routineShield = 1 -> remaining budget = 3
      const result = allocateDailyStudyBlocks({
        totalDailyBlocks: 4,
        courses,
        upcomingExams: [],
        unwatchedLectures: [
          { id: 'u1', course_id: 'c1', lecture_number: 1, date: '2026-11-16', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
          { id: 'u2', course_id: 'c2', lecture_number: 1, date: '2026-11-16', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
          { id: 'u3', course_id: 'c3', lecture_number: 1, date: '2026-11-16', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
          { id: 'u4', course_id: 'c4', lecture_number: 1, date: '2026-11-16', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' }
        ],
        todayClasses: [{ id: 'tc1', course_id: 'c1', notes: 'Live Lecture', date: '2026-11-16', status: 'scheduled', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' }],
        finalsPrepMode: false,
        now: new Date('2026-11-16T10:00:00')
      });

      const totalAllocated = result.courseAllocations.reduce((sum, a) => sum + a.allocatedBlocks, 0);
      const remainingBudget = result.totalDailyBlocks - result.routineShieldBlocks;

      assert.equal(totalAllocated, remainingBudget, `Allocated ${totalAllocated} blocks but budget was ${remainingBudget}`);
    });

    test('finalsPrepMode allocations must strictly sum to totalDailyBlocks', () => {
      const courses: Course[] = [
        { id: 'c1', name: 'C1', code: 'C1', color: '#111', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c2', name: 'C2', code: 'C2', color: '#222', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c3', name: 'C3', code: 'C3', color: '#333', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c4', name: 'C4', code: 'C4', color: '#444', effort_multiplier: 1.0, multiplier_expires_at: null }
      ];
      const exams: Assessment[] = [
        { id: 'e1', course_id: 'c1', title: 'F1', assessment_type: 'FINAL', exam_date: '2026-11-20T10:00:00', revision_target_blocks: 6, revision_completed_blocks: 0, is_completed: 0, syllabus_range: 'ALL' },
        { id: 'e2', course_id: 'c2', title: 'F2', assessment_type: 'FINAL', exam_date: '2026-11-21T10:00:00', revision_target_blocks: 4, revision_completed_blocks: 0, is_completed: 0, syllabus_range: 'ALL' },
        { id: 'e3', course_id: 'c3', title: 'F3', assessment_type: 'FINAL', exam_date: '2026-11-22T10:00:00', revision_target_blocks: 3, revision_completed_blocks: 0, is_completed: 0, syllabus_range: 'ALL' }
      ];

      const result = allocateDailyStudyBlocks({
        totalDailyBlocks: 6,
        courses,
        upcomingExams: exams,
        unwatchedLectures: [],
        todayClasses: [],
        finalsPrepMode: true,
        now: new Date('2026-11-16T10:00:00')
      });

      const totalAllocated = result.courseAllocations.reduce((sum, a) => sum + a.allocatedBlocks, 0);
      assert.equal(totalAllocated, 6, `Finals allocations ${totalAllocated} do not sum to 6`);
    });
  });

  describe('Bug 2: Pomodoro Status Completed Recovery', () => {
    test('does not re-mark an already completed session as autoCompleted: true', () => {
      const session = {
        id: 'p1',
        started_at: Date.now() - 3600000,
        target_duration_seconds: 1500,
        status: 'completed' as const
      };

      const recovered = recoverWallClockTimer(session, Date.now())!;
      assert.equal(recovered.status, 'completed');
      assert.equal(recovered.autoCompleted, false, 'Already completed session should not trigger autoCompleted');
    });
  });

  describe('Bug 3: Malformed Syllabus Range Multi-Hyphen Rejection', () => {
    test('rejects multi-hyphen range strings like "8-10-12"', () => {
      assert.throws(() => parseSyllabusRange('8-10-12'), /invalid range/i);
    });
  });

  describe('Bug 4: Repositories getById Joining Course Code', () => {
    test('classesRepo, routineRepo and assessmentsRepo getById include course_code', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);

      const coursesRepo = new CoursesRepository(db);
      const classesRepo = new ClassesRepository(db);
      const routineRepo = new RoutineRepository(db);
      const assessmentsRepo = new AssessmentsRepository(db);

      const crs = coursesRepo.create({ name: 'Calculus', code: 'MATH101' });

      const cls = classesRepo.create({ course_id: crs.id, date: '2026-11-16', lecture_number: 1, start_time: '09:00', end_time: '10:30' });
      const retrievedCls = classesRepo.getById(cls.id)!;
      assert.equal(retrievedCls.course_code, 'MATH101', 'classesRepo.getById should include course_code');

      const rot = routineRepo.create({ course_id: crs.id, day_of_week: 1, start_time: '10:00', end_time: '11:30' });
      const retrievedRot = routineRepo.getById(rot.id)!;
      assert.equal(retrievedRot.course_code, 'MATH101', 'routineRepo.getById should include course_code');

      const asm = assessmentsRepo.create({ course_id: crs.id, title: 'CT 1', exam_date: '2026-11-20T10:00:00' });
      const retrievedAsm = assessmentsRepo.getById(asm.id)!;
      assert.equal(retrievedAsm.course_code, 'MATH101', 'assessmentsRepo.getById should include course_code');
    });
  });

  describe('Bug 5: Auto-Sync Routine Slots on New Academic Day', () => {
    test('dashboard snapshot automatically creates todayClasses from routine slots when empty', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const service = new IpcService(db);

      const crs = service.coursesCreate({ name: 'Physics', code: 'PHYS101' });
      // Monday Nov 16 2026 is day 1
      service.routineCreate({
        course_id: crs.id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30'
      });

      // No classes created yet for 2026-11-16
      const snap = service.dashboardGetSnapshot({ now: new Date('2026-11-16T10:00:00') });
      assert.ok(snap.todayClasses.length >= 1, 'Today classes should auto-sync from routine slots');
      assert.equal(snap.todayClasses[0].course_code, 'PHYS101');
    });
  });

  describe('Bug 6: Disruption from Header without class_id', () => {
    test('disrupting a class by course_id and date updates or records cancellation cleanly', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const service = new IpcService(db);

      const crs = service.coursesCreate({ name: 'Algorithms', code: 'CS201' });
      service.classesCreate({
        course_id: crs.id,
        date: '2026-11-16',
        lecture_number: 10,
        status: 'scheduled',
        start_time: '09:00',
        end_time: '10:30'
      });

      // User cancels via header modal passing course_id and date (without class_id)
      const res = service.classesHandleDisruption({
        course_id: crs.id,
        date: '2026-11-16',
        disruptionType: 'cancelled'
      });

      assert.equal(res.updatedClass?.status, 'cancelled');
      const updatedCls = service.classesGetByDate('2026-11-16');
      assert.equal(updatedCls[0].status, 'cancelled');
    });
  });

  describe('Bug 7: Multi-Day Gap Calculation with Timestamp Strings', () => {
    test('detects 2-day gap correctly even when date strings include hours', () => {
      const res = calculateMultiDayGap('2026-11-10T23:30:00', '2026-11-12T05:00:00');
      assert.equal(res.gapDetected, true);
      assert.equal(res.gapDays, 2);
    });
  });

  describe('Bug 8: Pomodoro Mode Preservation', () => {
    test('preserves mode as exam_revision in active state and logged session', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const service = new IpcService(db);

      const course = service.coursesCreate({ name: 'Calculus', code: 'MATH101' });
      service.pomodoroStart({
        course_id: course.id,
        mode: 'exam_revision',
        durationMinutes: 25
      });

      const active = service.pomodoroGetActive()!;
      assert.ok(active, 'Active timer should exist');
      assert.equal(active.mode, 'exam_revision', 'Active timer mode should match started mode');

      const completed = service.pomodoroComplete({ notes: 'Studied limits' })!;
      assert.ok(completed, 'Completed session should exist');
      assert.equal(completed.session_mode, 'exam_revision', 'Logged session mode should match exam_revision');
    });
  });

  describe('Bug 9: Finals Prep Mode Course Key Uniqueness', () => {
    test('aggregates multiple exams for same course without duplicate course allocations', () => {
      const courses: Course[] = [
        { id: 'c1', name: 'Algorithms', code: 'CS201', color: '#111', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'c2', name: 'Physics', code: 'PHYS101', color: '#222', effort_multiplier: 1.0, multiplier_expires_at: null }
      ];
      // Course c1 has two exams (Midterm and Final)
      const exams: Assessment[] = [
        { id: 'e1', course_id: 'c1', title: 'Midterm', assessment_type: 'MIDTERM', exam_date: '2026-11-20T10:00:00', revision_target_blocks: 4, revision_completed_blocks: 0, is_completed: 0, syllabus_range: '1-6' },
        { id: 'e2', course_id: 'c1', title: 'Final', assessment_type: 'FINAL', exam_date: '2026-11-25T10:00:00', revision_target_blocks: 6, revision_completed_blocks: 0, is_completed: 0, syllabus_range: 'ALL' },
        { id: 'e3', course_id: 'c2', title: 'Final', assessment_type: 'FINAL', exam_date: '2026-11-22T10:00:00', revision_target_blocks: 5, revision_completed_blocks: 0, is_completed: 0, syllabus_range: 'ALL' }
      ];

      const result = allocateDailyStudyBlocks({
        totalDailyBlocks: 6,
        courses,
        upcomingExams: exams,
        unwatchedLectures: [],
        todayClasses: [],
        finalsPrepMode: true,
        now: new Date('2026-11-16T10:00:00')
      });

      const courseIds = result.courseAllocations.map(a => a.course_id);
      const uniqueCourseIds = new Set(courseIds);
      assert.equal(courseIds.length, uniqueCourseIds.size, `Duplicate course allocations detected: ${courseIds.join(', ')}`);
      assert.equal(result.courseAllocations.reduce((s, a) => s + a.allocatedBlocks, 0), 6);
    });
  });

  describe('Bug 10: Backup Restore Foreign Key Integrity Validation', () => {
    test('rejects corrupted backup payload with orphaned foreign key references cleanly without corrupting state', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const backupService = new BackupService(db);
      const coursesRepo = new CoursesRepository(db);

      // Populate valid initial state
      coursesRepo.create({ name: 'Initial Course', code: 'INIT101' });

      // Malformed backup with a class referencing non-existent course_id
      const corruptedData = {
        version: 1,
        timestamp: new Date().toISOString(),
        courses: [], // Empty courses!
        classes: [
          {
            id: 'cls_orphan',
            course_id: 'non_existent_course',
            date: '2026-11-16',
            start_time: '09:00',
            end_time: '10:30',
            status: 'scheduled',
            is_makeup: 0,
            is_crunch_deferred: 0
          }
        ],
        routine: [],
        assessments: [],
        pomodoro: [],
        settings: []
      };

      assert.throws(() => {
        backupService.importState(corruptedData as any);
      }, /foreign key|invalid/i);

      // Verify rollback preserved initial state
      assert.equal(coursesRepo.getAll().length, 1, 'Initial courses should remain intact after failed restore');
    });
  });
});
