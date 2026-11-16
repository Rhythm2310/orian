/**
 * Orian Desktop API Client
 * Wraps window.orianAPI exposed via preload.cjs contextBridge.
 */

const isElectron = typeof window !== 'undefined' && Boolean(window.orianAPI);

export const api = {
  // Dashboard Snapshot
  async getDashboardSnapshot(now) {
    if (isElectron) return window.orianAPI.getDashboardSnapshot(now);
    console.warn('orianAPI not available in browser mock');
    return null;
  },

  // Courses
  async getCourses() {
    if (isElectron) return window.orianAPI.getCourses();
    return [];
  },
  async createCourse(data) {
    if (isElectron) return window.orianAPI.createCourse(data);
    return null;
  },
  async updateCourse(id, data) {
    if (isElectron) return window.orianAPI.updateCourse(id, data);
    return null;
  },
  async deleteCourse(id) {
    if (isElectron) return window.orianAPI.deleteCourse(id);
    return true;
  },

  // Classes & Routine
  async getClassesByDate(dateStr) {
    if (isElectron) return window.orianAPI.getClassesByDate(dateStr);
    return [];
  },
  async getUnwatchedClasses() {
    if (isElectron) return window.orianAPI.getUnwatchedClasses();
    return [];
  },
  async createClass(data) {
    if (isElectron) return window.orianAPI.createClass(data);
    return null;
  },
  async updateClass(id, data) {
    if (isElectron) return window.orianAPI.updateClass(id, data);
    return null;
  },
  async markClassAttended(id) {
    if (isElectron) return window.orianAPI.markClassAttended(id);
    return null;
  },
  async markClassReviewed(id) {
    if (isElectron) return window.orianAPI.markClassReviewed(id);
    return null;
  },
  async handleClassDisruption(payload) {
    if (isElectron) return window.orianAPI.handleClassDisruption(payload);
    return null;
  },
  async syncClassesFromRoutine(dateStr, dayOfWeek) {
    if (isElectron) return window.orianAPI.syncClassesFromRoutine(dateStr, dayOfWeek);
    return [];
  },

  async getRoutine() {
    if (isElectron) return window.orianAPI.getRoutine();
    return [];
  },
  async createRoutineSlot(slot) {
    if (isElectron) return window.orianAPI.createRoutineSlot(slot);
    return null;
  },
  async deleteRoutineSlot(id) {
    if (isElectron) return window.orianAPI.deleteRoutineSlot(id);
    return true;
  },

  // Assessments
  async getAssessments() {
    if (isElectron) return window.orianAPI.getAssessments();
    return [];
  },
  async getUpcomingAssessments(fromDate) {
    if (isElectron) return window.orianAPI.getUpcomingAssessments(fromDate);
    return [];
  },
  async createAssessment(data) {
    if (isElectron) return window.orianAPI.createAssessment(data);
    return null;
  },
  async updateAssessment(id, data) {
    if (isElectron) return window.orianAPI.updateAssessment(id, data);
    return null;
  },
  async deleteAssessment(id) {
    if (isElectron) return window.orianAPI.deleteAssessment(id);
    return true;
  },
  async markAssessmentCompleted(id, isCompleted) {
    if (isElectron) return window.orianAPI.markAssessmentCompleted(id, isCompleted);
    return null;
  },

  // Pomodoro
  async getPomodoroActive() {
    if (isElectron) return window.orianAPI.getPomodoroActive();
    return null;
  },
  async startPomodoro(params) {
    if (isElectron) return window.orianAPI.startPomodoro(params);
    return null;
  },
  async pausePomodoro() {
    if (isElectron) return window.orianAPI.pausePomodoro();
    return null;
  },
  async resumePomodoro() {
    if (isElectron) return window.orianAPI.resumePomodoro();
    return null;
  },
  async cancelPomodoro() {
    if (isElectron) return window.orianAPI.cancelPomodoro();
    return true;
  },
  async completePomodoro(params) {
    if (isElectron) return window.orianAPI.completePomodoro(params);
    return null;
  },
  async getPomodoroHistory(limit) {
    if (isElectron) return window.orianAPI.getPomodoroHistory(limit);
    return [];
  },

  // Settings
  async getSettings() {
    if (isElectron) return window.orianAPI.getSettings();
    return {};
  },
  async updateSettings(updates) {
    if (isElectron) return window.orianAPI.updateSettings(updates);
    return updates;
  },

  // Gap Triage
  async applyGapReturnTriage(params) {
    if (isElectron) return window.orianAPI.applyGapReturnTriage(params);
    return null;
  },

  // Backup
  async exportBackup() {
    if (isElectron) return window.orianAPI.exportBackup();
    return null;
  },
  async importBackup(data) {
    if (isElectron) return window.orianAPI.importBackup(data);
    return false;
  },

  // Window Controls
  async setThemeOverlay(theme) {
    if (isElectron) return window.orianAPI.setThemeOverlay(theme);
    return true;
  },
  minimize() {
    if (isElectron) window.orianAPI.minimizeWindow();
  },
  maximize() {
    if (isElectron) window.orianAPI.maximizeWindow();
  },
  close() {
    if (isElectron) window.orianAPI.closeWindow();
  }
};
