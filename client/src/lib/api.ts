/**
 * Orian Desktop API Client
 * Wraps window.orianAPI exposed via preload.cjs contextBridge.
 * 100% Strict TypeScript
 */

import type {
  OrianAPI,
  DashboardSnapshot,
  Course,
  CourseInput,
  CourseUpdateInput,
  ClassSession,
  ClassSessionInput,
  RoutineSlot,
  RoutineSlotInput,
  Assessment,
  AssessmentInput,
  ActiveTimerState,
  PomodoroSession,
  SettingsState,
  GapTriageResult,
  BackupPayload,
  ClassDisruptionResult,
  ThemeMode,
  DisruptionPayload,
  PomodoroStartParams,
  PomodoroCompleteParams,
  GapTriageParams
} from './types.ts';

const isElectron = typeof window !== 'undefined' && Boolean(window.orianAPI);

export const api: OrianAPI = {
  // Dashboard Snapshot
  async getDashboardSnapshot(now?: string | number | Date): Promise<DashboardSnapshot> {
    if (isElectron) return window.orianAPI.getDashboardSnapshot(now);
    console.warn('orianAPI not available in mock/browser mode');
    return null as unknown as DashboardSnapshot;
  },

  // Courses
  async getCourses(): Promise<Course[]> {
    if (isElectron) return window.orianAPI.getCourses();
    return [];
  },
  async createCourse(data: CourseInput): Promise<Course> {
    if (isElectron) return window.orianAPI.createCourse(data);
    return null as unknown as Course;
  },
  async updateCourse(id: string, data: CourseUpdateInput): Promise<Course | null> {
    if (isElectron) return window.orianAPI.updateCourse(id, data);
    return null;
  },
  async deleteCourse(id: string): Promise<boolean> {
    if (isElectron) return window.orianAPI.deleteCourse(id);
    return true;
  },

  // Classes & Routine
  async getClassesByDate(dateStr: string): Promise<ClassSession[]> {
    if (isElectron) return window.orianAPI.getClassesByDate(dateStr);
    return [];
  },
  async getUnwatchedClasses(): Promise<ClassSession[]> {
    if (isElectron) return window.orianAPI.getUnwatchedClasses();
    return [];
  },
  async createClass(data: ClassSessionInput): Promise<ClassSession> {
    if (isElectron) return window.orianAPI.createClass(data);
    return null as unknown as ClassSession;
  },
  async updateClass(id: string, data: Partial<ClassSessionInput>): Promise<ClassSession | null> {
    if (isElectron) return window.orianAPI.updateClass(id, data);
    return null;
  },
  async markClassAttended(id: string): Promise<ClassSession | null> {
    if (isElectron) return window.orianAPI.markClassAttended(id);
    return null;
  },
  async markClassReviewed(id: string): Promise<ClassSession | null> {
    if (isElectron) return window.orianAPI.markClassReviewed(id);
    return null;
  },
  async handleClassDisruption(payload: DisruptionPayload): Promise<ClassDisruptionResult> {
    if (isElectron) return window.orianAPI.handleClassDisruption(payload);
    return {
      recurringTemplateMutated: false,
      notice: 'Mock disruption handled'
    };
  },
  async syncClassesFromRoutine(dateStr: string, dayOfWeek: number): Promise<ClassSession[]> {
    if (isElectron) return window.orianAPI.syncClassesFromRoutine(dateStr, dayOfWeek);
    return [];
  },

  // Routine
  async getRoutine(): Promise<RoutineSlot[]> {
    if (isElectron) return window.orianAPI.getRoutine();
    return [];
  },
  async createRoutineSlot(slot: RoutineSlotInput): Promise<RoutineSlot> {
    if (isElectron) return window.orianAPI.createRoutineSlot(slot);
    return null as unknown as RoutineSlot;
  },
  async deleteRoutineSlot(id: string): Promise<boolean> {
    if (isElectron) return window.orianAPI.deleteRoutineSlot(id);
    return true;
  },

  // Assessments
  async getAssessments(): Promise<Assessment[]> {
    if (isElectron) return window.orianAPI.getAssessments();
    return [];
  },
  async getUpcomingAssessments(fromDate?: string): Promise<Assessment[]> {
    if (isElectron) return window.orianAPI.getUpcomingAssessments(fromDate);
    return [];
  },
  async createAssessment(data: AssessmentInput): Promise<Assessment> {
    if (isElectron) return window.orianAPI.createAssessment(data);
    return null as unknown as Assessment;
  },
  async updateAssessment(id: string, data: Partial<AssessmentInput>): Promise<Assessment | null> {
    if (isElectron) return window.orianAPI.updateAssessment(id, data);
    return null;
  },
  async deleteAssessment(id: string): Promise<boolean> {
    if (isElectron) return window.orianAPI.deleteAssessment(id);
    return true;
  },
  async markAssessmentCompleted(id: string, isCompleted: boolean): Promise<Assessment | null> {
    if (isElectron) return window.orianAPI.markAssessmentCompleted(id, isCompleted);
    return null;
  },

  // Pomodoro
  async getPomodoroActive(): Promise<ActiveTimerState | null> {
    if (isElectron) return window.orianAPI.getPomodoroActive();
    return null;
  },
  async startPomodoro(params: PomodoroStartParams): Promise<ActiveTimerState> {
    if (isElectron) return window.orianAPI.startPomodoro(params);
    return null as unknown as ActiveTimerState;
  },
  async pausePomodoro(): Promise<ActiveTimerState | null> {
    if (isElectron) return window.orianAPI.pausePomodoro();
    return null;
  },
  async resumePomodoro(): Promise<ActiveTimerState | null> {
    if (isElectron) return window.orianAPI.resumePomodoro();
    return null;
  },
  async cancelPomodoro(): Promise<boolean> {
    if (isElectron) return window.orianAPI.cancelPomodoro();
    return true;
  },
  async completePomodoro(params?: PomodoroCompleteParams): Promise<PomodoroSession | null> {
    if (isElectron) return window.orianAPI.completePomodoro(params);
    return null;
  },
  async getPomodoroHistory(limit?: number): Promise<PomodoroSession[]> {
    if (isElectron) return window.orianAPI.getPomodoroHistory(limit);
    return [];
  },

  // Settings
  async getSettings(): Promise<SettingsState> {
    if (isElectron) return window.orianAPI.getSettings();
    return {};
  },
  async updateSettings(updates: Partial<SettingsState>): Promise<SettingsState> {
    if (isElectron) return window.orianAPI.updateSettings(updates);
    return updates;
  },

  // Gap Triage
  async applyGapReturnTriage(params?: GapTriageParams): Promise<GapTriageResult> {
    if (isElectron) return window.orianAPI.applyGapReturnTriage(params);
    return {
      prioritizedLectures: [],
      deferredLectures: [],
      explanation: ''
    };
  },

  // Backup & Restore
  async exportBackup(): Promise<BackupPayload> {
    if (isElectron) return window.orianAPI.exportBackup();
    return null as unknown as BackupPayload;
  },
  async importBackup(data: BackupPayload): Promise<boolean> {
    if (isElectron) return window.orianAPI.importBackup(data);
    return false;
  },

  // Window Controls
  async setThemeOverlay(theme: ThemeMode): Promise<boolean> {
    if (isElectron) return window.orianAPI.setThemeOverlay(theme);
    return true;
  },
  minimizeWindow(): void {
    if (isElectron) window.orianAPI.minimizeWindow();
  },
  maximizeWindow(): void {
    if (isElectron) window.orianAPI.maximizeWindow();
  },
  closeWindow(): void {
    if (isElectron) window.orianAPI.closeWindow();
  }
};
