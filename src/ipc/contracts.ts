/**
 * Orian IPC Channel Constants & Typed Request/Response Mapping
 */

export const IPC_CHANNELS = {
  SNAPSHOT_GET: 'orian:snapshot:get',

  COURSES_GET_ALL: 'orian:courses:getAll',
  COURSES_CREATE: 'orian:courses:create',
  COURSES_UPDATE: 'orian:courses:update',
  COURSES_DELETE: 'orian:courses:delete',

  CLASSES_GET_BY_DATE: 'orian:classes:getByDate',
  CLASSES_GET_UNWATCHED: 'orian:classes:getUnwatched',
  CLASSES_CREATE: 'orian:classes:create',
  CLASSES_UPDATE: 'orian:classes:update',
  CLASSES_MARK_ATTENDED: 'orian:classes:markAttended',
  CLASSES_MARK_REVIEWED: 'orian:classes:markReviewed',
  CLASSES_HANDLE_DISRUPTION: 'orian:classes:handleDisruption',
  CLASSES_SYNC_FROM_ROUTINE: 'orian:classes:syncFromRoutine',

  ROUTINE_GET_ALL: 'orian:routine:getAll',
  ROUTINE_CREATE: 'orian:routine:create',
  ROUTINE_DELETE: 'orian:routine:delete',

  ASSESSMENTS_GET_ALL: 'orian:assessments:getAll',
  ASSESSMENTS_GET_UPCOMING: 'orian:assessments:getUpcoming',
  ASSESSMENTS_CREATE: 'orian:assessments:create',
  ASSESSMENTS_UPDATE: 'orian:assessments:update',
  ASSESSMENTS_DELETE: 'orian:assessments:delete',
  ASSESSMENTS_MARK_COMPLETED: 'orian:assessments:markCompleted',

  POMODORO_GET_ACTIVE: 'orian:pomodoro:getActive',
  POMODORO_START: 'orian:pomodoro:start',
  POMODORO_PAUSE: 'orian:pomodoro:pause',
  POMODORO_RESUME: 'orian:pomodoro:resume',
  POMODORO_CANCEL: 'orian:pomodoro:cancel',
  POMODORO_COMPLETE: 'orian:pomodoro:complete',
  POMODORO_GET_HISTORY: 'orian:pomodoro:getHistory',

  SETTINGS_GET_ALL: 'orian:settings:getAll',
  SETTINGS_UPDATE: 'orian:settings:update',

  TRIAGE_APPLY_GAP_RETURN: 'orian:triage:applyGapReturn',

  BACKUP_EXPORT: 'orian:backup:export',
  BACKUP_IMPORT: 'orian:backup:import',

  WINDOW_SET_THEME_OVERLAY: 'orian:window:setThemeOverlay',
  WINDOW_MINIMIZE: 'orian:window:minimize',
  WINDOW_MAXIMIZE: 'orian:window:maximize',
  WINDOW_CLOSE: 'orian:window:close'
} as const;

export type IpcChannelName = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
