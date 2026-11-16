/**
 * Orian IPC Contracts & Typed API
 * 100% Strict Type Safety across Electron Main and Preload
 */

import type {
  Course,
  CourseInput,
  CourseUpdateInput,
  RoutineSlot,
  RoutineSlotInput,
  ClassSession,
  ClassSessionInput,
  Assessment,
  AssessmentInput,
  PomodoroSession,
  ActiveTimerState,
  SettingsState,
  DashboardSnapshot,
  GapTriageResult,
  BackupPayload,
  ClassDisruptionResult,
  ThemeMode,
  ContrastMode
} from './domain.ts';

export interface DisruptionPayload {
  class_id?: string;
  course_id?: string;
  date?: string;
  disruptionType: 'online_recorded' | 'cancelled' | 'makeup';
  startTime?: string;
  endTime?: string;
  lecture_number?: number | null;
}

export interface PomodoroStartParams {
  course_id?: string | null;
  class_id?: string | null;
  assessment_id?: string | null;
  mode?: 'lecture_recovery' | 'exam_revision' | 'free_focus';
  durationMinutes?: number;
}

export interface PomodoroCompleteParams {
  notes?: string;
}

export interface GapTriageParams {
  maxImmediateCapacity?: number;
}

export interface OrianAPI {
  // Snapshot
  getDashboardSnapshot(now?: string | number | Date): Promise<DashboardSnapshot>;

  // Courses
  getCourses(): Promise<Course[]>;
  createCourse(course: CourseInput): Promise<Course>;
  updateCourse(id: string, updates: CourseUpdateInput): Promise<Course | null>;
  deleteCourse(id: string): Promise<boolean>;

  // Classes & Routine
  getClassesByDate(dateStr: string): Promise<ClassSession[]>;
  getUnwatchedClasses(): Promise<ClassSession[]>;
  createClass(classData: ClassSessionInput): Promise<ClassSession>;
  updateClass(id: string, updates: Partial<ClassSessionInput>): Promise<ClassSession | null>;
  markClassAttended(id: string): Promise<ClassSession | null>;
  markClassReviewed(id: string): Promise<ClassSession | null>;
  handleClassDisruption(payload: DisruptionPayload): Promise<ClassDisruptionResult>;
  syncClassesFromRoutine(dateStr: string, dayOfWeek: number): Promise<ClassSession[]>;

  // Timetable Routine
  getRoutine(): Promise<RoutineSlot[]>;
  createRoutineSlot(slot: RoutineSlotInput): Promise<RoutineSlot>;
  deleteRoutineSlot(id: string): Promise<boolean>;

  // Assessments
  getAssessments(): Promise<Assessment[]>;
  getUpcomingAssessments(fromDate?: string): Promise<Assessment[]>;
  createAssessment(data: AssessmentInput): Promise<Assessment>;
  updateAssessment(id: string, updates: Partial<AssessmentInput>): Promise<Assessment | null>;
  deleteAssessment(id: string): Promise<boolean>;
  markAssessmentCompleted(id: string, isCompleted: boolean): Promise<Assessment | null>;

  // Pomodoro
  getPomodoroActive(): Promise<ActiveTimerState | null>;
  startPomodoro(params: PomodoroStartParams): Promise<ActiveTimerState>;
  pausePomodoro(): Promise<ActiveTimerState | null>;
  resumePomodoro(): Promise<ActiveTimerState | null>;
  cancelPomodoro(): Promise<boolean>;
  completePomodoro(params?: PomodoroCompleteParams): Promise<PomodoroSession | null>;
  getPomodoroHistory(limit?: number): Promise<PomodoroSession[]>;

  // Settings
  getSettings(): Promise<SettingsState>;
  updateSettings(updates: Partial<SettingsState>): Promise<SettingsState>;

  // Gap Triage
  applyGapReturnTriage(params?: GapTriageParams): Promise<GapTriageResult>;

  // Backup & Restore
  exportBackup(): Promise<BackupPayload>;
  importBackup(data: BackupPayload): Promise<boolean>;

  // Window Controls
  setThemeOverlay(theme: ThemeMode): Promise<boolean>;
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
}

declare global {
  interface Window {
    orianAPI: OrianAPI;
  }
}
