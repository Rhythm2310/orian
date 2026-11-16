import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  recoverWallClockTimer,
  selectContextualQuote,
  handleClassDisruption
} from '../src/core/pomodoro.js';

describe('Edge Cases & Pomodoro Engine', () => {
  describe('Wall-Clock Pomodoro Recovery Across Sleep/Restart', () => {
    test('marks timer as completed if elapsed time exceeds target duration during sleep', () => {
      const startedAt = Date.now() - (30 * 60 * 1000); // started 30 mins ago
      const activeSession = {
        id: 'pomo1',
        started_at: startedAt,
        target_duration_seconds: 25 * 60, // 25 mins
        status: 'running'
      };
      const now = Date.now();

      const recovered = recoverWallClockTimer(activeSession, now);
      assert.equal(recovered.status, 'completed');
      assert.equal(recovered.autoCompleted, true);
      assert.equal(recovered.remainingSeconds, 0);
    });

    test('resumes running timer with exact remaining seconds if still within duration', () => {
      const startedAt = Date.now() - (10 * 60 * 1000); // started 10 mins ago
      const activeSession = {
        id: 'pomo2',
        started_at: startedAt,
        target_duration_seconds: 25 * 60, // 25 mins = 1500s
        status: 'running'
      };
      const now = Date.now();

      const recovered = recoverWallClockTimer(activeSession, now);
      assert.equal(recovered.status, 'running');
      assert.equal(recovered.autoCompleted, false);
      // should have ~15 mins (900 seconds) remaining
      assert.ok(Math.abs(recovered.remainingSeconds - 900) <= 2);
    });

    test('preserves paused timer without advancing elapsed time', () => {
      const activeSession = {
        id: 'pomo3',
        started_at: Date.now() - (20 * 60 * 1000),
        target_duration_seconds: 1500,
        status: 'paused',
        paused_elapsed_seconds: 300
      };
      const now = Date.now();

      const recovered = recoverWallClockTimer(activeSession, now);
      assert.equal(recovered.status, 'paused');
      assert.equal(recovered.elapsedSeconds, 300);
      assert.equal(recovered.remainingSeconds, 1200);
    });
  });

  describe('Contextual Quote Matcher', () => {
    const quotes = [
      { id: '1', category: 'crunch', text: 'Crunch quote' },
      { id: '2', category: 'exam_imminent', text: 'Exam quote' },
      { id: '3', category: 'recovery_gap', text: 'Gap quote' },
      { id: '4', category: 'break', text: 'Break quote' },
      { id: '5', category: 'deep_focus', text: 'Focus quote' }
    ];

    test('selects crunch quote when isCrunch is true', () => {
      const q = selectContextualQuote(quotes, { isCrunch: true });
      assert.equal(q.category, 'crunch');
    });

    test('selects exam quote when exam is imminent', () => {
      const q = selectContextualQuote(quotes, { isCrunch: false, hasImminentExam: true });
      assert.equal(q.category, 'exam_imminent');
    });

    test('selects break quote when on break', () => {
      const q = selectContextualQuote(quotes, { onBreak: true });
      assert.equal(q.category, 'break');
    });

    test('selects recovery quote on gap return', () => {
      const q = selectContextualQuote(quotes, { isGapReturn: true });
      assert.equal(q.category, 'recovery_gap');
    });
  });

  describe('Routine Disruption Handlers', () => {
    test('handles sudden online/recorded switch with 48h guard', () => {
      const originalClass = {
        id: 'cls1',
        course_id: 'c1',
        date: '2026-11-16',
        lecture_number: 14,
        status: 'scheduled'
      };

      const result = handleClassDisruption({
        classInstance: originalClass,
        disruptionType: 'online_recorded'
      });

      assert.equal(result.updatedClass.status, 'online_recorded');
      assert.equal(result.guardActive, true);
      assert.equal(result.recoveryDueHours, 48);
      assert.ok(result.notice.includes('Online lecture delay guard active'));
    });

    test('handles cancelled lecture exception without modifying template', () => {
      const originalClass = {
        id: 'cls2',
        course_id: 'c1',
        date: '2026-11-16',
        lecture_number: 15,
        status: 'scheduled'
      };

      const result = handleClassDisruption({
        classInstance: originalClass,
        disruptionType: 'cancelled'
      });

      assert.equal(result.updatedClass.status, 'cancelled');
      assert.equal(result.suppressShield, true);
      assert.equal(result.recurringTemplateMutated, false);
    });

    test('handles surprise off-day makeup class', () => {
      const result = handleClassDisruption({
        course_id: 'c1',
        date: '2026-11-17',
        disruptionType: 'makeup',
        startTime: '14:00',
        endTime: '15:30',
        lecture_number: 16
      });

      assert.equal(result.isMakeup, true);
      assert.equal(result.recurringTemplateMutated, false);
      assert.equal(result.updatedClass.status, 'scheduled');
      assert.equal(result.updatedClass.is_makeup, 1);
    });
  });
});
