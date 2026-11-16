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
} from '../db/repositories.js';
import { snapshotCache } from '../db/cache.js';
import {
  getAcademicDate,
  calculateMultiDayGap,
  triageGapReturn,
  computeCourseBacklogScore
} from '../core/antiBacklog.js';
import {
  allocateDailyStudyBlocks,
  computeCapacityDeficit,
  shouldCrunchDeferCourse
} from '../core/allocator.js';
import {
  recoverWallClockTimer,
  selectContextualQuote,
  handleClassDisruption
} from '../core/pomodoro.js';
import { validateExamInput, validateRoutineTimeSlot } from '../core/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IpcService {
  constructor(db) {
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

  loadQuotes() {
    try {
      const quotesPath = path.resolve(__dirname, '../../data/quotes.json');
      if (fs.existsSync(quotesPath)) {
        return JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
      }
    } catch {
      // fallback
    }
    return [
      { id: '1', text: 'Start with the single lecture that unblocks the next two.', author: 'Orian', category: 'deep_focus' }
    ];
  }

  // --- Dashboard Snapshot ---

  dashboardGetSnapshot({ now = new Date() } = {}) {
    const nowDate = now instanceof Date ? now : new Date(now);
    const settings = this.settingsRepo.getAll();
    const cutoffHour = settings.academic_cutoff_hour || 4;
    const academicDate = getAcademicDate(nowDate, cutoffHour);

    const cacheKey = `snapshot_${academicDate}_${nowDate.getHours()}_${nowDate.getMinutes()}`;
    const cached = snapshotCache.get(cacheKey);
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
    const totalDailyBlocks = settings.daily_block_target || 6;
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
    const deficit = computeCapacityDeficit({
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
    const coursesWithScores = courses.map(course => ({
      ...course,
      backlogScore: computeCourseBacklogScore(course, unwatchedLectures, upcomingExams, academicDate)
    }));

    const routineSlots = this.routineRepo.getAll();

    const result = {
      timestamp: nowDate.toISOString(),
      academicDate,
      courses: coursesWithScores,
      todayClasses,
      routineSlots,
      upcomingExams,
      unwatchedLectures,
      allocation,
      deficit,
      gapInfo,
      activeTimer,
      settings,
      quote
    };

    snapshotCache.set(cacheKey, result);
    return result;
  }

  // --- Courses ---

  coursesGetAll() {
    return this.coursesRepo.getAll();
  }

  coursesCreate(data) {
    const res = this.coursesRepo.create(data);
    snapshotCache.invalidate();
    return res;
  }

  coursesUpdate(id, data) {
    const res = this.coursesRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  coursesDelete(id) {
    const res = this.coursesRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  // --- Classes & Routine ---

  classesGetByDate(dateStr) {
    return this.classesRepo.getByDate(dateStr);
  }

  classesGetUnwatched() {
    return this.classesRepo.getUnwatched();
  }

  classesCreate(data) {
    const res = this.classesRepo.create(data);
    snapshotCache.invalidate();
    return res;
  }

  classesUpdate(id, data) {
    const res = this.classesRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  classesMarkAttended(id) {
    const res = this.classesRepo.markAttended(id);
    snapshotCache.invalidate();
    return res;
  }

  classesMarkReviewed(id) {
    const res = this.classesRepo.markReviewed(id);
    snapshotCache.invalidate();
    return res;
  }

  classesHandleDisruption({ class_id, disruptionType, course_id, date, ...rest }) {
    let cls = class_id ? this.classesRepo.getById(class_id) : null;
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

    if (disruptionType === 'makeup') {
      this.classesRepo.create(result.updatedClass);
    } else if (cls && result.updatedClass) {
      this.classesRepo.update(cls.id, {
        status: result.updatedClass.status
      });
    } else if (!cls && course_id && date && result.updatedClass) {
      this.classesRepo.create({
        course_id,
        date,
        lecture_number: result.updatedClass.lecture_number || 1,
        title: result.updatedClass.title || '',
        status: result.updatedClass.status
      });
    }

    snapshotCache.invalidate();
    return result;
  }

  routineGetAll() {
    return this.routineRepo.getAll();
  }

  routineCreate(slot) {
    const existing = this.routineRepo.getAll();
    validateRoutineTimeSlot(slot, existing);
    const res = this.routineRepo.create(slot);
    snapshotCache.invalidate();
    return res;
  }

  routineDelete(id) {
    const res = this.routineRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  // Populate today's scheduled classes from weekly routine slots
  classesSyncFromRoutine(academicDateStr, dayOfWeek) {
    const slots = this.routineRepo.getByDay(dayOfWeek);
    const existingToday = this.classesRepo.getByDate(academicDateStr);
    const existingCourseIds = new Set(existingToday.map(c => c.course_id));

    for (const slot of slots) {
      if (!existingCourseIds.has(slot.course_id)) {
        this.classesRepo.create({
          course_id: slot.course_id,
          date: academicDateStr,
          start_time: slot.start_time,
          end_time: slot.end_time,
          title: `${slot.course_code || 'Lecture'}`
        });
      }
    }
    snapshotCache.invalidate();
    return this.classesRepo.getByDate(academicDateStr);
  }

  // --- Assessments ---

  assessmentsGetAll() {
    return this.assessmentsRepo.getAll();
  }

  assessmentsGetUpcoming(fromDate) {
    return this.assessmentsRepo.getUpcoming(fromDate);
  }

  assessmentsCreate(data) {
    const validated = validateExamInput(data);
    const res = this.assessmentsRepo.create(validated);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsUpdate(id, data) {
    const res = this.assessmentsRepo.update(id, data);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsDelete(id) {
    const res = this.assessmentsRepo.delete(id);
    snapshotCache.invalidate();
    return res;
  }

  assessmentsMarkCompleted(id, isCompleted = 1) {
    const res = this.assessmentsRepo.markCompleted(id, isCompleted);
    snapshotCache.invalidate();
    return res;
  }

  // --- Pomodoro ---

  pomodoroGetActive() {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw) return null;
    return recoverWallClockTimer(raw, Date.now());
  }

  pomodoroStart({
    course_id = null,
    assessment_id = null,
    class_id = null,
    session_mode = 'focus',
    target_duration_seconds = 1500,
    notes = ''
  }) {
    const timer = this.pomodoroRepo.saveActiveTimer({
      started_at: Date.now(),
      target_duration_seconds,
      status: 'running',
      course_id,
      assessment_id,
      class_id,
      session_mode,
      notes
    });
    snapshotCache.invalidate();
    return timer;
  }

  pomodoroPause() {
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

  pomodoroResume() {
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

  pomodoroCancel() {
    this.pomodoroRepo.clearActiveTimer();
    snapshotCache.invalidate();
    return true;
  }

  pomodoroComplete({ notes = '' } = {}) {
    const raw = this.pomodoroRepo.getActiveTimer();
    if (!raw) return null;

    const session = this.pomodoroRepo.logSession({
      course_id: raw.course_id,
      assessment_id: raw.assessment_id,
      class_id: raw.class_id,
      session_mode: raw.session_mode,
      started_at: raw.started_at,
      ended_at: Date.now(),
      duration_seconds: raw.target_duration_seconds,
      status: 'completed',
      notes: notes || raw.notes || ''
    });

    if (raw.class_id) {
      this.classesRepo.markReviewed(raw.class_id);
    }

    this.pomodoroRepo.clearActiveTimer();
    snapshotCache.invalidate();
    return session;
  }

  pomodoroGetHistory(limit = 50) {
    return this.pomodoroRepo.getAllSessions(limit);
  }

  // --- Settings ---

  settingsGetAll() {
    return this.settingsRepo.getAll();
  }

  settingsUpdate(updates = {}) {
    for (const [k, v] of Object.entries(updates)) {
      this.settingsRepo.set(k, v);
    }
    snapshotCache.invalidate();
    return this.settingsRepo.getAll();
  }

  // --- Multi-Day Gap Triage ---

  triageApplyGapReturn({ maxImmediateCapacity = 4 }) {
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

  backupExport() {
    return this.backupService.exportState();
  }

  backupImport(data) {
    const res = this.backupService.importState(data);
    snapshotCache.invalidate();
    return res;
  }
}
