const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orianAPI', {
  // Dashboard
  getDashboardSnapshot: (now) => ipcRenderer.invoke('dashboard:getSnapshot', now),

  // Courses
  getCourses: () => ipcRenderer.invoke('courses:getAll'),
  createCourse: (data) => ipcRenderer.invoke('courses:create', data),
  updateCourse: (id, data) => ipcRenderer.invoke('courses:update', id, data),
  deleteCourse: (id) => ipcRenderer.invoke('courses:delete', id),

  // Classes & Routine
  getClassesByDate: (dateStr) => ipcRenderer.invoke('classes:getByDate', dateStr),
  getUnwatchedClasses: () => ipcRenderer.invoke('classes:getUnwatched'),
  createClass: (data) => ipcRenderer.invoke('classes:create', data),
  updateClass: (id, data) => ipcRenderer.invoke('classes:update', id, data),
  markClassAttended: (id) => ipcRenderer.invoke('classes:markAttended', id),
  markClassReviewed: (id) => ipcRenderer.invoke('classes:markReviewed', id),
  handleClassDisruption: (payload) => ipcRenderer.invoke('classes:handleDisruption', payload),
  syncClassesFromRoutine: (dateStr, dayOfWeek) => ipcRenderer.invoke('classes:syncRoutine', dateStr, dayOfWeek),

  getRoutine: () => ipcRenderer.invoke('routine:getAll'),
  createRoutineSlot: (slot) => ipcRenderer.invoke('routine:create', slot),
  deleteRoutineSlot: (id) => ipcRenderer.invoke('routine:delete', id),

  // Assessments
  getAssessments: () => ipcRenderer.invoke('assessments:getAll'),
  getUpcomingAssessments: (fromDate) => ipcRenderer.invoke('assessments:getUpcoming', fromDate),
  createAssessment: (data) => ipcRenderer.invoke('assessments:create', data),
  updateAssessment: (id, data) => ipcRenderer.invoke('assessments:update', id, data),
  deleteAssessment: (id) => ipcRenderer.invoke('assessments:delete', id),
  markAssessmentCompleted: (id, isCompleted) => ipcRenderer.invoke('assessments:markCompleted', id, isCompleted),

  // Pomodoro
  getPomodoroActive: () => ipcRenderer.invoke('pomodoro:getActive'),
  startPomodoro: (params) => ipcRenderer.invoke('pomodoro:start', params),
  pausePomodoro: () => ipcRenderer.invoke('pomodoro:pause'),
  resumePomodoro: () => ipcRenderer.invoke('pomodoro:resume'),
  cancelPomodoro: () => ipcRenderer.invoke('pomodoro:cancel'),
  completePomodoro: (params) => ipcRenderer.invoke('pomodoro:complete', params),
  getPomodoroHistory: (limit) => ipcRenderer.invoke('pomodoro:getHistory', limit),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSettings: (updates) => ipcRenderer.invoke('settings:update', updates),

  // Gap Triage
  applyGapReturnTriage: (params) => ipcRenderer.invoke('triage:applyGapReturn', params),

  // Backup & Restore
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: (data) => ipcRenderer.invoke('backup:import', data),

  // Window Controls
  setThemeOverlay: (theme) => ipcRenderer.invoke('window:setThemeOverlay', theme),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close')
});
