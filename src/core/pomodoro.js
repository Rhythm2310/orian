/**
 * Orian Pomodoro Engine & Disruption Handlers
 * Handles wall-clock recovery across sleep/restart, contextual quote selection,
 * and schedule disruption edge cases (online/recorded, makeup, cancelled).
 */

/**
 * Recovers an active Pomodoro session against wall-clock Date.now()
 * to eliminate timer drift across OS sleep, suspension, or app restart.
 */
export function recoverWallClockTimer(activeSession, now = Date.now()) {
  if (!activeSession) return null;

  const targetDuration = activeSession.target_duration_seconds || 1500;

  if (activeSession.status === 'completed') {
    return {
      ...activeSession,
      status: 'completed',
      elapsedSeconds: targetDuration,
      remainingSeconds: 0,
      autoCompleted: false
    };
  }

  if (activeSession.status === 'paused') {
    const elapsed = activeSession.paused_elapsed_seconds || 0;
    const remaining = Math.max(0, targetDuration - elapsed);
    return {
      ...activeSession,
      status: 'paused',
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      autoCompleted: false
    };
  }

  // Running timer: calculate actual elapsed milliseconds
  const elapsedMs = Math.max(0, now - activeSession.started_at);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds >= targetDuration) {
    return {
      ...activeSession,
      status: 'completed',
      elapsedSeconds: targetDuration,
      remainingSeconds: 0,
      autoCompleted: true
    };
  }

  return {
    ...activeSession,
    status: 'running',
    elapsedSeconds,
    remainingSeconds: targetDuration - elapsedSeconds,
    autoCompleted: false
  };
}

/**
 * Selects an appropriate offline quote matching the current academic context.
 */
export function selectContextualQuote(quotes = [], {
  isCrunch = false,
  hasImminentExam = false,
  isGapReturn = false,
  onBreak = false,
  streakDays = 0
} = {}) {
  if (!quotes || quotes.length === 0) {
    return {
      id: 'default',
      text: 'Start with the single lecture that unblocks the next two.',
      author: 'Orian',
      category: 'deep_focus'
    };
  }

  let preferredCategory = 'deep_focus';

  if (onBreak) {
    preferredCategory = 'break';
  } else if (isCrunch) {
    preferredCategory = 'crunch';
  } else if (hasImminentExam) {
    preferredCategory = 'exam_imminent';
  } else if (isGapReturn) {
    preferredCategory = 'recovery_gap';
  } else if (streakDays >= 5) {
    preferredCategory = 'streak_milestone';
  }

  const matches = quotes.filter(q => q.category === preferredCategory);
  if (matches.length > 0) {
    const idx = Math.floor(Math.random() * matches.length);
    return matches[idx];
  }

  return quotes[0];
}

/**
 * Handles schedule disruption edge cases without mutating recurring weekly timetable.
 */
export function handleClassDisruption({
  classInstance = null,
  course_id = null,
  date = null,
  disruptionType = 'online_recorded',
  startTime = '09:00',
  endTime = '10:30',
  lecture_number = null
} = {}) {
  const targetCourseId = classInstance ? classInstance.course_id : course_id;
  const targetDate = classInstance ? classInstance.date : date;
  const targetLectureNo = classInstance ? classInstance.lecture_number : lecture_number;

  if (disruptionType === 'online_recorded') {
    return {
      updatedClass: {
        ...(classInstance || {}),
        course_id: targetCourseId,
        date: targetDate,
        lecture_number: targetLectureNo,
        status: 'online_recorded'
      },
      guardActive: true,
      recoveryDueHours: 48,
      recurringTemplateMutated: false,
      notice: 'Online lecture delay guard active: study session scheduled within 48h to prevent delay debt.'
    };
  }

  if (disruptionType === 'cancelled') {
    return {
      updatedClass: {
        ...(classInstance || {}),
        course_id: targetCourseId,
        date: targetDate,
        lecture_number: targetLectureNo,
        status: 'cancelled'
      },
      suppressShield: true,
      recurringTemplateMutated: false,
      notice: 'Class marked cancelled for this date only. Recurring timetable preserved.'
    };
  }

  if (disruptionType === 'makeup') {
    return {
      isMakeup: true,
      recurringTemplateMutated: false,
      updatedClass: {
        id: `makeup_${Date.now()}`,
        course_id: targetCourseId,
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        lecture_number: targetLectureNo,
        status: 'scheduled',
        is_makeup: 1
      },
      notice: 'Surprise off-day makeup class added for today. Regular routine remains unchanged.'
    };
  }

  throw new Error(`Unknown disruption type: ${disruptionType}`);
}
