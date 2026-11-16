import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAcademicDate,
  getAcademicDateBounds,
  getEffectiveMultiplier,
  computeCourseBacklogScore,
  calculateMultiDayGap,
  triageGapReturn
} from '../src/core/antiBacklog.js';

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
      const bounds = getAcademicDateBounds('2026-11-16', 4);
      assert.equal(bounds.start.getFullYear(), 2026);
      assert.equal(bounds.start.getMonth(), 10);
      assert.equal(bounds.start.getDate(), 16);
      assert.equal(bounds.start.getHours(), 4);

      assert.equal(bounds.end.getFullYear(), 2026);
      assert.equal(bounds.end.getMonth(), 10);
      assert.equal(bounds.end.getDate(), 17);
      assert.equal(bounds.end.getHours(), 3);
      assert.equal(bounds.end.getMinutes(), 59);
    });
  });

  describe('Course Effort Multiplier Expiry', () => {
    test('returns course effort_multiplier when no expiry is set', () => {
      const course = { id: 'c1', effort_multiplier: 1.5, multiplier_expires_at: null };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 1.5);
    });

    test('returns course effort_multiplier before expiry date', () => {
      const course = { id: 'c1', effort_multiplier: 2.0, multiplier_expires_at: '2026-11-20' };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 2.0);
    });

    test('reverts to 1.0 after expiry date has passed', () => {
      const course = { id: 'c1', effort_multiplier: 2.0, multiplier_expires_at: '2026-11-15' };
      assert.equal(getEffectiveMultiplier(course, '2026-11-16'), 1.0);
    });
  });

  describe('Course Backlog Scoring', () => {
    test('scores higher for course with imminent exam and unwatched syllabus lectures', () => {
      const course1 = { id: 'math', code: 'MATH204', effort_multiplier: 1.0 };
      const unwatched1 = [
        { course_id: 'math', lecture_number: 9, status: 'unwatched' },
        { course_id: 'math', lecture_number: 10, status: 'unwatched' }
      ];
      const exam1 = [
        {
          course_id: 'math',
          exam_date: '2026-11-19T09:00:00', // 3 days from 2026-11-16
          parsed_syllabus: [8, 9, 10, 11, 12]
        }
      ];

      const scoreMath = computeCourseBacklogScore(course1, unwatched1, exam1, '2026-11-16');

      const course2 = { id: 'hist', code: 'HIST101', effort_multiplier: 1.0 };
      const unwatched2 = [
        { course_id: 'hist', lecture_number: 4, status: 'unwatched' },
        { course_id: 'hist', lecture_number: 5, status: 'unwatched' }
      ];
      // No upcoming exam for HIST101
      const scoreHist = computeCourseBacklogScore(course2, unwatched2, [], '2026-11-16');

      assert.ok(scoreMath > scoreHist * 2, 'Math score should heavily outweigh History due to imminent exam');
    });

    test('effort_multiplier boosts score proportionally', () => {
      const normalCourse = { id: 'cs1', effort_multiplier: 1.0 };
      const boostedCourse = { id: 'cs2', effort_multiplier: 2.0 };
      const lectures = [{ lecture_number: 1, status: 'unwatched' }];

      const scoreNormal = computeCourseBacklogScore(normalCourse, lectures, [], '2026-11-16');
      const scoreBoosted = computeCourseBacklogScore(boostedCourse, lectures, [], '2026-11-16');

      assert.equal(scoreBoosted, scoreNormal * 2.0);
    });
  });

  describe('Multi-Day Absence Gap Detection & Triage', () => {
    test('detects gap of 2 or more days', () => {
      const result = calculateMultiDayGap('2026-11-10', '2026-11-14');
      assert.equal(result.gapDetected, true);
      assert.equal(result.gapDays, 4);
    });

    test('does not detect gap for consecutive days', () => {
      const result = calculateMultiDayGap('2026-11-15', '2026-11-16');
      assert.equal(result.gapDetected, false);
      assert.equal(result.gapDays, 1);
    });

    test('does not detect gap for same day', () => {
      const result = calculateMultiDayGap('2026-11-16', '2026-11-16');
      assert.equal(result.gapDetected, false);
      assert.equal(result.gapDays, 0);
    });

    test('triage prioritizes syllabus lectures for imminent exams and limits immediate load', () => {
      const exams = [
        { course_id: 'math', exam_date: '2026-11-19T09:00:00', parsed_syllabus: [5, 6, 7] }
      ];
      // 10 accumulated unwatched lectures across courses
      const lectures = [
        { id: 'l1', course_id: 'math', lecture_number: 5, title: 'Math 5' },
        { id: 'l2', course_id: 'math', lecture_number: 6, title: 'Math 6' },
        { id: 'l3', course_id: 'cs', lecture_number: 1, title: 'CS 1' },
        { id: 'l4', course_id: 'cs', lecture_number: 2, title: 'CS 2' },
        { id: 'l5', course_id: 'cs', lecture_number: 3, title: 'CS 3' },
        { id: 'l6', course_id: 'phy', lecture_number: 1, title: 'Phy 1' },
        { id: 'l7', course_id: 'phy', lecture_number: 2, title: 'Phy 2' },
        { id: 'l8', course_id: 'phy', lecture_number: 3, title: 'Phy 3' },
        { id: 'l9', course_id: 'phy', lecture_number: 4, title: 'Phy 4' },
        { id: 'l10', course_id: 'phy', lecture_number: 5, title: 'Phy 5' }
      ];

      const triage = triageGapReturn({
        unwatchedLectures: lectures,
        upcomingExams: exams,
        currentDateStr: '2026-11-16',
        maxImmediateCapacity: 4
      });

      assert.equal(triage.prioritizedLectures.length, 4);
      assert.equal(triage.deferredLectures.length, 6);
      // Math syllabus lectures must be prioritized
      const prioritizedMath = triage.prioritizedLectures.filter(l => l.course_id === 'math');
      assert.equal(prioritizedMath.length, 2);
      assert.ok(triage.explanation.includes('Exam-relevant syllabus lectures'));
    });
  });
});
