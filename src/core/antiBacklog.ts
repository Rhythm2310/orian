/**
 * Orian AntiBacklog Core Engine
 * 100% Strict TypeScript Implementation
 * Handles Academic Day Cutoff (4:00 AM), Course Effort Multipliers,
 * Backlog Scoring & Multi-Day Gap Triage.
 */

import type {
  Course,
  ClassSession,
  Assessment,
  AcademicDateBounds,
  GapDetectionResult,
  GapTriageResult
} from '../types/domain.ts';
import { isLectureInSyllabus } from './validators.ts';

/**
 * Returns the academic date (YYYY-MM-DD) for a given timestamp.
 * If the hour is before cutoffHour (default: 4 AM), the date is considered
 * part of the previous calendar day.
 */
export function getAcademicDate(dateInput: Date | string | number = new Date(), cutoffHour = 4): string {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  if (d.getHours() < cutoffHour) {
    d.setDate(d.getDate() - 1);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns exact start Date and end Date for an academic day string (YYYY-MM-DD).
 * Starts at 04:00:00 on that day and ends at 03:59:59.999 on next day.
 */
export function getAcademicDateBounds(academicDateStr: string, cutoffHour = 4): AcademicDateBounds {
  const [yyyy, mm, dd] = academicDateStr.split('-').map(Number);
  const start = new Date(yyyy, mm - 1, dd, cutoffHour, 0, 0, 0);
  const end = new Date(yyyy, mm - 1, dd + 1, cutoffHour - 1, 59, 59, 999);
  return { start, end };
}

/**
 * Returns effective course multiplier considering auto-expiry date.
 */
export function getEffectiveMultiplier(
  course: Pick<Course, 'effort_multiplier' | 'multiplier_expires_at'>,
  currentDateStr: string
): number {
  const multiplier = course.effort_multiplier || 1.0;
  if (!course.multiplier_expires_at) {
    return multiplier;
  }

  // If currentDateStr > multiplier_expires_at, multiplier has expired, revert to 1.0
  if (currentDateStr > course.multiplier_expires_at) {
    return 1.0;
  }

  return multiplier;
}

/**
 * Computes urgency score for a course based on unwatched lectures,
 * syllabus relevance to upcoming exams, and effort multiplier.
 */
export function computeCourseBacklogScore(
  course: Course,
  unwatchedLectures: ClassSession[] = [],
  upcomingExams: Assessment[] = [],
  currentDateStr: string
): number {
  const effectiveMultiplier = getEffectiveMultiplier(course, currentDateStr);
  const courseLectures = unwatchedLectures.filter(l => l.course_id === course.id);
  const courseExams = upcomingExams.filter(e => e.course_id === course.id);

  let score = 0;

  // Find most imminent exam for this course if any
  let nearestDays = Infinity;
  let nearestExam: Assessment | null = null;

  for (const exam of courseExams) {
    const examDateStr = typeof exam.exam_date === 'string'
      ? exam.exam_date.substring(0, 10)
      : new Date(exam.exam_date).toISOString().substring(0, 10);

    const diffDays = Math.ceil((new Date(examDateStr).getTime() - new Date(currentDateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < nearestDays) {
      nearestDays = diffDays;
      nearestExam = exam;
    }
  }

  for (const lecture of courseLectures) {
    let lectureWeight = 1.0;

    if (nearestExam && nearestExam.parsed_syllabus) {
      if (isLectureInSyllabus(lecture.lecture_number, nearestExam.parsed_syllabus)) {
        // High weight for in-syllabus lectures
        lectureWeight = 3.5;
      }
    }

    score += lectureWeight;
  }

  // If there is an imminent exam within 7 days, apply exam urgency multiplier
  if (nearestExam && nearestDays <= 7) {
    const urgencyFactor = Math.max(1, 8 - nearestDays);
    score = (score + 5.0) * urgencyFactor;
  }

  return Math.round(score * effectiveMultiplier * 10) / 10;
}

/**
 * Calculates gap between two academic dates.
 * Returns { gapDetected: boolean, gapDays: number }
 */
export function calculateMultiDayGap(
  lastActiveAcademicDate: string | null | undefined,
  currentAcademicDate: string | null | undefined
): GapDetectionResult {
  if (!lastActiveAcademicDate || !currentAcademicDate) {
    return { gapDetected: false, gapDays: 0 };
  }

  const lastStr = String(lastActiveAcademicDate).substring(0, 10);
  const currStr = String(currentAcademicDate).substring(0, 10);
  const [y1, m1, d1] = lastStr.split('-').map(Number);
  const [y2, m2, d2] = currStr.split('-').map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));

  if (diffDays >= 2) {
    return { gapDetected: true, gapDays: diffDays };
  }

  return { gapDetected: false, gapDays: Math.max(0, diffDays) };
}

export interface TriageGapOptions {
  unwatchedLectures?: ClassSession[];
  upcomingExams?: Assessment[];
  currentDateStr: string;
  maxImmediateCapacity?: number;
}

/**
 * Triages unwatched backlog after a multi-day absence gap.
 * Protects against cognitive overload by prioritizing exam-relevant items
 * and deferring excessive backlog into the recovery queue.
 */
export function triageGapReturn({
  unwatchedLectures = [],
  upcomingExams = [],
  currentDateStr,
  maxImmediateCapacity = 4
}: TriageGapOptions): GapTriageResult {
  // Sort lectures: in-syllabus for imminent exam first, then by lecture_number ascending
  const scoredLectures = unwatchedLectures.map(lecture => {
    let priority = 0;
    const relatedExam = upcomingExams.find(e => e.course_id === lecture.course_id);

    if (relatedExam) {
      const examDateStr = typeof relatedExam.exam_date === 'string'
        ? relatedExam.exam_date.substring(0, 10)
        : new Date(relatedExam.exam_date).toISOString().substring(0, 10);
      const diffDays = Math.ceil((new Date(examDateStr).getTime() - new Date(currentDateStr).getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 7 && isLectureInSyllabus(lecture.lecture_number, relatedExam.parsed_syllabus)) {
        priority += 100 - diffDays;
      }
    }

    return { lecture, priority };
  });

  scoredLectures.sort((a, b) => b.priority - a.priority);

  const prioritized: ClassSession[] = [];
  const deferred: (ClassSession & { is_backlog_deferred: boolean })[] = [];

  for (let i = 0; i < scoredLectures.length; i++) {
    const item = scoredLectures[i].lecture;
    if (i < maxImmediateCapacity) {
      prioritized.push(item);
    } else {
      deferred.push({
        ...item,
        is_backlog_deferred: true
      });
    }
  }

  const examRelevanceCount = prioritized.filter(p => {
    const ex = upcomingExams.find(e => e.course_id === p.course_id);
    return ex && isLectureInSyllabus(p.lecture_number, ex.parsed_syllabus);
  }).length;

  const explanation = examRelevanceCount > 0
    ? `Exam-relevant syllabus lectures (${examRelevanceCount}) prioritized. Safe return buffer active: ${deferred.length} older classes deferred to avoid overwhelm.`
    : `Safe return buffer active: top ${prioritized.length} classes queued; ${deferred.length} classes deferred to recovery queue.`;

  return {
    prioritizedLectures: prioritized,
    deferredLectures: deferred,
    explanation
  };
}
