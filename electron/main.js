import { app, BrowserWindow, ipcMain, session, Tray, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrations.js';
import { IpcService } from '../src/ipc/service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let db = null;
let ipcService = null;

function performRollingBackup(service, userDataPath) {
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
      fs.unlinkSync(path.join(backupDir, oldest));
    }
  } catch (err) {
    console.error('Rolling backup failed:', err);
  }
}

function createWindow() {
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
    mainWindow.show();
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
      // In dev mode when client dist not yet built
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initTray() {
  try {
    const iconPath = path.join(__dirname, '../build/icon.png');
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

function setupIpcHandlers(service) {
  // Dashboard
  ipcMain.handle('dashboard:getSnapshot', (event, now) => service.dashboardGetSnapshot({ now }));

  // Courses
  ipcMain.handle('courses:getAll', () => service.coursesGetAll());
  ipcMain.handle('courses:create', (event, data) => service.coursesCreate(data));
  ipcMain.handle('courses:update', (event, id, data) => service.coursesUpdate(id, data));
  ipcMain.handle('courses:delete', (event, id) => service.coursesDelete(id));

  // Classes & Routine
  ipcMain.handle('classes:getByDate', (event, dateStr) => service.classesGetByDate(dateStr));
  ipcMain.handle('classes:getUnwatched', () => service.classesGetUnwatched());
  ipcMain.handle('classes:create', (event, data) => service.classesCreate(data));
  ipcMain.handle('classes:update', (event, id, data) => service.classesUpdate(id, data));
  ipcMain.handle('classes:markAttended', (event, id) => service.classesMarkAttended(id));
  ipcMain.handle('classes:markReviewed', (event, id) => service.classesMarkReviewed(id));
  ipcMain.handle('classes:handleDisruption', (event, payload) => service.classesHandleDisruption(payload));
  ipcMain.handle('classes:syncRoutine', (event, dateStr, dayOfWeek) => service.classesSyncFromRoutine(dateStr, dayOfWeek));

  ipcMain.handle('routine:getAll', () => service.routineGetAll());
  ipcMain.handle('routine:create', (event, slot) => service.routineCreate(slot));
  ipcMain.handle('routine:delete', (event, id) => service.routineDelete(id));

  // Assessments
  ipcMain.handle('assessments:getAll', () => service.assessmentsGetAll());
  ipcMain.handle('assessments:getUpcoming', (event, fromDate) => service.assessmentsGetUpcoming(fromDate));
  ipcMain.handle('assessments:create', (event, data) => service.assessmentsCreate(data));
  ipcMain.handle('assessments:update', (event, id, data) => service.assessmentsUpdate(id, data));
  ipcMain.handle('assessments:delete', (event, id) => service.assessmentsDelete(id));
  ipcMain.handle('assessments:markCompleted', (event, id, isCompleted) => service.assessmentsMarkCompleted(id, isCompleted));

  // Pomodoro
  ipcMain.handle('pomodoro:getActive', () => service.pomodoroGetActive());
  ipcMain.handle('pomodoro:start', (event, params) => service.pomodoroStart(params));
  ipcMain.handle('pomodoro:pause', () => service.pomodoroPause());
  ipcMain.handle('pomodoro:resume', () => service.pomodoroResume());
  ipcMain.handle('pomodoro:cancel', () => service.pomodoroCancel());
  ipcMain.handle('pomodoro:complete', (event, params) => service.pomodoroComplete(params));
  ipcMain.handle('pomodoro:getHistory', (event, limit) => service.pomodoroGetHistory(limit));

  // Settings
  ipcMain.handle('settings:getAll', () => service.settingsGetAll());
  ipcMain.handle('settings:update', (event, updates) => service.settingsUpdate(updates));

  // Gap Triage
  ipcMain.handle('triage:applyGapReturn', (event, params) => service.triageApplyGapReturn(params));

  // Backup
  ipcMain.handle('backup:export', () => service.backupExport());
  ipcMain.handle('backup:import', (event, data) => service.backupImport(data));

  // Window Controls
  ipcMain.handle('window:setThemeOverlay', (event, theme) => {
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
