import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSyllabusRange,
  isLectureInSyllabus,
  validateExamInput,
  validateRoutineTimeSlot
} from '../src/core/validators.ts';
import type { RoutineSlotInput, RoutineSlot } from '../src/types/domain.ts';

describe('Validators & Syllabus Matcher', () => {
  describe('parseSyllabusRange', () => {
    test('parses simple range "8-12"', () => {
      const res = parseSyllabusRange('8-12');
      assert.deepEqual(res, [8, 9, 10, 11, 12]);
    });

    test('parses comma-separated values and ranges "3, 5, 8-10"', () => {
      const res = parseSyllabusRange('3, 5, 8-10');
      assert.deepEqual(res, [3, 5, 8, 9, 10]);
    });

    test('parses case-insensitive "All" or "all" to "ALL"', () => {
      assert.equal(parseSyllabusRange('All'), 'ALL');
      assert.equal(parseSyllabusRange('all'), 'ALL');
      assert.equal(parseSyllabusRange('ALL'), 'ALL');
    });

    test('handles empty or whitespace inputs gracefully', () => {
      assert.deepEqual(parseSyllabusRange(''), []);
      assert.deepEqual(parseSyllabusRange('   '), []);
      assert.deepEqual(parseSyllabusRange(null), []);
      assert.deepEqual(parseSyllabusRange(undefined), []);
    });

    test('throws or ignores inverted bounds like "15-10"', () => {
      assert.throws(() => parseSyllabusRange('15-10'), /invalid range/i);
    });
  });

  describe('isLectureInSyllabus', () => {
    test('returns true for any lecture if syllabus is ALL', () => {
      assert.equal(isLectureInSyllabus(1, 'ALL'), true);
      assert.equal(isLectureInSyllabus(42, 'ALL'), true);
    });

    test('returns true only if lecture is in the parsed array', () => {
      const syllabus = [8, 9, 10, 11, 12];
      assert.equal(isLectureInSyllabus(8, syllabus), true);
      assert.equal(isLectureInSyllabus(10, syllabus), true);
      assert.equal(isLectureInSyllabus(12, syllabus), true);
      assert.equal(isLectureInSyllabus(7, syllabus), false);
      assert.equal(isLectureInSyllabus(13, syllabus), false);
    });
  });

  describe('validateExamInput', () => {
    test('validates correct exam payload', () => {
      const exam = {
        course_id: 'c1',
        title: 'Class Test 2',
        assessment_type: 'CT' as const,
        exam_date: '2026-11-20T10:00:00',
        syllabus_range: '8-12',
        revision_target_blocks: 4
      };
      const validated = validateExamInput(exam);
      assert.equal(validated.course_id, 'c1');
      assert.equal(validated.revision_target_blocks, 4);
      assert.deepEqual(validated.parsed_syllabus, [8, 9, 10, 11, 12]);
    });

    test('rejects missing course_id or exam_date', () => {
      assert.throws(() => validateExamInput({ title: 'CT 1' }), /course_id is required/i);
      assert.throws(() => validateExamInput({ course_id: 'c1', title: 'CT 1' }), /exam_date is required/i);
    });

    test('defaults revision_target_blocks to 4 if unspecified', () => {
      const exam = {
        course_id: 'c1',
        title: 'Midterm',
        assessment_type: 'MIDTERM' as const,
        exam_date: '2026-11-25T09:00:00'
      };
      const validated = validateExamInput(exam);
      assert.equal(validated.revision_target_blocks, 4);
    });
  });

  describe('validateRoutineTimeSlot', () => {
    test('validates valid non-overlapping timeslot', () => {
      const existing: RoutineSlot[] = [
        { id: '1', course_id: 'c1', day_of_week: 1, start_time: '09:00', end_time: '10:30' }
      ];
      const newSlot: RoutineSlotInput = { course_id: 'c1', day_of_week: 1, start_time: '11:00', end_time: '12:30' };
      assert.doesNotThrow(() => validateRoutineTimeSlot(newSlot, existing));
    });

    test('rejects slot where end_time <= start_time', () => {
      const slot: RoutineSlotInput = { course_id: 'c1', day_of_week: 1, start_time: '11:00', end_time: '10:30' };
      assert.throws(() => validateRoutineTimeSlot(slot, []), /end_time must be after start_time/i);
    });

    test('detects slot collision on same day', () => {
      const existing: RoutineSlot[] = [
        { id: '1', course_id: 'c1', day_of_week: 1, start_time: '09:00', end_time: '10:30' }
      ];
      const overlappingSlot: RoutineSlotInput = { course_id: 'c1', day_of_week: 1, start_time: '10:00', end_time: '11:30' };
      assert.throws(() => validateRoutineTimeSlot(overlappingSlot, existing), /overlaps with an existing slot/i);
    });

    test('allows same time on different day', () => {
      const existing: RoutineSlot[] = [
        { id: '1', course_id: 'c1', day_of_week: 1, start_time: '09:00', end_time: '10:30' }
      ];
      const tuesdaySlot: RoutineSlotInput = { course_id: 'c1', day_of_week: 2, start_time: '09:00', end_time: '10:30' };
      assert.doesNotThrow(() => validateRoutineTimeSlot(tuesdaySlot, existing));
    });
  });
});
