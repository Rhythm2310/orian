<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    Search,
    LayoutDashboard,
    ListTodo,
    CalendarDays,
    Timer,
    Settings,
    Video,
    CalendarPlus,
    BookMarked,
    Moon,
    Sun,
    Download
  } from '@lucide/svelte';

  let query = $state('');

  const actions = [
    { id: 'view-dashboard', label: 'Go to Today\'s Plan', icon: LayoutDashboard, run: () => store.setView('dashboard') },
    { id: 'view-queue', label: 'Go to Recovery Queue', icon: ListTodo, run: () => store.setView('queue') },
    { id: 'view-routine', label: 'Go to Routine & Exams', icon: CalendarDays, run: () => store.setView('routine') },
    { id: 'view-pomodoro', label: 'Go to Pomodoro Focus', icon: Timer, run: () => store.setView('pomodoro') },
    { id: 'view-settings', label: 'Go to Settings & Accessibility', icon: Settings, run: () => store.setView('settings') },
    {
      id: 'act-disruption-makeup',
      label: 'Add Off-Day Makeup Class',
      icon: CalendarPlus,
      run: () => { store.setView('routine'); store.openDisruptionModal(); }
    },
    {
      id: 'act-disruption-online',
      label: 'Switch Class to Online / Recorded',
      icon: Video,
      run: () => { store.setView('routine'); store.openDisruptionModal(); }
    },
    {
      id: 'act-finals-mode',
      label: 'Toggle Finals Prep Mode (100% capacity to exams)',
      icon: BookMarked,
      run: async () => {
        const current = store.snapshot?.settings?.finals_prep_mode;
        await api.updateSettings({ finals_prep_mode: !current });
        store.showToast(!current ? 'Finals Prep Mode activated' : 'Finals Prep Mode deactivated');
        await store.refreshSnapshot();
      }
    },
    {
      id: 'act-theme',
      label: 'Toggle Dark / Light Theme',
      icon: Moon,
      run: () => store.toggleTheme()
    },
    {
      id: 'act-backup',
      label: 'Export Database JSON Backup',
      icon: Download,
      run: async () => {
        const data = await api.exportBackup();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orian-backup-${new Date().toISOString().substring(0, 10)}.json`;
        a.click();
        store.showToast('Backup JSON exported successfully');
      }
    }
  ];

  let filteredActions = $derived(
    query.trim() === ''
      ? actions
      : actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
  );

  function execute(action) {
    action.run();
    store.showCommandPalette = false;
  }
</script>

{#if store.showCommandPalette}
  <div class="palette-backdrop" onclick={() => store.showCommandPalette = false} role="presentation">
    <div class="palette-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div class="search-box">
        <Search size={16} strokeWidth={1.75} class="search-icon" />
        <input
          type="text"
          placeholder="Type a command or jump to view..."
          bind:value={query}
          autofocus
        />
        <kbd>Esc</kbd>
      </div>

      <div class="actions-list" role="listbox">
        {#each filteredActions as action}
          {@const Icon = action.icon}
          <button
            class="action-item"
            onclick={() => execute(action)}
            role="option"
            aria-selected="false"
          >
            <Icon size={16} strokeWidth={1.75} />
            <span>{action.label}</span>
          </button>
        {/each}

        {#if filteredActions.length === 0}
          <div class="empty-results">No matching commands</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 18, 0.6);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 2000;
  }

  .palette-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 540px;
    max-width: 90vw;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .search-box {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
    gap: 10px;
  }

  .search-box input {
    border: none;
    background: transparent;
    font-size: 14px;
    padding: 0;
    width: 100%;
  }

  .search-box input:focus {
    outline: none;
  }

  .actions-list {
    max-height: 320px;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-radius: var(--radius-xs);
    background: transparent;
    border: 1px solid transparent;
    color: var(--ink-primary);
    font-size: 13px;
    text-align: left;
    justify-content: flex-start;
  }

  .action-item:hover, .action-item:focus {
    background: var(--bg-subtle);
  }

  .empty-results {
    padding: 16px;
    text-align: center;
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
