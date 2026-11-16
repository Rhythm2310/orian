import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAcademicDate,
  getAcademicDateBounds,
  getEffectiveMultiplier,
  computeCourseBacklogScore,
  calculateMultiDayGap,
  triageGapReturn
} from '../src/core/antiBacklog.ts';
import type { Course, Assessment, ClassSession } from '../src/types/domain.ts';

describe('AntiBacklog Core Engine', () => {
  describe('4:00 AM Academic Day Cutoff', () => {
    test('returns previous calendar day if time is before 04:00 AM', () => {
      // 2:30 AM on Tuesday Nov 17 -> academic day is Monday Nov 16
      const date = new Date(2026, 10, 17, 2, 30, 0);
      assert.equal(getAcademicDate(date), '2026-11-16');
    });

    test('returns current calendar day if time is exactly 04:00 AM', () => {
      const date = new Date(2026, 10, 17, 4, 0, 0);
      assert.equal(getAcademicDate(date), '2026-11-17');
    });

    test('returns current calendar day if time is in afternoon or evening', () => {
      const date = new Date(2026, 10, 17, 20, 45, 0);
      assert.equal(getAcademicDate(date), '2026-11-17');
    });

    test('returns correct bounds for academic day spanning 4 AM to next day 3:59:59 AM', () => {
      const { start, end } = getAcademicDateBounds('2026-11-16');
      assert.equal(start.getFullYear(), 2026);
      assert.equal(start.getMonth(), 10);
      assert.equal(start.getDate(), 16);
      assert.equal(start.getHours(), 4);
      assert.equal(start.getMinutes(), 0);

      assert.equal(end.getFullYear(), 2026);
      assert.equal(end.getMonth(), 10);
      assert.equal(end.getDate(), 17);
      assert.equal(end.getHours(), 3);
      assert.equal(end.getMinutes(), 59);
    });
  });

  describe('Course Effort Multiplier Expiry', () => {
    test('returns course effort_multiplier when no expiry is set', () => {
      const course: Course = {
        id: 'c1',
        name: 'Math',
        code: 'MATH101',
        color: '#1A6B4E',
        effort_multiplier: 1.5,
        multiplier_expires_at: null
      };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 1.5);
    });

    test('returns course effort_multiplier before expiry date', () => {
      const course: Course = {
        id: 'c1',
        name: 'Math',
        code: 'MATH101',
        color: '#1A6B4E',
        effort_multiplier: 2.0,
        multiplier_expires_at: '2026-11-20'
      };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 2.0);
    });

    test('reverts to 1.0 after expiry date has passed', () => {
      const course: Course = {
        id: 'c1',
        name: 'Math',
        code: 'MATH101',
        color: '#1A6B4E',
        effort_multiplier: 2.0,
        multiplier_expires_at: '2026-11-15'
      };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 1.0);
    });
  });

  describe('Course Backlog Scoring', () => {
    const courseA: Course = { id: 'c1', name: 'Algorithms', code: 'CS201', color: '#1A6B4E', effort_multiplier: 1.0, multiplier_expires_at: null };
    const courseB: Course = { id: 'c2', name: 'Physics', code: 'PHY101', color: '#B9581A', effort_multiplier: 1.0, multiplier_expires_at: null };

    const unwatched: ClassSession[] = [
      { id: 'l1', course_id: 'c1', date: '2026-11-10', lecture_number: 8, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
      { id: 'l2', course_id: 'c1', date: '2026-11-12', lecture_number: 9, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
      { id: 'l3', course_id: 'c2', date: '2026-11-11', lecture_number: 5, status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' }
    ];

    test('scores higher for course with imminent exam and unwatched syllabus lectures', () => {
      const exams: Assessment[] = [
        {
          id: 'e1',
          course_id: 'c1',
          title: 'CT 2',
          assessment_type: 'CT',
          exam_date: '2026-11-19', // 3 days away
          syllabus_range: '8-12',
          parsed_syllabus: [8, 9, 10, 11, 12],
          revision_target_blocks: 4,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];

      const scoreA = computeCourseBacklogScore(courseA, unwatched, exams, '2026-11-16');
      const scoreB = computeCourseBacklogScore(courseB, unwatched, exams, '2026-11-16');

      assert.ok(scoreA > scoreB, `Expected scoreA (${scoreA}) > scoreB (${scoreB})`);
    });

    test('effort_multiplier boosts score proportionally', () => {
      const boostedCourse: Course = { ...courseB, effort_multiplier: 1.5 };
      const scoreNormal = computeCourseBacklogScore(courseB, unwatched, [], '2026-11-16');
      const scoreBoosted = computeCourseBacklogScore(boostedCourse, unwatched, [], '2026-11-16');

      assert.equal(scoreBoosted, Math.round(scoreNormal * 1.5 * 10) / 10);
    });
  });

  describe('Multi-Day Absence Gap Detection & Triage', () => {
    test('detects gap of 2 or more days', () => {
      const res = calculateMultiDayGap('2026-11-12', '2026-11-16');
      assert.equal(res.gapDetected, true);
      assert.equal(res.gapDays, 4);
    });

    test('does not detect gap for consecutive days', () => {
      const res = calculateMultiDayGap('2026-11-15', '2026-11-16');
      assert.equal(res.gapDetected, false);
      assert.equal(res.gapDays, 1);
    });

    test('does not detect gap for same day', () => {
      const res = calculateMultiDayGap('2026-11-16', '2026-11-16');
      assert.equal(res.gapDetected, false);
      assert.equal(res.gapDays, 0);
    });

    test('triage prioritizes syllabus lectures for imminent exams and limits immediate load', () => {
      const unwatched: ClassSession[] = [
        { id: '1', course_id: 'c1', lecture_number: 1, date: '2026-11-01', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: '2', course_id: 'c1', lecture_number: 2, date: '2026-11-03', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: '3', course_id: 'c2', lecture_number: 8, date: '2026-11-10', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: '4', course_id: 'c2', lecture_number: 9, date: '2026-11-12', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: '5', course_id: 'c3', lecture_number: 4, date: '2026-11-05', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' },
        { id: '6', course_id: 'c3', lecture_number: 5, date: '2026-11-07', status: 'missed', is_reviewed: 0, is_makeup: 0, is_crunch_deferred: 0, start_time: '09:00', end_time: '10:30' }
      ];

      const exams: Assessment[] = [
        {
          id: 'e1',
          course_id: 'c2',
          title: 'Midterm',
          assessment_type: 'MIDTERM',
          exam_date: '2026-11-18', // 2 days away
          syllabus_range: '8-10',
          parsed_syllabus: [8, 9, 10],
          revision_target_blocks: 4,
          revision_completed_blocks: 0,
          is_completed: 0
        }
      ];

      const result = triageGapReturn({
        unwatchedLectures: unwatched,
        upcomingExams: exams,
        currentDateStr: '2026-11-16',
        maxImmediateCapacity: 3
      });

      assert.equal(result.prioritizedLectures.length, 3);
      assert.equal(result.deferredLectures.length, 3);
      // Ensure c2 lectures (in syllabus for imminent exam) are in prioritizedLectures
      assert.ok(result.prioritizedLectures.some(p => p.course_id === 'c2' && p.lecture_number === 8));
      assert.ok(result.prioritizedLectures.some(p => p.course_id === 'c2' && p.lecture_number === 9));
      assert.ok(result.deferredLectures.every(d => d.is_backlog_deferred === true));
    });
  });
});
