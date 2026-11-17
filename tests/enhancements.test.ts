import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createDatabase } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrations.ts';
import { ClassesRepository, RoutineRepository, CoursesRepository, SettingsRepository } from '../src/db/repositories.ts';
import { IpcService } from '../src/ipc/service.ts';

describe('Impeccable & Core Enhancements Suite', () => {
  describe('ClassesRepository Sequential Lecture Numbering', () => {
    test('getNextLectureNumber returns 1 for course with no classes and increments for new classes', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const coursesRepo = new CoursesRepository(db);
      const classesRepo = new ClassesRepository(db);

      const course = coursesRepo.create({ name: 'Calculus II', code: 'MATH204' });
      assert.equal(classesRepo.getNextLectureNumber(course.id), 1);

      classesRepo.create({
        course_id: course.id,
        date: '2026-11-16',
        start_time: '10:00',
        end_time: '11:30',
        lecture_number: 1
      });

      assert.equal(classesRepo.getNextLectureNumber(course.id), 2);

      classesRepo.create({
        course_id: course.id,
        date: '2026-11-17',
        start_time: '10:00',
        end_time: '11:30',
        lecture_number: 2
      });

      assert.equal(classesRepo.getNextLectureNumber(course.id), 3);
    });
  });

  describe('Routine Slots in Dashboard Snapshot', () => {
    test('dashboard snapshot returns routineSlots with joined course info', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const coursesRepo = new CoursesRepository(db);
      const routineRepo = new RoutineRepository(db);
      const service = new IpcService(db);

      const course = coursesRepo.create({ name: 'Algorithms', code: 'CS201', color: '#1A6B4E' });
      routineRepo.create({
        course_id: course.id,
        day_of_week: 1,
        start_time: '10:00',
        end_time: '11:30',
        room: 'Hall A'
      });

      const snap = service.dashboardGetSnapshot({ now: new Date('2026-11-16T10:00:00') });
      assert.ok(snap.routineSlots, 'routineSlots should be defined in snapshot');
      assert.equal(snap.routineSlots.length, 1);
      assert.equal(snap.routineSlots[0].course_code, 'CS201');
      assert.equal(snap.routineSlots[0].course_color, '#1A6B4E');
      assert.equal(snap.routineSlots[0].room, 'Hall A');
    });
  });

  describe('Settings Synchronization for Daily Blocks Target', () => {
    test('settingsUpdate keeps daily_study_blocks_target and daily_block_target in sync', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const service = new IpcService(db);

      // Updating daily_block_target updates daily_study_blocks_target
      const s1 = service.settingsUpdate({ daily_block_target: 8 } as any);
      assert.equal(s1.daily_study_blocks_target, 8);
      assert.equal((s1 as any).daily_block_target, 8);

      // Updating daily_study_blocks_target updates daily_block_target
      const s2 = service.settingsUpdate({ daily_study_blocks_target: 10 });
      assert.equal(s2.daily_study_blocks_target, 10);
      assert.equal((s2 as any).daily_block_target, 10);

      // Verify that snapshot calculation uses the updated target
      const snap = service.dashboardGetSnapshot({ now: new Date('2026-11-16T10:00:00') });
      assert.equal(snap.allocation.totalDailyBlocks, 10);
    });
  });

  describe('Sequential Lecture Numbering from Routine Sync', () => {
    test('classesSyncFromRoutine assigns sequential lecture_numbers', () => {
      const db = createDatabase(':memory:');
      runMigrations(db);
      const coursesRepo = new CoursesRepository(db);
      const routineRepo = new RoutineRepository(db);
      const service = new IpcService(db);

      const course = coursesRepo.create({ name: 'Calculus', code: 'MATH204' });
      routineRepo.create({
        course_id: course.id,
        day_of_week: 1,
        start_time: '10:00',
        end_time: '11:30'
      });

      // Day 1
      const c1 = service.classesSyncFromRoutine('2026-11-16', 1);
      assert.equal(c1[0].lecture_number, 1);

      // Day 2 (next week Monday)
      const c2 = service.classesSyncFromRoutine('2026-11-23', 1);
      assert.equal(c2[0].lecture_number, 2);
    });
  });
});
