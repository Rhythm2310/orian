/**
 * Orian Exam Triage & Proportional Capacity Allocator
 * 100% Strict TypeScript Implementation
 * Implements strain ratio calculations, crunch deferrals, colliding exam
 * proportional split, finals prep mode, and capacity deficit diagnostics.
 */

import type {
  Course,
  ClassSession,
  Assessment,
  DailyAllocationResult,
  CapacityDeficit,
  CourseAllocation
} from '../types/domain.ts';
import { isLectureInSyllabus } from './validators.ts';
import { getEffectiveMultiplier, getAcademicDate } from './antiBacklog.ts';

/**
 * Checks if a course's regular class should be given "Crunch Deferral".
 * Triggers if any exam is <= 48h (Midterm/Final) or <= 24h (CT)
 * and that exam is NOT for this course.
 */
export function shouldCrunchDeferCourse(
  courseId: string,
  upcomingExams: Assessment[] = [],
  now: Date | string | number = new Date()
): boolean {
  const nowDate = now instanceof Date ? now : new Date(now);

  for (const exam of upcomingExams) {
    if (exam.course_id === courseId) {
      continue; // Never defer the course that has the exam!
    }

    const examDate = new Date(exam.exam_date);
    const diffHours = (examDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) continue; // Past exam

    const type = (exam.assessment_type || 'CT').toUpperCase();
    const isMajorExam = type === 'MIDTERM' || type === 'FINAL' || type === 'FINALS';

    if (isMajorExam && diffHours <= 48) {
      return true;
    }
    if (!isMajorExam && diffHours <= 24) {
      return true;
    }
  }

  return false;
}

/**
 * Computes strain metric for an exam:
 * strain = (requiredPrepBlocks * multiplier) / daysRemaining
 */
export function computeExamStrain(
  exam: Assessment,
  inSyllabusCount = 0,
  courseMultiplier = 1.0,
  now: Date | string | number = new Date()
): number {
  const nowDate = now instanceof Date ? now : new Date(now);
  const examDate = new Date(exam.exam_date);
  const diffHours = Math.max(1, (examDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60));
  const daysLeft = diffHours / 24;

  const revisionBlocks = exam.revision_target_blocks || 4;
  const totalPrepBlocks = inSyllabusCount + revisionBlocks;

  const strain = (totalPrepBlocks * courseMultiplier) / daysLeft;
  return Math.round(strain * 100) / 100;
}

export interface CapacityDeficitOptions {
  upcomingExams?: Assessment[];
  unwatchedLectures?: ClassSession[];
  dailyCapacityBlocks?: number;
  now?: Date | string | number;
}

/**
 * Computes capacity deficit if prep blocks > available capacity.
 */
export function computeCapacityDeficit({
  upcomingExams = [],
  unwatchedLectures = [],
  dailyCapacityBlocks = 4,
  now = new Date()
}: CapacityDeficitOptions): CapacityDeficit {
  const nowDate = now instanceof Date ? now : new Date(now);
  let totalRequiredPrep = 0;
  let minDaysLeft = Infinity;

  for (const exam of upcomingExams) {
    const examDate = new Date(exam.exam_date);
    const diffDays = Math.max(0.5, (examDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < minDaysLeft) {
      minDaysLeft = diffDays;
    }

    const inSyllabus = unwatchedLectures.filter(l =>
      l.course_id === exam.course_id &&
      isLectureInSyllabus(l.lecture_number, exam.parsed_syllabus || 'ALL')
    ).length;

    totalRequiredPrep += (exam.revision_target_blocks || 4) + inSyllabus;
  }

  const daysAvailable = Math.max(1, Math.floor(minDaysLeft));
  const totalCapacity = daysAvailable * dailyCapacityBlocks;

  if (totalRequiredPrep > totalCapacity) {
    const totalDeficitBlocks = totalRequiredPrep - totalCapacity;
    const dailyDeficit = Math.ceil(totalDeficitBlocks / daysAvailable);
    return {
      hasDeficit: true,
      totalDeficitBlocks,
      dailyDeficit,
      warningText: `Crunch deficit: add +${dailyDeficit} blocks/day to finish prep before exams`
    };
  }

  return {
    hasDeficit: false,
    totalDeficitBlocks: 0,
    dailyDeficit: 0,
    warningText: null
  };
}

interface AllocatableItem {
  course_id: string;
  weight: number;
  reason?: string;
  hasExam?: boolean;
}

/**
 * Proportional integer allocation using Largest Remainder (Hare-Niemeyer) method.
 * Guarantees sum(allocated) === targetBudget strictly.
 */
function distributeIntegerBlocks<T extends AllocatableItem>(
  items: T[],
  targetBudget: number
): (T & { allocatedBlocks: number; percentage: number })[] {
  if (!items || items.length === 0 || targetBudget <= 0) {
    return (items || []).map(item => ({ ...item, allocatedBlocks: 0, percentage: 0 }));
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(0.001, item.weight), 0);

  // If budget is smaller than items count, give 1 block to top priority items by weight
  if (targetBudget < items.length) {
    const sorted = [...items]
      .map((item, originalIndex) => ({ item, originalIndex }))
      .sort((a, b) => b.item.weight - a.item.weight);

    const allocations = new Array(items.length).fill(0);
    for (let i = 0; i < targetBudget; i++) {
      allocations[sorted[i].originalIndex] = 1;
    }

    return items.map((item, idx) => ({
      ...item,
      allocatedBlocks: allocations[idx],
      percentage: Math.round((allocations[idx] / targetBudget) * 100)
    }));
  }

  // Each item gets baseline 1 block, remaining budget is distributed proportionally
  const baseline = 1;
  const remainingToDistribute = targetBudget - items.length;

  const quotas = items.map(item => {
    const exact = (item.weight / totalWeight) * remainingToDistribute;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { floor, remainder };
  });

  const allocated = quotas.map(q => baseline + q.floor);
  const currentSum = allocated.reduce((sum, v) => sum + v, 0);
  const shortfall = targetBudget - currentSum;

  if (shortfall > 0) {
    const withIndices = quotas.map((q, idx) => ({ remainder: q.remainder, idx }));
    withIndices.sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < shortfall; i++) {
      allocated[withIndices[i % withIndices.length].idx] += 1;
    }
  }

  return items.map((item, idx) => ({
    ...item,
    allocatedBlocks: allocated[idx],
    percentage: Math.round((allocated[idx] / targetBudget) * 100)
  }));
}

export interface AllocateStudyBlocksOptions {
  totalDailyBlocks?: number;
  courses?: Course[];
  upcomingExams?: Assessment[];
  unwatchedLectures?: ClassSession[];
  todayClasses?: ClassSession[];
  finalsPrepMode?: boolean;
  now?: Date | string | number;
}

/**
 * Main capacity allocator:
 * Allocates daily study budget across courses, shields, and exams.
 */
export function allocateDailyStudyBlocks({
  totalDailyBlocks = 6,
  courses = [],
  upcomingExams = [],
  unwatchedLectures = [],
  todayClasses = [],
  finalsPrepMode = false,
  now = new Date()
}: AllocateStudyBlocksOptions): DailyAllocationResult {
  const nowDate = now instanceof Date ? now : new Date(now);
  const currentDateStr = getAcademicDate(nowDate);

  if (finalsPrepMode) {
    // 100% to finals exams
    const finalsExams = upcomingExams.filter(e => {
      const type = (e.assessment_type || '').toUpperCase();
      return type === 'FINAL' || type === 'FINALS' || type === 'MIDTERM';
    });

    const targetExams = finalsExams.length > 0 ? finalsExams : upcomingExams;

    const courseWeightMap = new Map<string, number>();
    for (const exam of targetExams) {
      const course = courses.find(c => c.id === exam.course_id) || { effort_multiplier: 1.0, multiplier_expires_at: null };
      const mult = getEffectiveMultiplier(course, currentDateStr);
      const inSyllabusCount = unwatchedLectures.filter(l =>
        l.course_id === exam.course_id &&
        isLectureInSyllabus(l.lecture_number, exam.parsed_syllabus || 'ALL')
      ).length;

      const strain = computeExamStrain(exam, inSyllabusCount, mult, nowDate);
      const current = courseWeightMap.get(exam.course_id) || 0;
      courseWeightMap.set(exam.course_id, current + Math.max(0.1, strain));
    }

    const examItems: AllocatableItem[] = Array.from(courseWeightMap.entries()).map(([course_id, weight]) => ({
      course_id,
      weight,
      reason: 'Finals Prep Focus'
    }));

    const distributed = distributeIntegerBlocks(examItems, totalDailyBlocks);

    const courseAllocations: CourseAllocation[] = distributed.map(item => ({
      course_id: item.course_id,
      allocatedBlocks: item.allocatedBlocks,
      percentage: item.percentage,
      reason: item.reason || 'Finals Prep Focus'
    }));

    return {
      finalsPrepMode: true,
      totalDailyBlocks,
      routineShieldBlocks: 0,
      courseAllocations
    };
  }

  // Normal / Exam Crunch mode
  // Check crunch deferral for today's classes
  const nonDeferredClasses: ClassSession[] = [];
  const deferredClasses: ClassSession[] = [];

  for (const cls of todayClasses) {
    if (shouldCrunchDeferCourse(cls.course_id, upcomingExams, nowDate)) {
      deferredClasses.push(cls);
    } else {
      nonDeferredClasses.push(cls);
    }
  }

  // Allocate 1 block per non-deferred class shield (up to 40% of daily budget)
  const maxShieldBlocks = Math.floor(totalDailyBlocks * 0.4);
  const routineShieldBlocks = Math.min(nonDeferredClasses.length, maxShieldBlocks);
  const remainingStudyBudget = Math.max(0, totalDailyBlocks - routineShieldBlocks);

  // Compute strains across active courses
  const courseWeights: AllocatableItem[] = courses.map(course => {
    const mult = getEffectiveMultiplier(course, currentDateStr);
    const relatedExam = upcomingExams.find(e => e.course_id === course.id);

    if (relatedExam) {
      const inSyllabusCount = unwatchedLectures.filter(l =>
        l.course_id === course.id &&
        isLectureInSyllabus(l.lecture_number, relatedExam.parsed_syllabus || 'ALL')
      ).length;

      const strain = computeExamStrain(relatedExam, inSyllabusCount, mult, nowDate);
      return { course_id: course.id, weight: Math.max(0.1, strain), hasExam: true };
    }

    // Unrelated course: weight depends on backlog count and multiplier
    const backlogCount = unwatchedLectures.filter(l => l.course_id === course.id).length;
    const weight = Math.max(0.1, backlogCount * 0.5 * mult);
    return { course_id: course.id, weight, hasExam: false };
  });

  // Filter to courses that have work (either exams or backlog)
  const activeCourses = courseWeights.filter(c => c.weight > 0.1 || c.hasExam);
  const pool = activeCourses.length > 0 ? activeCourses : courseWeights;

  const distributed = distributeIntegerBlocks(pool, remainingStudyBudget);

  const courseAllocations: CourseAllocation[] = distributed.map(item => ({
    course_id: item.course_id,
    allocatedBlocks: item.allocatedBlocks,
    percentage: item.percentage,
    reason: item.hasExam ? 'Exam Triage' : 'Backlog Recovery'
  }));

  return {
    finalsPrepMode: false,
    totalDailyBlocks,
    routineShieldBlocks,
    deferredClassesCount: deferredClasses.length,
    courseAllocations
  };
}
