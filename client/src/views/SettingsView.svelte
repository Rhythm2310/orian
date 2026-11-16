<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    Settings,
    Eye,
    Volume2,
    Clock,
    BookMarked,
    Download,
    Upload,
    CheckCircle2
  } from '@lucide/svelte';

  let theme = $state(store.theme);
  let contrast = $state(store.contrast);
  let dyslexic = $state(store.dyslexic);
  let chimes = $state(store.chimesEnabled);
  let dailyTarget = $state(store.snapshot?.settings?.daily_block_target || 6);
  let cutoffHour = $state(store.snapshot?.settings?.academic_cutoff_hour || 4);
  let finalsMode = $state(Boolean(store.snapshot?.settings?.finals_prep_mode));

  async function savePreferences() {
    await api.updateSettings({
      daily_block_target: parseInt(dailyTarget, 10),
      academic_cutoff_hour: parseInt(cutoffHour, 10),
      finals_prep_mode: finalsMode,
      chimes_enabled: chimes
    });
    store.showToast('Settings saved successfully.');
    await store.refreshSnapshot();
  }

  function handleThemeChange(newTheme) {
    theme = newTheme;
    if (store.theme !== newTheme) {
      store.toggleTheme();
    }
  }

  function handleContrastChange(newContrast) {
    contrast = newContrast;
    store.setContrast(newContrast);
  }

  function handleDyslexicChange() {
    dyslexic = !dyslexic;
    store.toggleDyslexic();
  }

  async function handleExportBackup() {
    const data = await api.exportBackup();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orian-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    store.showToast('Backup JSON exported.');
  }

  let showImportModal = $state(false);
  let pendingImportData = $state(null);

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        pendingImportData = json;
        showImportModal = true;
      } catch (err) {
        store.showToast('Invalid backup JSON file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async function confirmRestore() {
    if (!pendingImportData) return;
    try {
      await api.importBackup(pendingImportData);
      showImportModal = false;
      pendingImportData = null;
      store.showToast('Database restored successfully from backup.');
      await store.refreshSnapshot();
    } catch (err) {
      store.showToast('Restore failed: ' + err.message, 'error');
    }
  }

  function cancelRestore() {
    showImportModal = false;
    pendingImportData = null;
  }
</script>

<div class="stage-content">
  <div class="view-header">
    <div>
      <h1>Settings & Accessibility</h1>
      <p>Fine-tune capacity calculation, visual contrast, typography, and offline data backups.</p>
    </div>
  </div>

  <div class="settings-grid">
    <!-- Visual & Typography -->
    <section class="settings-card">
      <div class="card-title-row">
        <Eye size={18} strokeWidth={1.75} class="section-icon" />
        <h2>Theme & Readability</h2>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">Visual Theme</span>
          <span class="setting-help">Balanced neutral palettes designed for prolonged screen work.</span>
        </div>
        <div class="theme-toggle-group">
          <button
            class="toggle-btn {theme === 'light' ? 'active' : ''}"
            onclick={() => handleThemeChange('light')}
          >
            Studio Light
          </button>
          <button
            class="toggle-btn {theme === 'dark' ? 'active' : ''}"
            onclick={() => handleThemeChange('dark')}
          >
            Studio Dark
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">High-Contrast Mode</span>
          <span class="setting-help">2px solid borders, maximized ink-to-surface contrast.</span>
        </div>
        <div class="theme-toggle-group">
          <button
            class="toggle-btn {contrast === 'normal' ? 'active' : ''}"
            onclick={() => handleContrastChange('normal')}
          >
            Normal
          </button>
          <button
            class="toggle-btn {contrast === 'high' ? 'active' : ''}"
            onclick={() => handleContrastChange('high')}
          >
            High Contrast
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">OpenDyslexic Font</span>
          <span class="setting-help">Applies specialized heavy-bottom letterforms for readability.</span>
        </div>
        <button
          class="primary toggle-switch-btn {dyslexic ? 'on' : ''}"
          onclick={handleDyslexicChange}
        >
          {dyslexic ? 'Enabled' : 'Disabled'}
        </button>
      </div>
    </section>

    <!-- Academic Engine Settings -->
    <section class="settings-card">
      <div class="card-title-row">
        <Clock size={18} strokeWidth={1.75} class="section-icon" />
        <h2>Academic Engine & Capacity</h2>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">Academic Day Cutoff Hour</span>
          <span class="setting-help">Hours before this cutoff belong to yesterday's effort budget.</span>
        </div>
        <div class="input-wrap">
          <input type="number" min="0" max="8" bind:value={cutoffHour} onchange={savePreferences} />
          <span class="unit">:00 AM</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">Daily Capacity Budget</span>
          <span class="setting-help">Target 25m focus blocks per day.</span>
        </div>
        <div class="input-wrap">
          <input type="number" min="1" max="16" bind:value={dailyTarget} onchange={savePreferences} />
          <span class="unit">Blocks</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">Finals Prep Mode</span>
          <span class="setting-help">Allocates 100% of study capacity to finals, suppressing regular routine shields.</span>
        </div>
        <button
          class="primary toggle-switch-btn {finalsMode ? 'on' : ''}"
          onclick={() => {
            finalsMode = !finalsMode;
            savePreferences();
          }}
        >
          {finalsMode ? 'Active' : 'Inactive'}
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-desc">
          <span class="setting-name">Audio Chimes</span>
          <span class="setting-help">100% offline Web Audio API focus bells on start and completion.</span>
        </div>
        <button
          class="primary toggle-switch-btn {chimes ? 'on' : ''}"
          onclick={() => {
            chimes = !chimes;
            savePreferences();
          }}
        >
          {chimes ? 'Enabled' : 'Muted'}
        </button>
      </div>
    </section>

    <!-- Data Backup & Portability -->
    <section class="settings-card full-width">
      <div class="card-title-row">
        <Download size={18} strokeWidth={1.75} class="section-icon" />
        <h2>Data Ownership & Offline Backups</h2>
      </div>
      <p class="setting-help">
        Your data is stored 100% locally in SQLite WAL mode. Orian creates rolling 7-day backups automatically in your system profile. You can export or restore complete state as human-readable JSON anytime.
      </p>

      <div class="backup-actions">
        <button class="primary" onclick={handleExportBackup}>
          <Download size={14} strokeWidth={1.75} />
          <span>Export Complete Backup (JSON)</span>
        </button>

        <label class="upload-btn">
          <Upload size={14} strokeWidth={1.75} />
          <span>Restore From Backup File</span>
          <input type="file" accept=".json" onchange={handleImportFile} style="display:none;" />
        </label>
      </div>
    </section>
  </div>
</div>

{#if showImportModal}
  <div class="modal-backdrop" onclick={cancelRestore} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
      <h2>Confirm Database Restore</h2>
      <p class="modal-desc">
        Importing this backup will overwrite your current courses, timetable, exams, and focus history. Are you sure you wish to proceed?
      </p>
      <div class="modal-actions">
        <button class="ghost" onclick={cancelRestore}>Cancel</button>
        <button class="primary danger-btn" onclick={confirmRestore}>Restore Database</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .settings-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-sm);
  }

  .settings-card.full-width {
    grid-column: 1 / -1;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-title-row h2 {
    font-size: 16px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding-bottom: 12px;
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
  }

  .setting-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .setting-help {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .theme-toggle-group {
    display: flex;
    background: var(--bg-subtle);
    border-radius: var(--radius-xs);
    padding: 2px;
  }

  .toggle-btn {
    padding: 5px 10px;
    font-size: 12px;
    border: none;
    background: transparent;
    color: var(--ink-secondary);
    border-radius: var(--radius-xs);
  }

  .toggle-btn.active {
    background: var(--bg-surface);
    color: var(--ink-primary);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .toggle-switch-btn {
    padding: 6px 14px;
    font-size: 12px;
  }

  .input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 110px;
  }

  .input-wrap input {
    text-align: center;
    font-family: var(--font-mono);
  }

  .unit {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .backup-actions {
    display: flex;
    gap: 12px;
    padding-top: 8px;
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    color: var(--ink-primary);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .upload-btn:hover {
    background: var(--bg-subtle);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 440px;
    max-width: 90vw;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  .modal-desc {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
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
