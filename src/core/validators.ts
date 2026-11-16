/**
 * Orian Core Validators & Parsers
 * 100% Strict TypeScript Implementation
 */

import type { AssessmentInput, RoutineSlot, RoutineSlotInput } from '../types/domain.ts';

export type ParsedSyllabus = number[] | 'ALL';

/**
 * Parses raw syllabus range string.
 * Supports: "8-12", "3, 5, 8-10", "All", "all"
 * Returns array of numbers or 'ALL'
 */
export function parseSyllabusRange(raw: unknown): ParsedSyllabus {
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (/^all$/i.test(trimmed)) {
    return 'ALL';
  }

  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  const result = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const splitParts = part.split('-');
      if (splitParts.length !== 2) {
        throw new Error(`Invalid range: ${part}`);
      }
      const [startStr, endStr] = splitParts.map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        throw new Error(`Invalid range: ${part}`);
      }

      for (let i = start; i <= end; i++) {
        result.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (Number.isNaN(num)) {
        throw new Error(`Invalid lecture number: ${part}`);
      }
      result.add(num);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Checks if a lecture number falls within the syllabus.
 */
export function isLectureInSyllabus(lectureNo: number | null | undefined, syllabusRange: unknown): boolean {
  if (lectureNo === null || lectureNo === undefined) return false;
  if (syllabusRange === 'ALL') return true;
  if (!Array.isArray(syllabusRange)) return false;
  return syllabusRange.includes(lectureNo);
}

export interface ValidatedExamOutput extends AssessmentInput {
  parsed_syllabus: ParsedSyllabus;
}

/**
 * Validates exam / assessment payload
 */
export function validateExamInput(examData: AssessmentInput | (Partial<AssessmentInput> & Record<string, unknown>)): ValidatedExamOutput {
  if (!examData || typeof examData !== 'object') {
    throw new Error('Invalid exam data');
  }

  if (!examData.course_id || typeof examData.course_id !== 'string') {
    throw new Error('course_id is required');
  }

  if (!examData.exam_date) {
    throw new Error('exam_date is required');
  }

  const dateObj = new Date(examData.exam_date as string);
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error('Invalid exam_date format');
  }

  const assessment_type = examData.assessment_type || 'CT';
  const revision_target_blocks = examData.revision_target_blocks && Number(examData.revision_target_blocks) > 0
    ? parseInt(String(examData.revision_target_blocks), 10)
    : 4;

  const rawSyllabus = examData.syllabus_range || 'ALL';
  const parsed_syllabus = parseSyllabusRange(rawSyllabus);

  return {
    course_id: examData.course_id,
    title: examData.title || `${assessment_type} Assessment`,
    assessment_type,
    exam_date: String(examData.exam_date),
    syllabus_range: String(rawSyllabus),
    parsed_syllabus,
    weight_percent: examData.weight_percent !== undefined ? Number(examData.weight_percent) : null,
    revision_target_blocks,
    revision_completed_blocks: examData.revision_completed_blocks ? Number(examData.revision_completed_blocks) : 0,
    is_completed: examData.is_completed ? 1 : 0,
    notes: examData.notes ? String(examData.notes) : null
  };
}

/**
 * Converts "HH:MM" string to minutes from midnight
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Validates routine time slot and prevents overlaps
 */
export function validateRoutineTimeSlot(slot: RoutineSlotInput, existingSlots: (RoutineSlot | RoutineSlotInput)[] = []): boolean {
  if (!slot.start_time || !slot.end_time) {
    throw new Error('start_time and end_time are required');
  }

  const startMin = timeToMinutes(slot.start_time);
  const endMin = timeToMinutes(slot.end_time);

  if (endMin <= startMin) {
    throw new Error('end_time must be after start_time');
  }

  const dayOfWeek = slot.day_of_week;
  if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error('day_of_week must be between 0 (Sunday) and 6 (Saturday)');
  }

  for (const existing of existingSlots) {
    if (existing.id && slot.id && existing.id === slot.id) continue;
    if (existing.day_of_week === dayOfWeek) {
      const eStart = timeToMinutes(existing.start_time);
      const eEnd = timeToMinutes(existing.end_time);

      // Check overlap: (StartA < EndB) and (EndA > StartB)
      if (startMin < eEnd && endMin > eStart) {
        throw new Error(`Slot overlaps with an existing slot on day ${dayOfWeek} (${existing.start_time}-${existing.end_time})`);
      }
    }
  }

  return true;
}
