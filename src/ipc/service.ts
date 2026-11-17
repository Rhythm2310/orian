/**
 * Pure IPC Service Controller
 * Decoupled from Electron UI for testability and headless execution.
 * 100% Strict TypeScript
 */

import type { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CoursesRepository,
  ClassesRepository,
  RoutineRepository,
  AssessmentsRepository,
  PomodoroRepository,
  SettingsRepository,
  BackupService
} from '../db/repositories.ts';
import { snapshotCache } from '../db/cache.ts';
import {
  getAcademicDate,
  calculateMultiDayGap,
  triageGapReturn,
  computeCourseBacklogScore
} from '../core/antiBacklog.ts';
import {
  allocateDailyStudyBlocks,
  computeCapacityDeficit,
  shouldCrunchDeferCourse
} from '../core/allocator.ts';
import {
  recoverWallClockTimer,
  selectContextualQuote,
  handleClassDisruption
} from '../core/pomodoro.ts';
import { validateExamInput, validateRoutineTimeSlot } from '../core/validators.ts';

import type {
  Course,
  CourseInput,
  CourseUpdateInput,
  ClassSession,
  ClassSessionInput,
  RoutineSlot,
  RoutineSlotInput,
  Assessment,
  AssessmentInput,
  PomodoroSession,
  ActiveTimerState,
  SettingsState,
  DashboardSnapshot,
  GapTriageResult,
  BackupPayload,
  ClassDisruptionResult,
  Quote
} from '../types/domain.ts';
import type { DisruptionPayload, PomodoroStartParams, PomodoroCompleteParams, GapTriageParams } from '../types/ipc.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IpcService {
  public db: DatabaseSync;
  public coursesRepo: CoursesRepository;
  public classesRepo: ClassesRepository;
  public routineRepo: RoutineRepository;
  public assessmentsRepo: AssessmentsRepository;
  public pomodoroRepo: PomodoroRepository;
  public settingsRepo: SettingsRepository;
  public backupService: BackupService;
  private quotes: Quote[];

  constructor(db: DatabaseSync) {
    this.db = db;
    this.coursesRepo = new CoursesRepository(db);
    this.classesRepo = new ClassesRepository(db);
    this.routineRepo = new RoutineRepository(db);
    this.assessmentsRepo = new AssessmentsRepository(db);
    this.pomodoroRepo = new PomodoroRepository(db);
    this.settingsRepo = new SettingsRepository(db);
    this.backupService = new BackupService(db);

    this.quotes = this.loadQuotes();
  }

  private loadQuotes(): Quote[] {
    try {
      const quotesPath = path.resolve(__dirname, '../../data/quotes.json');
      if (fs.existsSync(quotesPath)) {
        return JSON.parse(fs.readFileSync(quotesPath, 'utf8')) as Quote[];
      }
    } catch {
      // fallback
    }
    return [
      { id: '1', text: 'Start with the single lecture that unblocks the next two.', author: 'Orian', category: 'deep_focus' }
    ];
  }

  // --- Dashboard Snapshot ---

  dashboardGetSnapshot({ now = new Date() }: { now?: Date | string | number } = {}): DashboardSnapshot {
    const nowDate = now instanceof Date ? now : new Date(now);
    const settings = this.settingsRepo.getAll();
    const cutoffHour = settings.academic_cutoff_hour || 4;
    const academicDate = getAcademicDate(nowDate, cutoffHour);

    const cacheKey = `snapshot_${academicDate}_${nowDate.getHours()}_${nowDate.getMinutes()}`;
    const cached = snapshotCache.get<DashboardSnapshot>(cacheKey);
    if (cached) return cached;

    const courses = this.coursesRepo.getAll();
    let todayClasses = this.classesRepo.getByDate(academicDate);

    // Auto-sync today's classes from recurring routine timetable if new academic day
    if (todayClasses.length === 0) {
      const dayOfWeek = nowDate.getDay();
      todayClasses = this.classesSyncFromRoutine(academicDate, dayOfWeek);
    }

    const upcomingExams = this.assessmentsRepo.getUpcoming(academicDate);
    const unwatchedLectures = this.classesRepo.getUnwatched();

    // Check Crunch Deferrals on today's classes
    for (const cls of todayClasses) {
      if (shouldCrunchDeferCourse(cls.course_id, upcomingExams, nowDate) && !cls.is_crunch_deferred) {
        this.classesRepo.markCrunchDeferred(cls.id, 1);
        cls.is_crunch_deferred = 1;
      }
    }

    // Allocate Daily Study Blocks
    const totalDailyBlocks = Number(settings.daily_study_blocks_target || settings.daily_block_target || 6);
    const finalsPrepMode = Boolean(settings.finals_prep_mode);

    const allocation = allocateDailyStudyBlocks({
      totalDailyBlocks,
      courses,
      upcomingExams,
      unwatchedLectures,
      todayClasses,
      finalsPrepMode,
      now: nowDate
    });

    // Compute Capacity Deficit
    const capacityDeficit = computeCapacityDeficit({
      upcomingExams,
      unwatchedLectures,
      dailyCapacityBlocks: totalDailyBlocks,
      now: nowDate
    });

    // Multi-Day Absence Gap Detection
    const lastActive = settings.last_active_academic_date;
    const gapInfo = calculateMultiDayGap(lastActive, academicDate);

    // Active Timer Recovery
    const rawTimer = this.pomodoroRepo.getActiveTimer();
    const activeTimer = rawTimer ? recoverWallClockTimer(rawTimer, nowDate.getTime()) : null;

    // Pick contextual quote
    const hasImminentExam = upcomingExams.some(e => {
      const diffHours = (new Date(e.exam_date).getTime() - nowDate.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 72;
    });
    const isCrunch = upcomingExams.some(e => shouldCrunchDeferCourse('__check__', [e], nowDate));

    const quote = selectContextualQuote(this.quotes, {
      isCrunch,
      hasImminentExam,
      isGapReturn: gapInfo.gapDetected,
      onBreak: false,
      streakDays: 0
    });

    // Compute Course Backlog Scores
    const coursesWithScores: Course[] = courses.map(course => ({
      ...course,
      backlogScore: computeCourseBacklogScore(course, unwatchedLectures, upcomingExams, academicDate)
    }));

    const bounds = {
      start: new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), cutoffHour, 0, 0).toISOString(),
      end: new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + 1, cutoffHour - 1, 59, 59).toISOString()
    };

    const result: DashboardSnapshot = {
      academicDate,
      academicBounds: bounds,
      cutoffHour,
      courses: coursesWithScores,
      todayClasses,
      upcomingExams,
      unwatchedLectures,
      routineSlots: this.routineRepo.getAll(),
      allocation,
      capacityDeficit,
      activeTimer,
      quote,
      gapInfo,
      settings
    };

    snapshotCache.set(cacheKey, result);
    return result;
  }

  // --- Courses ---

  coursesGetAll(): Course[] {
    return this.coursesRepo.getAll();
  }

  coursesCreate(data: CourseInput): Course {
    const res = this.coursesRepo.create(data);
    snapshotCache.invalidate();
    return res;
  }

  coursesUpdate(id: string, data: CourseUpdateInput): Course | null {
    const res = this.coursesRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  coursesDelete(id: string): boolean {
    const res = this.coursesRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  // --- Classes & Routine ---

  classesGetByDate(dateStr: string): ClassSession[] {
    return this.classesRepo.getByDate(dateStr);
  }

  classesGetUnwatched(): ClassSession[] {
    return this.classesRepo.getUnwatched();
  }

  classesCreate(data: ClassSessionInput): ClassSession {
    const res = this.classesRepo.create(data);
    snapshotCache.invalidate();
    return res;
  }

  classesUpdate(id: string, data: Partial<ClassSessionInput>): ClassSession | null {
    const res = this.classesRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  classesMarkAttended(id: string): ClassSession | null {
    const res = this.classesRepo.markAttended(id);
    snapshotCache.invalidate();
    return res;
  }

  classesMarkReviewed(id: string): ClassSession | null {
    const res = this.classesRepo.markReviewed(id);
    snapshotCache.invalidate();
    return res;
  }

  classesHandleDisruption({ class_id, disruptionType, course_id, date, ...rest }: DisruptionPayload): ClassDisruptionResult {
    let cls: ClassSession | null = class_id ? this.classesRepo.getById(class_id) : null;
    if (!cls && course_id && date) {
      const todayClasses = this.classesRepo.getByDate(date);
      cls = todayClasses.find(c => c.course_id === course_id) || null;
    }

    const result = handleClassDisruption({
      classInstance: cls,
      course_id,
      date,
      disruptionType,
      ...rest
    });

    if (disruptionType === 'makeup' && result.updatedClass) {
      this.classesRepo.create(result.updatedClass as ClassSessionInput);
    } else if (cls && result.updatedClass) {
      this.classesRepo.update(cls.id, {
        status: result.updatedClass.status
      });
    } else if (!cls && course_id && date && result.updatedClass) {
      this.classesRepo.create({
        course_id,
        date,
        lecture_number: result.updatedClass.lecture_number || 1,
        notes: result.updatedClass.notes || '',
        status: result.updatedClass.status,
        start_time: '09:00',
        end_time: '10:30'
      });
    }

    snapshotCache.invalidate();
    return result;
  }

  routineGetAll(): RoutineSlot[] {
    return this.routineRepo.getAll();
  }

  routineCreate(slot: RoutineSlotInput): RoutineSlot {
    const existing = this.routineRepo.getAll();
    validateRoutineTimeSlot(slot, existing);
    const res = this.routineRepo.create(slot);
    snapshotCache.invalidate();
    return res;
  }

  routineDelete(id: string): boolean {
    const res = this.routineRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  // Populate today's scheduled classes from weekly routine slots
  classesSyncFromRoutine(academicDateStr: string, dayOfWeek: number): ClassSession[] {
    const slots = this.routineRepo.getByDay(dayOfWeek);
    const existingToday = this.classesRepo.getByDate(academicDateStr);
    const existingCourseIds = new Set(existingToday.map(c => c.course_id));

    for (const slot of slots) {
      if (!existingCourseIds.has(slot.course_id)) {
        const nextLec = this.classesRepo.getNextLectureNumber(slot.course_id);
        this.classesRepo.create({
          course_id: slot.course_id,
          date: academicDateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          lecture_number: nextLec,
          notes: `${slot.course_code || 'Lecture'} ${nextLec}`
        });
      }
    }
    snapshotCache.invalidate();
    return this.classesRepo.getByDate(academicDateStr);
  }

  // --- Assessments ---

  assessmentsGetAll(): Assessment[] {
    return this.assessmentsRepo.getAll();
  }

  assessmentsGetUpcoming(fromDate?: string): Assessment[] {
    return this.assessmentsRepo.getUpcoming(fromDate);
  }

  assessmentsCreate(data: AssessmentInput): Assessment {
    const validated = validateExamInput(data);
    const res = this.assessmentsRepo.create(validated);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsUpdate(id: string, data: Partial<AssessmentInput>): Assessment | null {
    const res = this.assessmentsRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsDelete(id: string): boolean {
    const res = this.assessmentsRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsMarkCompleted(id: string, isCompleted: boolean | number = 1): Assessment | null {
    const res = this.assessmentsRepo.markCompleted(id, isCompleted);
    snapshotCache.invalidate();
    return res;
  }

  // --- Pomodoro ---

  pomodoroGetActive(): ActiveTimerState | null {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw) return null;
    return recoverWallClockTimer(raw, Date.now());
  }

  pomodoroStart({
    course_id = null,
    assessment_id = null,
    class_id = null,
    mode = 'free_focus',
    durationMinutes = 25
  }: PomodoroStartParams = {}): ActiveTimerState {
    const targetDuration = (durationMinutes || 25) * 60;
    const timer = this.pomodoroRepo.saveActiveTimer({
      started_at: Date.now(),
      target_duration_seconds: targetDuration,
      status: 'running',
      course_id,
      assessment_id,
      class_id,
      session_mode: mode,
      notes: ''
    });
    snapshotCache.invalidate();
    return timer!;
  }

  pomodoroPause(): ActiveTimerState | null {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw || raw.status !== 'running') return raw;

    const elapsed = Math.floor((Date.now() - raw.started_at) / 1000);
    const updated = this.pomodoroRepo.saveActiveTimer({
      ...raw,
      status: 'paused',
      paused_elapsed_seconds: elapsed
    });
    snapshotCache.invalidate();
    return updated;
  }

  pomodoroResume(): ActiveTimerState | null {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw || raw.status !== 'paused') return raw;

    const pausedElapsed = raw.paused_elapsed_seconds || 0;
    const newStartedAt = Date.now() - (pausedElapsed * 1000);

    const updated = this.pomodoroRepo.saveActiveTimer({
      ...raw,
      started_at: newStartedAt,
      status: 'running',
      paused_elapsed_seconds: 0
    });
    snapshotCache.invalidate();
    return updated;
  }

  pomodoroCancel(): boolean {
    this.pomodoroRepo.clearActiveTimer();
    snapshotCache.invalidate();
    return true;
  }

  pomodoroComplete({ notes = '' }: PomodoroCompleteParams = {}): PomodoroSession | null {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw) return null;

    const rawMode = raw.mode || (raw as { session_mode?: string }).session_mode || 'free_focus';
    const session = this.pomodoroRepo.logSession({
      course_id: raw.course_id,
      assessment_id: raw.assessment_id,
      class_id: raw.class_id,
      session_mode: rawMode,
      mode: rawMode as any,
      started_at: raw.started_at,
      ended_at: Date.now(),
      duration_seconds: raw.target_duration_seconds,
      status: 'completed',
      notes: notes || ''
    });

    if (raw.class_id) {
      this.classesRepo.markReviewed(raw.class_id);
    }

    if (raw.assessment_id) {
      const asm = this.assessmentsRepo.getById(raw.assessment_id);
      if (asm) {
        this.assessmentsRepo.update(asm.id, {
          revision_completed_blocks: (asm.revision_completed_blocks || 0) + 1
        });
      }
    }

    this.pomodoroRepo.clearActiveTimer();
    snapshotCache.invalidate();
    return session;
  }

  pomodoroGetHistory(limit = 50): PomodoroSession[] {
    return this.pomodoroRepo.getAllSessions(limit);
  }

  // --- Settings ---

  settingsGetAll(): SettingsState {
    return this.settingsRepo.getAll();
  }

  settingsUpdate(updates: Partial<SettingsState> = {}): SettingsState {
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        this.settingsRepo.set(k, v);
      }
    }
    // Keep daily block targets synchronized
    if (updates.daily_block_target !== undefined && updates.daily_study_blocks_target === undefined) {
      this.settingsRepo.set('daily_study_blocks_target', Number(updates.daily_block_target));
    } else if (updates.daily_study_blocks_target !== undefined && updates.daily_block_target === undefined) {
      this.settingsRepo.set('daily_block_target', Number(updates.daily_study_blocks_target));
    }
    snapshotCache.invalidate();
    return this.settingsRepo.getAll();
  }

  // --- Multi-Day Gap Triage ---

  triageApplyGapReturn({ maxImmediateCapacity = 4 }: GapTriageParams = {}): GapTriageResult {
    const settings = this.settingsRepo.getAll();
    const academicDate = getAcademicDate(new Date(), settings.academic_cutoff_hour || 4);
    const unwatched = this.classesRepo.getUnwatched();
    const upcomingExams = this.assessmentsRepo.getUpcoming(academicDate);

    const plan = triageGapReturn({
      unwatchedLectures: unwatched,
      upcomingExams,
      currentDateStr: academicDate,
      maxImmediateCapacity
    });

    // Mark deferred classes
    for (const d of plan.deferredLectures) {
      this.classesRepo.markCrunchDeferred(d.id, 1);
    }

    // Update last active date to today
    this.settingsRepo.set('last_active_academic_date', academicDate);
    snapshotCache.invalidate();
    return plan;
  }

  // --- Backup & Restore ---

  backupExport(): BackupPayload {
    return this.backupService.exportState();
  }

  backupImport(data: BackupPayload): boolean {
    const res = this.backupService.importState(data);
    snapshotCache.invalidate();
    return res;
  }
}
