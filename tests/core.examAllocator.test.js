import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldCrunchDeferCourse,
  computeExamStrain,
  allocateDailyStudyBlocks,
  computeCapacityDeficit
} from '../src/core/allocator.js';

describe('Exam Triage & Daily Capacity Allocator', () => {
  describe('Exam Crunch Shield Deferral', () => {
    test('defers unrelated courses when Midterm is <= 48 hours away', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams = [
        {
          id: 'exam1',
          course_id: 'math',
          assessment_type: 'Midterm',
          exam_date: '2026-11-18T09:00:00' // ~47h away
        }
      ];

      // math course should NOT be deferred
      assert.equal(shouldCrunchDeferCourse('math', upcomingExams, now), false);
      // physics (unrelated course) MUST be crunch-deferred
      assert.equal(shouldCrunchDeferCourse('physics', upcomingExams, now), true);
    });

    test('defers unrelated courses when Class Test (CT) is <= 24 hours away', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams = [
        {
          id: 'exam_ct',
          course_id: 'cs101',
          assessment_type: 'CT',
          exam_date: '2026-11-17T09:00:00' // 23h away
        }
      ];

      assert.equal(shouldCrunchDeferCourse('cs101', upcomingExams, now), false);
      assert.equal(shouldCrunchDeferCourse('chem', upcomingExams, now), true);
    });

    test('does NOT crunch-defer if exam is far away (> 48h for Midterm, > 24h for CT)', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams = [
        {
          id: 'exam_far',
          course_id: 'math',
          assessment_type: 'Midterm',
          exam_date: '2026-11-20T10:00:00' // 4 days away
        }
      ];

      assert.equal(shouldCrunchDeferCourse('physics', upcomingExams, now), false);
    });
  });

  describe('Colliding Midterms/Finals Proportional Reallocation', () => {
    test('computes strain correctly based on prep blocks, multiplier and days left', () => {
      const exam = {
        id: 'e1',
        course_id: 'cs101',
        exam_date: '2026-11-18T10:00:00', // 2 days away
        revision_target_blocks: 4
      };
      const unwatchedSyllabusCount = 2; // total prep = 6 blocks
      const courseMultiplier = 1.0;
      const now = new Date('2026-11-16T10:00:00');

      const strain = computeExamStrain(exam, unwatchedSyllabusCount, courseMultiplier, now);
      // prep = 6, days = 2.0 -> strain = 6 / 2 = 3.0
      assert.equal(strain, 3.0);
    });

    test('splits daily study blocks proportionally when two exams collide', () => {
      const now = new Date('2026-11-16T10:00:00');
      const courses = [
        { id: 'cs101', code: 'CS101', effort_multiplier: 1.0 },
        { id: 'phys112', code: 'PHYS112', effort_multiplier: 1.0 }
      ];
      const exams = [
        {
          id: 'ex_cs',
          course_id: 'cs101',
          exam_date: '2026-11-18T10:00:00', // 2 days
          parsed_syllabus: [1, 2, 3],
          revision_target_blocks: 6
        },
        {
          id: 'ex_phys',
          course_id: 'phys112',
          exam_date: '2026-11-19T10:00:00', // 3 days
          parsed_syllabus: [10, 11],
          revision_target_blocks: 3
        }
      ];
      const unwatchedLectures = [
        { course_id: 'cs101', lecture_number: 1 },
        { course_id: 'cs101', lecture_number: 2 }, // 2 unwatched in-syllabus + 6 rev = 8 blocks
        { course_id: 'phys112', lecture_number: 10 } // 1 unwatched in-syllabus + 3 rev = 4 blocks
      ];

      // Total daily study budget = 6 blocks
      const allocation = allocateDailyStudyBlocks({
        totalDailyBlocks: 6,
        courses,
        upcomingExams: exams,
        unwatchedLectures,
        todayClasses: [],
        finalsPrepMode: false,
        now
      });

      // cs strain: 8 blocks / 2 days = 4.0
      // phys strain: 4 blocks / 3 days = 1.33
      // Total strain = 5.33 -> CS gets ~75% (4 blocks), PHYS gets ~25% (2 blocks)
      const csAlloc = allocation.courseAllocations.find(a => a.course_id === 'cs101');
      const physAlloc = allocation.courseAllocations.find(a => a.course_id === 'phys112');

      assert.ok(csAlloc.allocatedBlocks >= 3, 'CS101 should receive major share due to imminent date');
      assert.ok(physAlloc.allocatedBlocks >= 1, 'PHYS112 should NOT be starved completely');
      assert.equal(csAlloc.allocatedBlocks + physAlloc.allocatedBlocks, 6);
    });
  });

  describe('Finals Prep Mode', () => {
    test('allocates 100% of study capacity to finals, suppressing regular routine shields', () => {
      const now = new Date('2026-11-16T10:00:00');
      const courses = [
        { id: 'math', code: 'MATH204', effort_multiplier: 1.0 },
        { id: 'cs', code: 'CS101', effort_multiplier: 1.0 }
      ];
      const exams = [
        {
          id: 'final_math',
          course_id: 'math',
          assessment_type: 'Final',
          exam_date: '2026-11-22T09:00:00',
          parsed_syllabus: 'ALL',
          revision_target_blocks: 10
        }
      ];
      // Today has a routine class for CS
      const todayClasses = [
        { course_id: 'cs', title: 'Regular CS Class' }
      ];

      const allocation = allocateDailyStudyBlocks({
        totalDailyBlocks: 6,
        courses,
        upcomingExams: exams,
        unwatchedLectures: [],
        todayClasses,
        finalsPrepMode: true,
        now
      });

      assert.equal(allocation.finalsPrepMode, true);
      assert.equal(allocation.routineShieldBlocks, 0, 'Routine shield blocks must be 0 in Finals Mode');
      const mathAlloc = allocation.courseAllocations.find(a => a.course_id === 'math');
      assert.equal(mathAlloc.allocatedBlocks, 6, 'All blocks go to Finals prep');
    });
  });

  describe('Capacity Deficit Calculation', () => {
    test('detects deficit when remaining prep exceeds available capacity before exam', () => {
      const exam = {
        id: 'e_tight',
        course_id: 'math',
        exam_date: '2026-11-18T10:00:00', // 2 days away
        revision_target_blocks: 12
      };
      // Student can only do 3 blocks/day -> 2 days * 3 = 6 blocks capacity vs 12 needed -> 6 deficit
      const deficit = computeCapacityDeficit({
        upcomingExams: [exam],
        unwatchedLectures: [],
        dailyCapacityBlocks: 3,
        now: new Date('2026-11-16T10:00:00')
      });

      assert.equal(deficit.hasDeficit, true);
      assert.equal(deficit.totalDeficitBlocks, 6);
      assert.ok(deficit.warningText.includes('+3 blocks/day') || deficit.warningText.includes('deficit'));
    });
  });
});
