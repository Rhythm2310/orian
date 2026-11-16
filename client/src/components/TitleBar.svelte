<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { Sun, Moon, Sparkles, Command } from '@lucide/svelte';
</script>

<header class="titlebar">
  <div class="title-section">
    <div class="app-brand">
      <span class="brand-beacon"></span>
      <span class="brand-name">Orian</span>
      <span class="brand-subtitle">Focus Workbench</span>
    </div>

    {#if store.snapshot?.settings?.finals_prep_mode}
      <span class="tag tag-amber titlebar-interactive">
        Finals Prep Mode Active
      </span>
    {/if}
  </div>

  <div class="controls-section titlebar-interactive">
    <button
      class="palette-pill"
      onclick={() => store.showCommandPalette = true}
      title="Quick Actions (Ctrl+K)"
      aria-label="Open Command Palette"
    >
      <Command size={13} strokeWidth={1.75} />
      <span>Actions</span>
      <kbd>Ctrl+K</kbd>
    </button>

    <button
      class="ghost icon-btn"
      onclick={() => store.toggleTheme()}
      title={store.theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle theme"
    >
      {#if store.theme === 'light'}
        <Moon size={15} strokeWidth={1.75} />
      {:else}
        <Sun size={15} strokeWidth={1.75} />
      {/if}
    </button>
  </div>
</header>

<style>
  .title-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .app-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand-beacon {
    width: 9px;
    height: 9px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
    box-shadow: 0 0 0 2px var(--accent-emerald-subtle);
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-primary);
    letter-spacing: -0.01em;
  }

  .brand-subtitle {
    font-size: 11px;
    color: var(--ink-muted);
    font-weight: 400;
  }

  .controls-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .palette-pill {
    padding: 4px 10px;
    font-size: 12px;
    gap: 6px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    color: var(--ink-secondary);
  }

  .palette-pill:hover {
    background: var(--bg-subtle);
    color: var(--ink-primary);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    padding: 1px 4px;
    border-radius: 3px;
    color: var(--ink-muted);
  }

  .icon-btn {
    padding: 6px;
    border-radius: var(--radius-sm);
    color: var(--ink-secondary);
  }

  .icon-btn:hover {
    color: var(--ink-primary);
  }
</style>
