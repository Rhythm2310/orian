<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { playSuccessChime } from '../lib/audio.ts';
  import {
    Settings,
    Eye,
    Volume2,
    Clock,
    BookMarked,
    Download,
    Upload,
    CheckCircle2,
    Shield,
    RotateCcw,
    AlertTriangle,
    Sliders,
    Type
  } from '@lucide/svelte';
  import type { ThemeMode, ContrastMode, BackupPayload } from '../lib/types.ts';

  let theme = $state<ThemeMode>(store.theme);
  let contrast = $state<ContrastMode>(store.contrast);
  let dyslexic = $state<boolean>(store.dyslexic);
  let chimes = $state<boolean>(store.chimesEnabled);
  let dailyTarget = $state<number>(Number(store.snapshot?.settings?.daily_study_blocks_target ?? store.snapshot?.settings?.daily_block_target ?? 6));
  let cutoffHour = $state<number>(Number(store.snapshot?.settings?.academic_cutoff_hour ?? 4));
  let finalsMode = $state<boolean>(Boolean(store.snapshot?.settings?.finals_prep_mode));

  async function savePreferences(): Promise<void> {
    await api.updateSettings({
      daily_study_blocks_target: Number(dailyTarget),
      daily_block_target: Number(dailyTarget),
      academic_cutoff_hour: Number(cutoffHour),
      finals_prep_mode: finalsMode,
      chimes_enabled: chimes
    });
    playSuccessChime(chimes);
    store.showToast('Settings saved successfully.');
    await store.refreshSnapshot();
  }

  function handleThemeChange(newTheme: ThemeMode): void {
    theme = newTheme;
    if (store.theme !== newTheme) {
      store.toggleTheme();
    }
  }

  function handleContrastChange(newContrast: ContrastMode): void {
    contrast = newContrast;
    store.setContrast(newContrast);
  }

  function handleDyslexicChange(): void {
    dyslexic = !dyslexic;
    store.toggleDyslexic();
  }

  async function handleExportBackup(): Promise<void> {
    const data = await api.exportBackup();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orian-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    store.showToast('Complete backup JSON exported successfully.');
  }

  let showImportModal = $state<boolean>(false);
  let pendingImportData = $state<BackupPayload | null>(null);

  function handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text) as BackupPayload;
        if (!json || typeof json !== 'object') {
          throw new Error('Malformed JSON payload');
        }
        pendingImportData = json;
        showImportModal = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Parse error';
        store.showToast('Invalid backup JSON file: ' + msg, null, 4000, 'error');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async function confirmRestore(): Promise<void> {
    if (!pendingImportData) return;
    try {
      await api.importBackup(pendingImportData);
      showImportModal = false;
      pendingImportData = null;
      store.showToast('Database restored successfully from backup.');
      await store.refreshSnapshot();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      store.showToast('Restore failed: ' + msg, null, 4000, 'error');
    }
  }

  function cancelRestore(): void {
    showImportModal = false;
    pendingImportData = null;
  }
</script>

<div class="stage-content settings-view" aria-label="Settings and Accessibility">
  <div class="view-header leading-line">
    <div class="header-main">
      <div class="title-with-badge">
        <h1 class="display-title">Settings & Accessibility</h1>
        <span class="version-badge">Orian v1.0 • 100% Offline</span>
      </div>
      <p class="subtitle">
        Fine-tune academic day cutoff logic, Pomodoro capacity allocation, display contrast, OpenDyslexic typography, and portable SQLite backups.
      </p>
    </div>
  </div>

  <div class="settings-grid">
    <!-- Visual & Typography -->
    <section class="settings-card surface-card" aria-labelledby="section-theme-title">
      <div class="card-title-row">
        <span class="icon-bubble emerald"><Eye size={16} strokeWidth={2} /></span>
        <h2 id="section-theme-title">Theme & Accessibility</h2>
      </div>

      <div class="setting-list">
        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">Visual Theme</span>
            <span class="setting-help">Balanced neutral palettes designed for prolonged focus without glare.</span>
          </div>
          <div class="theme-toggle-group" role="group" aria-label="Theme selection">
            <button
              type="button"
              class="toggle-btn {theme === 'light' ? 'active' : ''}"
              onclick={() => handleThemeChange('light')}
              aria-pressed={theme === 'light'}
            >
              Studio Light
            </button>
            <button
              type="button"
              class="toggle-btn {theme === 'dark' ? 'active' : ''}"
              onclick={() => handleThemeChange('dark')}
              aria-pressed={theme === 'dark'}
            >
              Studio Dark
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">High-Contrast Mode</span>
            <span class="setting-help">Maximized ink-to-surface ratio with explicit 2px borders for enhanced visibility.</span>
          </div>
          <div class="theme-toggle-group" role="group" aria-label="Contrast selection">
            <button
              type="button"
              class="toggle-btn {contrast === 'normal' ? 'active' : ''}"
              onclick={() => handleContrastChange('normal')}
              aria-pressed={contrast === 'normal'}
            >
              Normal
            </button>
            <button
              type="button"
              class="toggle-btn {contrast === 'high' ? 'active' : ''}"
              onclick={() => handleContrastChange('high')}
              aria-pressed={contrast === 'high'}
            >
              High Contrast
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">OpenDyslexic Letterforms</span>
            <span class="setting-help">Applies heavy-bottom letterforms to eliminate character rotation and crowding.</span>
          </div>
          <button
            type="button"
            class="switch-pill {dyslexic ? 'on' : ''}"
            onclick={handleDyslexicChange}
            aria-pressed={dyslexic}
          >
            <Type size={13} strokeWidth={2} />
            <span>{dyslexic ? 'Enabled' : 'Disabled'}</span>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">Offline Audio Chimes</span>
            <span class="setting-help">Pure Web Audio harmonic chords on Pomodoro session start and completion. Zero network files.</span>
          </div>
          <button
            type="button"
            class="switch-pill {chimes ? 'on' : ''}"
            onclick={() => {
              chimes = !chimes;
              savePreferences();
            }}
            aria-pressed={chimes}
          >
            <Volume2 size={13} strokeWidth={2} />
            <span>{chimes ? 'Chimes Active' : 'Muted'}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Academic Engine Settings -->
    <section class="settings-card surface-card" aria-labelledby="section-engine-title">
      <div class="card-title-row">
        <span class="icon-bubble amber"><Clock size={16} strokeWidth={2} /></span>
        <h2 id="section-engine-title">Academic Day & Capacity Engine</h2>
      </div>

      <div class="setting-list">
        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">Academic Day Cutoff Hour</span>
            <span class="setting-help">Work completed after midnight before this hour belongs to tonight's budget, not tomorrow.</span>
          </div>
          <div class="input-wrap">
            <input
              type="number"
              min="0"
              max="8"
              aria-label="Academic day cutoff hour"
              bind:value={cutoffHour}
              onchange={savePreferences}
            />
            <span class="unit">:00 AM</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">Daily Capacity Budget</span>
            <span class="setting-help">Target 25-minute Pomodoro focus blocks per academic day (6 blocks ≈ 2.5h of deep work).</span>
          </div>
          <div class="input-wrap">
            <input
              type="number"
              min="1"
              max="16"
              aria-label="Daily block capacity target"
              bind:value={dailyTarget}
              onchange={savePreferences}
            />
            <span class="unit">Blocks</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-desc">
            <span class="setting-name">Finals Prep Mode</span>
            <span class="setting-help">Allocates 100% of study capacity to impending exams, temporarily deferring routine lecture shields.</span>
          </div>
          <button
            type="button"
            class="switch-pill {finalsMode ? 'active-finals' : ''}"
            onclick={() => {
              finalsMode = !finalsMode;
              savePreferences();
            }}
            aria-pressed={finalsMode}
          >
            <BookMarked size={13} strokeWidth={2} />
            <span>{finalsMode ? 'Finals Mode Active' : 'Standard Routine'}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Data Backup & Portability -->
    <section class="settings-card surface-card full-width" aria-labelledby="section-data-title">
      <div class="card-title-row">
        <span class="icon-bubble slate"><Download size={16} strokeWidth={2} /></span>
        <h2 id="section-data-title">Data Sovereignty & Local Backups</h2>
      </div>
      <p class="section-explanation">
        Your academic record never leaves this device. Data is persisted in <strong>SQLite WAL mode</strong> with ACID transactions. Orian automatically generates rolling 7-day backups in your user profile on every launch. You can export or import your complete state at any time as clean, human-readable JSON.
      </p>

      <div class="backup-actions">
        <button type="button" class="primary" onclick={handleExportBackup}>
          <Download size={14} strokeWidth={2} />
          <span>Export Backup JSON</span>
        </button>

        <label class="ghost upload-label" aria-label="Restore from backup JSON file">
          <Upload size={14} strokeWidth={2} />
          <span>Restore From File...</span>
          <input type="file" accept=".json" onchange={handleImportFile} class="visually-hidden" />
        </label>
      </div>
    </section>
  </div>
</div>

<!-- Accessible Restore Confirmation Modal -->
{#if showImportModal}
  <div class="modal-root" role="dialog" aria-modal="true" aria-labelledby="restore-modal-title" tabindex="-1">
    <button
      type="button"
      class="modal-backdrop"
      onclick={cancelRestore}
      aria-label="Cancel restore dialog"
      tabindex="-1"
    ></button>
    <div class="modal-card surface-card">
      <div class="modal-title-row">
        <div class="danger-icon-bubble">
          <AlertTriangle size={18} strokeWidth={2} />
        </div>
        <h2 id="restore-modal-title">Confirm Database Restore</h2>
      </div>
      <p class="modal-desc">
        Importing this backup will overwrite your current courses, timetable, scheduled assessments, and Pomodoro focus history with the contents of the imported file. This operation cannot be undone.
      </p>
      <div class="modal-actions">
        <button type="button" class="ghost" onclick={cancelRestore}>Cancel</button>
        <button type="button" class="primary danger-btn" onclick={confirmRestore}>Overwrite & Restore</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-view {
    display: flex;
    flex-direction: column;
    gap: var(--grid-6);
  }

  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: var(--grid-4);
  }

  .title-with-badge {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .version-badge {
    font-size: 11px;
    font-family: var(--font-mono);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .subtitle {
    margin-top: 4px;
    font-size: 13px;
    color: var(--ink-secondary);
    max-width: 720px;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--grid-5);
  }

  .settings-card {
    padding: var(--grid-5);
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .settings-card.full-width {
    grid-column: 1 / -1;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .card-title-row h2 {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .icon-bubble {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-xs);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .icon-bubble.emerald {
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
  }

  .icon-bubble.amber {
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
  }

  .icon-bubble.slate {
    background: var(--bg-subtle);
    color: var(--ink-secondary);
  }

  .setting-list {
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--grid-4);
    padding-bottom: var(--grid-3);
    border-bottom: 1px solid var(--border-subtle);
  }

  .setting-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-desc {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .setting-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .setting-help {
    font-size: 12px;
    color: var(--ink-muted);
    line-height: 1.4;
  }

  .theme-toggle-group {
    display: inline-flex;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
    gap: 2px;
  }

  .toggle-btn {
    padding: 5px 12px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--ink-secondary);
    border-radius: var(--radius-xs);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle-btn:hover {
    color: var(--ink-primary);
  }

  .toggle-btn.active {
    background: var(--bg-surface);
    color: var(--ink-primary);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .switch-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--bg-subtle);
    color: var(--ink-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .switch-pill.on {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
  }

  .switch-pill.active-finals {
    background: var(--accent-amber-subtle);
    border-color: var(--accent-amber);
    color: var(--accent-amber-ink);
  }

  .input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 120px;
  }

  .input-wrap input {
    width: 60px;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 600;
    padding: 6px 4px;
  }

  .unit {
    font-size: 12px;
    color: var(--ink-muted);
    font-family: var(--font-mono);
  }

  .section-explanation {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  .backup-actions {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    padding-top: var(--grid-2);
  }

  .upload-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 16px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* Modal */
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    backdrop-filter: blur(2px);
    border: none;
    cursor: default;
  }

  .modal-card {
    position: relative;
    z-index: 2001;
    width: 440px;
    max-width: 90vw;
    padding: var(--grid-6);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
    box-shadow: var(--shadow-lg);
  }

  .modal-title-row {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .modal-title-row h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .danger-icon-bubble {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-xs);
    background: rgba(197, 48, 48, 0.12);
    color: var(--accent-crimson);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-desc {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--grid-3);
    padding-top: var(--grid-2);
  }

  .danger-btn {
    background: var(--accent-crimson);
    border-color: var(--accent-crimson);
    color: #FFFFFF;
  }

  .danger-btn:hover {
    background: #A62424;
  }
</style>
