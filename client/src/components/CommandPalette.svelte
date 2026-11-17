<script lang="ts">
  import type { Component } from 'svelte';
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
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

  interface ActionItem {
    id: string;
    label: string;
    icon: Component;
    run: () => void | Promise<void>;
  }

  let query = $state<string>('');
  let selectedIndex = $state<number>(0);
  let searchInputEl = $state<HTMLInputElement | null>(null);

  const actions: ActionItem[] = [
    { id: 'view-dashboard', label: 'Go to Today\'s Battle Plan', icon: LayoutDashboard, run: () => store.setView('dashboard') },
    { id: 'view-queue', label: 'Go to Recovery Queue', icon: ListTodo, run: () => store.setView('queue') },
    { id: 'view-routine', label: 'Go to Timetable & Routine', icon: CalendarDays, run: () => store.setView('routine') },
    { id: 'view-pomodoro', label: 'Go to Focus Studio', icon: Timer, run: () => store.setView('pomodoro') },
    { id: 'view-settings', label: 'Go to Settings & Accessibility', icon: Settings, run: () => store.setView('settings') },
    {
      id: 'act-disruption-makeup',
      label: 'Record Off-Day Makeup Class',
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
        store.showToast(!current ? 'Finals Prep Mode activated.' : 'Finals Prep Mode deactivated.');
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
        URL.revokeObjectURL(url);
        store.showToast('Backup JSON exported successfully.');
      }
    }
  ];

  let filteredActions = $derived<ActionItem[]>(
    query.trim() === ''
      ? actions
      : actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
  );

  function execute(action: ActionItem): void {
    action.run();
    closePalette();
  }

  function closePalette(): void {
    store.showCommandPalette = false;
    query = '';
    selectedIndex = 0;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filteredActions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredActions.length) % Math.max(1, filteredActions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredActions[selectedIndex]) {
        execute(filteredActions[selectedIndex]);
      }
    }
  }

  $effect(() => {
    if (store.showCommandPalette) {
      setTimeout(() => {
        searchInputEl?.focus();
      }, 50);
    }
  });

  $effect(() => {
    if (query && selectedIndex >= filteredActions.length) {
      selectedIndex = 0;
    }
  });
</script>

{#if store.showCommandPalette}
  <div class="palette-root" onkeydown={handleKeyDown} role="presentation">
    <button
      type="button"
      class="palette-backdrop"
      onclick={closePalette}
      aria-label="Close command palette"
      tabindex="-1"
    ></button>

    <div
      class="palette-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      tabindex="-1"
    >
      <div class="search-box">
        <Search size={15} strokeWidth={2} class="search-icon" />
        <input
          bind:this={searchInputEl}
          type="text"
          placeholder="Type a command or jump to view..."
          bind:value={query}
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="command-actions-list"
          aria-activedescendant={filteredActions[selectedIndex] ? `action-${filteredActions[selectedIndex].id}` : undefined}
          aria-label="Search commands"
        />
        <kbd class="key-badge">Esc</kbd>
      </div>

      <div class="actions-list" id="command-actions-list" role="listbox" aria-label="Available commands">
        {#each filteredActions as action, idx (action.id)}
          {@const Icon = action.icon}
          <button
            id="action-{action.id}"
            type="button"
            class="action-item {selectedIndex === idx ? 'focused' : ''}"
            onclick={() => execute(action)}
            onmouseenter={() => selectedIndex = idx}
            role="option"
            aria-selected={selectedIndex === idx}
          >
            <span class="action-icon"><Icon size={15} strokeWidth={2} /></span>
            <span class="action-label">{action.label}</span>
          </button>
        {/each}

        {#if filteredActions.length === 0}
          <div class="empty-results">No matching commands found</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-root {
    position: fixed;
    inset: 0;
    z-index: 2500;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 14vh;
  }

  .palette-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    backdrop-filter: blur(2px);
    border: none;
    cursor: default;
  }

  .palette-card {
    position: relative;
    z-index: 2501;
    width: 520px;
    max-width: 90vw;
    border-radius: var(--radius-md);
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
    gap: var(--grid-3);
  }

  :global(.search-icon) {
    color: var(--ink-muted);
    flex-shrink: 0;
  }

  .search-box input {
    border: none;
    background: transparent;
    font-size: 14px;
    padding: 0;
    width: 100%;
    color: var(--ink-primary);
  }

  .search-box input:focus {
    outline: none;
  }

  .key-badge {
    font-size: 11px;
    font-family: var(--font-mono);
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-muted);
  }

  .actions-list {
    max-height: 320px;
    overflow-y: auto;
    padding: var(--grid-2);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    padding: 8px 12px;
    border-radius: var(--radius-xs);
    background: transparent;
    border: 1px solid transparent;
    color: var(--ink-primary);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
  }

  .action-item:hover,
  .action-item.focused {
    background: var(--bg-subtle);
  }

  .action-icon {
    color: var(--accent-emerald);
    display: flex;
    align-items: center;
  }

  .action-label {
    flex: 1;
  }

  .empty-results {
    padding: var(--grid-5);
    text-align: center;
    font-size: 13px;
    color: var(--ink-muted);
  }
</style>
