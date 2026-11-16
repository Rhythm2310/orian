import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldCrunchDeferCourse,
  computeExamStrain,
  allocateDailyStudyBlocks,
  computeCapacityDeficit
} from '../src/core/allocator.ts';
import type { Course, Assessment, ClassSession } from '../src/types/domain.ts';

describe('Exam Triage & Daily Capacity Allocator', () => {
  describe('Exam Crunch Shield Deferral', () => {
    test('defers unrelated courses when Midterm is <= 48 hours away', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams: Assessment[] = [
        {
          id: 'exam1',
          course_id: 'math',
          title: 'Midterm',
          assessment_type: 'MIDTERM',
          exam_date: '2026-11-18T09:00:00', // ~47h away
          syllabus_range: 'ALL',
          revision_target_blocks: 4,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];

      // math course should NOT be deferred
      assert.equal(shouldCrunchDeferCourse('math', upcomingExams, now), false);
      // physics (unrelated course) MUST be crunch-deferred
      assert.equal(shouldCrunchDeferCourse('physics', upcomingExams, now), true);
    });

    test('defers unrelated courses when Class Test (CT) is <= 24 hours away', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams: Assessment[] = [
        {
          id: 'exam_ct',
          course_id: 'cs101',
          title: 'CT 1',
          assessment_type: 'CT',
          exam_date: '2026-11-17T09:00:00', // 23h away
          syllabus_range: 'ALL',
          revision_target_blocks: 4,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];

      assert.equal(shouldCrunchDeferCourse('cs101', upcomingExams, now), false);
      assert.equal(shouldCrunchDeferCourse('chem', upcomingExams, now), true);
    });

    test('does NOT crunch-defer if exam is far away (> 48h for Midterm, > 24h for CT)', () => {
      const now = new Date('2026-11-16T10:00:00');
      const upcomingExams: Assessment[] = [
        {
          id: 'exam_far',
          course_id: 'math',
          title: 'Midterm',
          assessment_type: 'MIDTERM',
          exam_date: '2026-11-20T10:00:00', // 4 days away
          syllabus_range: 'ALL',
          revision_target_blocks: 4,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];

      assert.equal(shouldCrunchDeferCourse('physics', upcomingExams, now), false);
    });
  });

  describe('Colliding Midterms/Finals Proportional Reallocation', () => {
    test('computes strain correctly based on prep blocks, multiplier and days left', () => {
      const exam: Assessment = {
        id: 'e1',
        course_id: 'cs101',
        title: 'Midterm',
        assessment_type: 'MIDTERM',
        exam_date: '2026-11-18T10:00:00', // 2 days away
        syllabus_range: 'ALL',
        revision_target_blocks: 4,
        revision_completed_blocks: 0,
        is_completed: 0
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
      const courses: Course[] = [
        { id: 'cs101', name: 'CS', code: 'CS101', color: '#1A6B4E', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'phys112', name: 'Physics', code: 'PHYS112', color: '#B9581A', effort_multiplier: 1.0, multiplier_expires_at: null }
      ];
      const exams: Assessment[] = [
        {
          id: 'ex_cs',
          course_id: 'cs101',
          title: 'CS Exam',
          assessment_type: 'MIDTERM',
          exam_date: '2026-11-18T10:00:00', // 2 days
          syllabus_range: '1-3',
          parsed_syllabus: [1, 2, 3],
          revision_target_blocks: 6,
          revision_completed_blocks: 0,
          is_completed: 0
        },
        {
          id: 'ex_phys',
          course_id: 'phys112',
          title: 'Phys Exam',
          assessment_type: 'MIDTERM',
          exam_date: '2026-11-19T10:00:00', // 3 days
          syllabus_range: '10-11',
          parsed_syllabus: [10, 11],
          revision_target_blocks: 3,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];
      const unwatchedLectures: ClassSession[] = [
        { id: 'u1', course_id: 'cs101', date: '2026-11-10', lecture_number: 1, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: 'u2', course_id: 'cs101', date: '2026-11-12', lecture_number: 2, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: 'u3', course_id: 'phys112', date: '2026-11-11', lecture_number: 10, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' }
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

      const csAlloc = allocation.courseAllocations.find(a => a.course_id === 'cs101')!;
      const physAlloc = allocation.courseAllocations.find(a => a.course_id === 'phys112')!;

      assert.ok(csAlloc.allocatedBlocks >= 3, 'CS101 should receive major share due to imminent date');
      assert.ok(physAlloc.allocatedBlocks >= 1, 'PHYS112 should NOT be starved completely');
      assert.equal(csAlloc.allocatedBlocks + physAlloc.allocatedBlocks, 6);
    });
  });

  describe('Finals Prep Mode', () => {
    test('allocates 100% of study capacity to finals, suppressing regular routine shields', () => {
      const now = new Date('2026-11-16T10:00:00');
      const courses: Course[] = [
        { id: 'math', name: 'Math', code: 'MATH204', color: '#1A6B4E', effort_multiplier: 1.0, multiplier_expires_at: null },
        { id: 'cs', name: 'CS', code: 'CS101', color: '#B9581A', effort_multiplier: 1.0, multiplier_expires_at: null }
      ];
      const exams: Assessment[] = [
        {
          id: 'final_math',
          course_id: 'math',
          title: 'Final Math',
          assessment_type: 'FINAL',
          exam_date: '2026-11-22T09:00:00',
          syllabus_range: 'ALL',
          parsed_syllabus: 'ALL',
          revision_target_blocks: 10,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];
      // Today has a routine class for CS
      const todayClasses: ClassSession[] = [
        { id: 'c_cls', course_id: 'cs', date: '2026-11-16', status: 'scheduled', notes: 'Regular CS Class', start_time: '09:00', end_time: '10:30', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0 }
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
      const mathAlloc = allocation.courseAllocations.find(a => a.course_id === 'math')!;
      assert.equal(mathAlloc.allocatedBlocks, 6, 'All blocks go to Finals prep');
    });
  });

  describe('Capacity Deficit Calculation', () => {
    test('detects deficit when remaining prep exceeds available capacity before exam', () => {
      const exam: Assessment = {
        id: 'e_tight',
        course_id: 'math',
        title: 'Math Exam',
        assessment_type: 'MIDTERM',
        exam_date: '2026-11-18T10:00:00', // 2 days away
        syllabus_range: 'ALL',
        revision_target_blocks: 12,
        revision_completed_blocks: 0,
        is_completed: 0
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
      assert.ok(deficit.warningText?.includes('+3 blocks/day') || deficit.warningText?.includes('deficit'));
    });
  });
});
