/**
 * Orian Reactive State Store (Svelte 5 Runes)
 */

import { api } from './api.js';

class OrianStore {
  currentView = $state('dashboard');
  snapshot = $state(null);
  activeTimer = $state(null);
  isLoading = $state(true);

  // Modals & Overlays
  showCommandPalette = $state(false);
  showDisruptionModal = $state(false);
  showGapReturnModal = $state(false);
  disruptionTargetClass = $state(null);

  // Undo Toasts
  toast = $state(null);
  toastTimer = null;

  // Accessibility & Preferences
  theme = $state('light');
  contrast = $state('normal');
  dyslexic = $state(false);
  chimesEnabled = $state(true);

  async init() {
    await this.refreshSnapshot();
    if (this.snapshot && this.snapshot.settings) {
      this.theme = this.snapshot.settings.theme || 'light';
      this.contrast = this.snapshot.settings.contrast || 'normal';
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

  async refreshSnapshot() {
    try {
      const snap = await api.getDashboardSnapshot();
      if (snap) {
        this.snapshot = snap;
        this.activeTimer = snap.activeTimer || null;
        if (snap.settings) {
          if (snap.settings.theme && this.theme !== snap.settings.theme) {
            this.theme = snap.settings.theme;
            this.applyThemeToDOM();
          }
          if (snap.settings.contrast && this.contrast !== snap.settings.contrast) {
            this.contrast = snap.settings.contrast;
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

  setView(viewName) {
    this.currentView = viewName;
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyThemeToDOM();
    api.updateSettings({ theme: this.theme });
    api.setThemeOverlay(this.theme);
  }

  setContrast(contrastMode) {
    this.contrast = contrastMode;
    this.applyThemeToDOM();
    api.updateSettings({ contrast: this.contrast });
  }

  toggleDyslexic() {
    this.dyslexic = !this.dyslexic;
    this.applyThemeToDOM();
    api.updateSettings({ dyslexic_font: this.dyslexic });
  }

  applyThemeToDOM() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.theme);
    document.documentElement.setAttribute('data-contrast', this.contrast);
    document.documentElement.setAttribute('data-dyslexic', String(this.dyslexic));
  }

  showToast(message, undoAction = null, durationMs = 4000) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, undoAction };
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, durationMs);
  }

  dismissToast() {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = null;
  }

  openDisruptionModal(targetClass = null) {
    this.disruptionTargetClass = targetClass;
    this.showDisruptionModal = true;
  }

  closeDisruptionModal() {
    this.disruptionTargetClass = null;
    this.showDisruptionModal = false;
  }
}

export const store = new OrianStore();
