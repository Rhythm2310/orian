/**
 * Orian Electron Main Process
 * 100% Strict TypeScript
 */

import { app, BrowserWindow, ipcMain, session, Tray, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createDatabase } from '../src/db/client.ts';
import { runMigrations } from '../src/db/migrations.ts';
import { IpcService } from '../src/ipc/service.ts';
import type { DatabaseSync } from 'node:sqlite';
import type {
  CourseInput,
  CourseUpdateInput,
  ClassSessionInput,
  RoutineSlotInput,
  AssessmentInput,
  ThemeMode
} from '../src/types/domain.ts';
import type {
  DisruptionPayload,
  PomodoroStartParams,
  PomodoroCompleteParams,
  GapTriageParams
} from '../src/types/ipc.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: DatabaseSync | null = null;
let ipcService: IpcService | null = null;

function performRollingBackup(service: IpcService, userDataPath: string): void {
  try {
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const state = service.backupExport();
    const today = new Date().toISOString().substring(0, 10);
    const backupFile = path.join(backupDir, `orian-backup-${today}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(state, null, 2), 'utf8');

    // Keep only last 7 days of backups
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('orian-backup-') && f.endsWith('.json'));
    files.sort();
    while (files.length > 7) {
      const oldest = files.shift();
      if (oldest) {
        fs.unlinkSync(path.join(backupDir, oldest));
      }
    }
  } catch (err) {
    console.error('Rolling backup failed:', err);
  }
}

function createWindow(): void {
  const settings = ipcService ? ipcService.settingsGetAll() : {};
  const isDark = settings.theme === 'dark';

  const overlayColor = isDark ? '#111312' : '#F4F2EC';
  const symbolColor = isDark ? '#F1F0EA' : '#171917';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: 'Orian',
    icon: path.join(__dirname, '../build/icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: overlayColor,
      symbolColor: symbolColor,
      height: 44
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
    if (process.argv.includes('--smoke-test')) {
      console.log('[Orian Smoke Test] Success: DB initialized & window ready');
      setTimeout(() => {
        app.quit();
      }, 1000);
    }
  });

  // Strict CSP & Offline enforcement
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "img-src 'self' data:; " +
          "connect-src 'self';"
        ]
      }
    });
  });

  // Block all external HTTP/HTTPS requests (strictly 100% offline)
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (isDev && (url.startsWith('http://localhost:5173') || url.startsWith('ws://localhost:5173'))) {
      callback({ cancel: false });
      return;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.warn(`[Orian Security] Blocked external request: ${url}`);
      callback({ cancel: true });
      return;
    }

    callback({ cancel: false });
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist/client/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initTray(): void {
  try {
    const iconFile = process.platform === 'win32' ? '../build/icon.ico' : '../build/icon.png';
    const iconPath = path.join(__dirname, iconFile);
    if (fs.existsSync(iconPath)) {
      tray = new Tray(iconPath);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Open Orian',
          click: () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();
            } else {
              createWindow();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]);
      tray.setToolTip('Orian Focus & Exam Triage');
      tray.setContextMenu(contextMenu);
      tray.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
    }
  } catch (err) {
    console.error('Tray initialization skipped:', err);
  }
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'orian.db');

  db = createDatabase(dbPath);
  runMigrations(db);
  ipcService = new IpcService(db);

  performRollingBackup(ipcService, userDataPath);
  setupIpcHandlers(ipcService);

  createWindow();
  initTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  if (db) {
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      db.close();
    } catch (err) {
      console.error('Error during database clean shutdown:', err);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers(service: IpcService): void {
  // Dashboard
  ipcMain.handle('dashboard:getSnapshot', (_event, now) => service.dashboardGetSnapshot({ now }));

  // Courses
  ipcMain.handle('courses:getAll', () => service.coursesGetAll());
  ipcMain.handle('courses:create', (_event, data: CourseInput) => service.coursesCreate(data));
  ipcMain.handle('courses:update', (_event, id: string, data: CourseUpdateInput) => service.coursesUpdate(id, data));
  ipcMain.handle('courses:delete', (_event, id: string) => service.coursesDelete(id));

  // Classes & Routine
  ipcMain.handle('classes:getByDate', (_event, dateStr: string) => service.classesGetByDate(dateStr));
  ipcMain.handle('classes:getUnwatched', () => service.classesGetUnwatched());
  ipcMain.handle('classes:create', (_event, data: ClassSessionInput) => service.classesCreate(data));
  ipcMain.handle('classes:update', (_event, id: string, data: Partial<ClassSessionInput>) => service.classesUpdate(id, data));
  ipcMain.handle('classes:markAttended', (_event, id: string) => service.classesMarkAttended(id));
  ipcMain.handle('classes:markReviewed', (_event, id: string) => service.classesMarkReviewed(id));
  ipcMain.handle('classes:handleDisruption', (_event, payload: DisruptionPayload) => service.classesHandleDisruption(payload));
  ipcMain.handle('classes:syncRoutine', (_event, dateStr: string, dayOfWeek: number) => service.classesSyncFromRoutine(dateStr, dayOfWeek));

  ipcMain.handle('routine:getAll', () => service.routineGetAll());
  ipcMain.handle('routine:create', (_event, slot: RoutineSlotInput) => service.routineCreate(slot));
  ipcMain.handle('routine:delete', (_event, id: string) => service.routineDelete(id));

  // Assessments
  ipcMain.handle('assessments:getAll', () => service.assessmentsGetAll());
  ipcMain.handle('assessments:getUpcoming', (_event, fromDate?: string) => service.assessmentsGetUpcoming(fromDate));
  ipcMain.handle('assessments:create', (_event, data: AssessmentInput) => service.assessmentsCreate(data));
  ipcMain.handle('assessments:update', (_event, id: string, data: Partial<AssessmentInput>) => service.assessmentsUpdate(id, data));
  ipcMain.handle('assessments:delete', (_event, id: string) => service.assessmentsDelete(id));
  ipcMain.handle('assessments:markCompleted', (_event, id: string, isCompleted: boolean) => service.assessmentsMarkCompleted(id, isCompleted));

  // Pomodoro
  ipcMain.handle('pomodoro:getActive', () => service.pomodoroGetActive());
  ipcMain.handle('pomodoro:start', (_event, params: PomodoroStartParams) => service.pomodoroStart(params));
  ipcMain.handle('pomodoro:pause', () => service.pomodoroPause());
  ipcMain.handle('pomodoro:resume', () => service.pomodoroResume());
  ipcMain.handle('pomodoro:cancel', () => service.pomodoroCancel());
  ipcMain.handle('pomodoro:complete', (_event, params: PomodoroCompleteParams) => service.pomodoroComplete(params));
  ipcMain.handle('pomodoro:getHistory', (_event, limit?: number) => service.pomodoroGetHistory(limit));

  // Settings
  ipcMain.handle('settings:getAll', () => service.settingsGetAll());
  ipcMain.handle('settings:update', (_event, updates) => service.settingsUpdate(updates));

  // Gap Triage
  ipcMain.handle('triage:applyGapReturn', (_event, params: GapTriageParams) => service.triageApplyGapReturn(params));

  // Backup
  ipcMain.handle('backup:export', () => service.backupExport());
  ipcMain.handle('backup:import', (_event, data) => service.backupImport(data));

  // Window Controls
  ipcMain.handle('window:setThemeOverlay', (_event, theme: ThemeMode) => {
    if (mainWindow) {
      const isDark = theme === 'dark';
      mainWindow.setTitleBarOverlay({
        color: isDark ? '#111312' : '#F4F2EC',
        symbolColor: isDark ? '#F1F0EA' : '#171917',
        height: 44
      });
    }
    return true;
  });

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });
  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
}
