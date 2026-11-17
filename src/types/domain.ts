/**
 * Orian Domain Models & Type Definitions
 * 100% Strict TypeScript Domain Layer
 */

export type AssessmentType = 'CT' | 'MIDTERM' | 'FINAL' | 'QUIZ' | 'ASSIGNMENT';

export type ClassStatus = 'scheduled' | 'attended' | 'missed' | 'cancelled' | 'online_recorded';

export type PomodoroStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export type PomodoroMode = 'lecture_recovery' | 'exam_revision' | 'free_focus';

export type ThemeMode = 'light' | 'dark';

export type ContrastMode = 'normal' | 'high';

export type QuoteCategory =
  | 'deep_focus'
  | 'crunch'
  | 'exam_imminent'
  | 'recovery_gap'
  | 'streak_milestone'
  | 'break';

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  effort_multiplier: number;
  multiplier_expires_at: string | null;
  created_at?: string;
}

export interface CourseInput {
  name: string;
  code: string;
  color?: string;
  effort_multiplier?: number;
  multiplier_expires_at?: string | null;
}

export interface CourseUpdateInput {
  name?: string;
  code?: string;
  color?: string;
  effort_multiplier?: number;
  multiplier_expires_at?: string | null;
}

export interface RoutineSlot {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  course_color?: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  room?: string | null;
  location?: string | null;
}

export interface RoutineSlotInput {
  id?: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
}

export interface ClassSession {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  course_color?: string;
  routine_id?: string | null;
  date: string; // YYYY-MM-DD (Academic Date)
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  lecture_number?: number | null;
  status: ClassStatus;
  is_reviewed: number; // 0 or 1
  is_makeup: number;   // 0 or 1
  is_crunch_deferred: number; // 0 or 1
  notes?: string | null;
  created_at?: string;
}

export interface ClassSessionInput {
  course_id: string;
  routine_id?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  lecture_number?: number | null;
  status?: ClassStatus;
  is_reviewed?: number;
  is_makeup?: number;
  is_crunch_deferred?: number;
  notes?: string | null;
}

export interface Assessment {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  course_color?: string;
  title: string;
  assessment_type: AssessmentType;
  exam_date: string; // ISO date-time or YYYY-MM-DD
  syllabus_range: string; // e.g. "8-12", "All", "3, 5, 8-10"
  parsed_syllabus?: number[] | 'ALL';
  weight_percent?: number | null;
  revision_target_blocks: number; // Pomodoro blocks target (default: 4)
  revision_completed_blocks: number;
  is_completed: number; // 0 or 1
  notes?: string | null;
  created_at?: string;
}

export interface AssessmentInput {
  course_id: string;
  title: string;
  assessment_type?: AssessmentType;
  exam_date: string;
  syllabus_range?: string;
  weight_percent?: number | null;
  revision_target_blocks?: number;
  revision_completed_blocks?: number;
  is_completed?: number;
  notes?: string | null;
}

export interface PomodoroSession {
  id: string;
  course_id: string | null;
  course_code?: string | null;
  class_id?: string | null;
  assessment_id?: string | null;
  mode: PomodoroMode;
  session_mode?: string;
  target_duration_seconds?: number;
  actual_duration_seconds?: number;
  duration_seconds?: number;
  started_at: number; // unix timestamp ms
  ended_at?: number | null;
  completed_at?: number | null;
  status: PomodoroStatus;
  notes?: string | null;
}

export interface ActiveTimerState {
  id: string;
  course_id: string | null;
  class_id?: string | null;
  assessment_id?: string | null;
  mode: PomodoroMode;
  session_mode?: string;
  target_duration_seconds: number;
  started_at: number; // timestamp ms
  paused_at?: number | null;
  paused_elapsed_seconds?: number;
  status: PomodoroStatus;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  autoCompleted?: boolean;
}

export interface SettingsState {
  academic_cutoff_hour?: number; // default: 4 (4:00 AM)
  daily_study_blocks_target?: number; // default: 6
  pomodoro_focus_minutes?: number; // default: 25
  pomodoro_short_break_minutes?: number; // default: 5
  pomodoro_long_break_minutes?: number; // default: 15
  theme?: ThemeMode;
  contrast?: ContrastMode;
  dyslexic_font?: number | boolean;
  chimes_enabled?: number | boolean;
  finals_prep_mode?: number | boolean;
  last_active_academic_date?: string | null;
  onboarding_completed?: number | boolean;
  [key: string]: unknown;
}

export interface AcademicDateBounds {
  start: Date;
  end: Date;
}

export interface GapDetectionResult {
  gapDetected: boolean;
  gapDays: number;
}

export interface GapTriageResult {
  prioritizedLectures: ClassSession[];
  deferredLectures: (ClassSession & { is_backlog_deferred: boolean })[];
  explanation: string;
}

export interface ExamStrain {
  exam: Assessment;
  strain: number;
  inSyllabusCount: number;
  daysRemaining: number;
}

export interface CapacityDeficit {
  hasDeficit: boolean;
  totalDeficitBlocks: number;
  dailyDeficit: number;
  warningText: string | null;
}

export interface CourseAllocation {
  course_id: string;
  course_code?: string;
  course_name?: string;
  course_color?: string;
  allocatedBlocks: number;
  percentage: number;
  reason: string;
}

export interface DailyAllocationResult {
  finalsPrepMode: boolean;
  totalDailyBlocks: number;
  routineShieldBlocks: number;
  deferredClassesCount?: number;
  courseAllocations: CourseAllocation[];
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: QuoteCategory;
}

export interface ClassDisruptionResult {
  updatedClass?: Partial<ClassSession>;
  guardActive?: boolean;
  recoveryDueHours?: number;
  recurringTemplateMutated: boolean;
  suppressShield?: boolean;
  isMakeup?: boolean;
  notice: string;
}

export interface DashboardSnapshot {
  academicDate: string;
  academicBounds: {
    start: string;
    end: string;
  };
  cutoffHour: number;
  courses: Course[];
  todayClasses: ClassSession[];
  upcomingExams: Assessment[];
  unwatchedLectures: ClassSession[];
  routineSlots?: RoutineSlot[];
  allocation: DailyAllocationResult;
  capacityDeficit: CapacityDeficit;
  activeTimer: ActiveTimerState | null;
  quote: Quote;
  gapInfo: GapDetectionResult;
  settings: SettingsState;
}

export interface BackupPayload {
  version: number;
  timestamp: string;
  courses: Course[];
  routine: RoutineSlot[];
  classes: ClassSession[];
  assessments: Assessment[];
  pomodoro: PomodoroSession[];
  settings: SettingsState;
}
