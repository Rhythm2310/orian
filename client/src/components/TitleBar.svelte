<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { Sun, Moon, Command, ShieldCheck, Flame } from '@lucide/svelte';

  const academicDateFormatted = $derived.by(() => {
    if (!store.snapshot?.academicDate) return '';
    const [y, m, d] = store.snapshot.academicDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  });
</script>

<header class="titlebar" aria-label="Application Title Bar">
  <!-- Left: Brand + Academic Day Status -->
  <div class="title-section">
    <div class="app-brand" title="Orian Desktop Focus Workbench">
      <span class="brand-beacon" aria-hidden="true"></span>
      <span class="brand-name">Orian</span>
      <span class="brand-divider" aria-hidden="true">/</span>
      <span class="academic-badge tabular-nums" title="Academic Day resets daily at 04:00 AM cutoff">
        {academicDateFormatted} · 4 AM Cutoff
      </span>
    </div>

    {#if store.snapshot?.settings?.finals_prep_mode}
      <span class="tag tag-amber titlebar-interactive" title="100% of study capacity devoted to Finals exams">
        <Flame size={12} strokeWidth={2} />
        Finals Prep Mode
      </span>
    {/if}
  </div>

  <!-- Right: Command Palette Trigger + Theme Toggle -->
  <div class="controls-section titlebar-interactive">
    <div class="offline-indicator" title="100% Offline & Sandboxed (Zero Network Requests)">
      <ShieldCheck size={13} strokeWidth={1.75} class="shield-icon" />
      <span>Offline</span>
    </div>

    <button
      type="button"
      class="palette-pill"
      onclick={() => store.showCommandPalette = true}
      title="Quick Commands & Actions (Ctrl+K)"
      aria-label="Open Command Palette (Ctrl+K)"
    >
      <Command size={12} strokeWidth={1.75} />
      <span>Search</span>
      <kbd>Ctrl+K</kbd>
    </button>

    <button
      type="button"
      class="ghost icon-btn"
      onclick={() => store.toggleTheme()}
      title={store.theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
      aria-label={store.theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
    >
      {#if store.theme === 'light'}
        <Moon size={14} strokeWidth={1.75} />
      {:else}
        <Sun size={14} strokeWidth={1.75} />
      {/if}
    </button>
  </div>
</header>

<style>
  .title-section {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .app-brand {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .brand-beacon {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
    box-shadow: 0 0 0 2px var(--accent-emerald-subtle);
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-primary);
    letter-spacing: -0.015em;
  }

  .brand-divider {
    color: var(--border-strong);
    font-size: 11px;
  }

  .academic-badge {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--ink-muted);
    font-weight: 500;
    background: var(--bg-surface);
    padding: 2px 7px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-subtle);
  }

  .controls-section {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .offline-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    color: var(--accent-emerald-ink);
    background: var(--accent-emerald-subtle);
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    border: 1px solid color-mix(in srgb, var(--accent-emerald) 25%, transparent);
    font-weight: 500;
  }

  .offline-indicator :global(.shield-icon) {
    color: var(--accent-emerald);
  }

  .palette-pill {
    padding: 3.5px 9px;
    font-size: 11.5px;
    gap: 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    color: var(--ink-secondary);
  }

  .palette-pill:hover {
    background: var(--bg-subtle);
    border-color: var(--border-strong);
    color: var(--ink-primary);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 9.5px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    padding: 1px 4px;
    border-radius: 3px;
    color: var(--ink-muted);
  }

  .icon-btn {
    padding: 5px;
    border-radius: var(--radius-sm);
    color: var(--ink-secondary);
  }

  .icon-btn:hover {
    color: var(--ink-primary);
    background: var(--bg-subtle);
  }
</style>
