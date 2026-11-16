/**
 * Global Keyboard Shortcuts Manager
 * 100% Strict TypeScript
 */

import { store } from './store.svelte.ts';
import { api } from './api.ts';

export function setupKeyboardShortcuts(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ignore when typing inside input or textarea
    const activeEl = document.activeElement;
    const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

    // Ctrl+K / Cmd+K Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      store.showCommandPalette = !store.showCommandPalette;
      return;
    }

    // Escape closes modals
    if (e.key === 'Escape') {
      if (store.showCommandPalette) {
        store.showCommandPalette = false;
        return;
      }
      if (store.showDisruptionModal) {
        store.closeDisruptionModal();
        return;
      }
      if (store.showGapReturnModal) {
        store.showGapReturnModal = false;
        return;
      }
    }

    if (isInput) return;

    // View Switching 1-5
    if (e.key === '1') {
      store.setView('dashboard');
    } else if (e.key === '2') {
      store.setView('queue');
    } else if (e.key === '3') {
      store.setView('routine');
    } else if (e.key === '4') {
      store.setView('pomodoro');
    } else if (e.key === '5') {
      store.setView('settings');
    }

    // Space to pause / resume active timer
    if (e.code === 'Space') {
      if (store.activeTimer) {
        e.preventDefault();
        if (store.activeTimer.status === 'running') {
          api.pausePomodoro().then(() => store.refreshSnapshot());
        } else if (store.activeTimer.status === 'paused') {
          api.resumePomodoro().then(() => store.refreshSnapshot());
        }
      }
    }
  });
}
