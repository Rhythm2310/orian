/**
 * Orian Reactive State Store (Svelte 5 Runes)
 * 100% Strict TypeScript
 */

import { api } from './api.ts';
import type {
  DashboardSnapshot,
  ActiveTimerState,
  ClassSession,
  ThemeMode,
  ContrastMode
} from './types.ts';

export type ViewName = 'dashboard' | 'queue' | 'routine' | 'pomodoro' | 'settings' | 'onboarding';

export type ToastType = 'info' | 'error' | 'success';

export interface ToastState {
  message: string;
  type?: ToastType;
  undoAction?: (() => void) | null;
}

class OrianStore {
  currentView = $state<ViewName>('dashboard');
  snapshot = $state<DashboardSnapshot | null>(null);
  activeTimer = $state<ActiveTimerState | null>(null);
  isLoading = $state<boolean>(true);

  // Modals & Overlays
  showCommandPalette = $state<boolean>(false);
  showDisruptionModal = $state<boolean>(false);
  showGapReturnModal = $state<boolean>(false);
  disruptionTargetClass = $state<ClassSession | null>(null);

  // Undo Toasts
  toast = $state<ToastState | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Accessibility & Preferences
  theme = $state<ThemeMode>('light');
  contrast = $state<ContrastMode>('normal');
  dyslexic = $state<boolean>(false);
  chimesEnabled = $state<boolean>(true);

  async init(): Promise<void> {
    await this.refreshSnapshot();
    if (this.snapshot && this.snapshot.settings) {
      this.theme = (this.snapshot.settings.theme as ThemeMode) || 'light';
      this.contrast = (this.snapshot.settings.contrast as ContrastMode) || 'normal';
      this.dyslexic = Boolean(this.snapshot.settings.dyslexic_font);
      this.chimesEnabled = this.snapshot.settings.chimes_enabled !== false;
      this.applyThemeToDOM();
    }
    this.isLoading = false;

    // Check if multi-day gap was detected and prompt once
    if (this.snapshot && this.snapshot.gapInfo && this.snapshot.gapInfo.gapDetected) {
      this.showGapReturnModal = true;
    }
  }

  async refreshSnapshot(): Promise<void> {
    try {
      const snap = await api.getDashboardSnapshot();
      if (snap) {
        this.snapshot = snap;
        this.activeTimer = snap.activeTimer || null;
        if (snap.settings) {
          if (snap.settings.theme && this.theme !== snap.settings.theme) {
            this.theme = snap.settings.theme as ThemeMode;
            this.applyThemeToDOM();
          }
          if (snap.settings.contrast && this.contrast !== snap.settings.contrast) {
            this.contrast = snap.settings.contrast as ContrastMode;
            this.applyThemeToDOM();
          }
          if (snap.settings.dyslexic_font !== undefined && this.dyslexic !== Boolean(snap.settings.dyslexic_font)) {
            this.dyslexic = Boolean(snap.settings.dyslexic_font);
            this.applyThemeToDOM();
          }
          if (snap.settings.chimes_enabled !== undefined) {
            this.chimesEnabled = snap.settings.chimes_enabled !== false;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard snapshot:', err);
    }
  }

  setView(viewName: ViewName): void {
    this.currentView = viewName;
  }

  toggleTheme(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyThemeToDOM();
    api.updateSettings({ theme: this.theme });
    api.setThemeOverlay(this.theme);
  }

  setContrast(contrastMode: ContrastMode): void {
    this.contrast = contrastMode;
    this.applyThemeToDOM();
    api.updateSettings({ contrast: this.contrast });
  }

  toggleDyslexic(): void {
    this.dyslexic = !this.dyslexic;
    this.applyThemeToDOM();
    api.updateSettings({ dyslexic_font: this.dyslexic });
  }

  applyThemeToDOM(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.theme);
    document.documentElement.setAttribute('data-contrast', this.contrast);
    document.documentElement.setAttribute('data-dyslexic', String(this.dyslexic));
  }

  showToast(
    message: string,
    undoAction: (() => void) | null = null,
    durationMs = 4000,
    type: ToastType = 'info'
  ): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, undoAction, type };
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, durationMs);
  }

  dismissToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = null;
  }

  openDisruptionModal(targetClass: ClassSession | null = null): void {
    this.disruptionTargetClass = targetClass;
    this.showDisruptionModal = true;
  }

  closeDisruptionModal(): void {
    this.disruptionTargetClass = null;
    this.showDisruptionModal = false;
  }
}

export const store = new OrianStore();
