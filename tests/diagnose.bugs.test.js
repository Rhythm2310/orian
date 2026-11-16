import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { allocateDailyStudyBlocks } from '../src/core/allocator.js';
import { recoverWallClockTimer } from '../src/core/pomodoro.js';
import { parseSyllabusRange } from '../src/core/validators.js';
import { calculateMultiDayGap } from '../src/core/antiBacklog.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrations.js';
import { ClassesRepository, RoutineRepository, AssessmentsRepository, CoursesRepository } from '../src/db/repositories.js';
import { IpcService } from '../src/ipc/service.js';

describe('Diagnostic Bug Reproduction Suite', () => {
  describe('Bug 1: Study Block Allocation Budget Invariant', () => {
    test('sum of allocated course blocks must strictly equal remainingStudyBudget even when courses > budget', () => {
      const courses = [
        { id: 'c1', effort_multiplier: 1.0 },
        { id: 'c2', effort_multiplier: 1.0 },
        { id: 'c3', effort_multiplier: 1.0 },
        { id: 'c4', effort_multiplier: 1.0 }
      ];
      // totalDailyBlocks = 4, routineShield = 1 -> remaining budget = 3
      const result = allocateDailyStudyBlocks({
        totalDailyBlocks: 4,
        courses,
        upcomingExams: [],
        unwatchedLectures: [
          { course_id: 'c1', lecture_number: 1 },
          { course_id: 'c2', lecture_number: 1 },
          { course_id: 'c3', lecture_number: 1 },
          { course_id: 'c4', lecture_number: 1 }
        ],
        todayClasses: [{ course_id: 'c1', title: 'Live Lecture' }],
        finalsPrepMode: false,
        now: new Date('2026-11-16T10:00:00')
      });

      const totalAllocated = result.courseAllocations.reduce((sum, a) => sum + a.allocatedBlocks, 0);
      const remainingBudget = result.totalDailyBlocks - result.routineShieldBlocks;

      assert.equal(totalAllocated, remainingBudget, `Allocated ${totalAllocated} blocks but budget was ${remainingBudget}`);
    });

    test('finalsPrepMode allocations must strictly sum to totalDailyBlocks', () => {
      const courses = [
        { id: 'c1', effort_multiplier: 1.0 },
        { id: 'c2', effort_multiplier: 1.0 },
        { id: 'c3', effort_multiplier: 1.0 },
        { id: 'c4', effort_multiplier: 1.0 }
      ];
      const exams = [
        { id: 'e1', course_id: 'c1', assessment_type: 'Final', exam_date: '2026-11-20T10:00:00', revision_target_blocks: 6 },
        { id: 'e2', course_id: 'c2', assessment_type: 'Final', exam_date: '2026-11-21T10:00:00', revision_target_blocks: 4 },
        { id: 'e3', course_id: 'c3', assessment_type: 'Final', exam_date: '2026-11-22T10:00:00', revision_target_blocks: 3 }
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
        status: 'completed'
      };

      const recovered = recoverWallClockTimer(session, Date.now());
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

      const cls = classesRepo.create({ course_id: crs.id, date: '2026-11-16', lecture_number: 1 });
      const retrievedCls = classesRepo.getById(cls.id);
      assert.equal(retrievedCls.course_code, 'MATH101', 'classesRepo.getById should include course_code');

      const rot = routineRepo.create({ course_id: crs.id, day_of_week: 1, start_time: '10:00', end_time: '11:30' });
      const retrievedRot = routineRepo.getById(rot.id);
      assert.equal(retrievedRot.course_code, 'MATH101', 'routineRepo.getById should include course_code');

      const asm = assessmentsRepo.create({ course_id: crs.id, title: 'CT 1', exam_date: '2026-11-20T10:00:00' });
      const retrievedAsm = assessmentsRepo.getById(asm.id);
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
      const cls = service.classesCreate({
        course_id: crs.id,
        date: '2026-11-16',
        lecture_number: 10,
        status: 'scheduled'
      });

      // User cancels via header modal passing course_id and date (without class_id)
      const res = service.classesHandleDisruption({
        course_id: crs.id,
        date: '2026-11-16',
        disruptionType: 'cancelled'
      });

      assert.equal(res.updatedClass.status, 'cancelled');
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
});
