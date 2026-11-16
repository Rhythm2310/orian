<script>
  import { store } from '../lib/store.svelte.js';
  import { CheckCircle2, RotateCcw, X } from '@lucide/svelte';
</script>

{#if store.toast}
  <div class="toast-wrapper" role="status" aria-live="polite">
    <div class="toast-card">
      <CheckCircle2 size={16} strokeWidth={1.75} class="toast-icon" />
      <span class="toast-message">{store.toast.message}</span>

      {#if store.toast.undoAction}
        <button class="undo-btn" onclick={store.toast.undoAction}>
          <RotateCcw size={13} strokeWidth={1.75} />
          <span>Undo</span>
        </button>
      {/if}

      <button class="ghost dismiss-btn" onclick={() => store.dismissToast()} aria-label="Dismiss">
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  </div>
{/if}

<style>
  .toast-wrapper {
    position: fixed;
    bottom: 24px;
    right: 32px;
    z-index: 3000;
    pointer-events: none;
  }

  .toast-card {
    pointer-events: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: var(--shadow-md);
    font-size: 13px;
    color: var(--ink-primary);
    max-width: 400px;
  }

  :global(.toast-icon) {
    color: var(--accent-emerald);
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
  }

  .undo-btn {
    padding: 3px 8px;
    font-size: 12px;
    background: var(--bg-subtle);
    border-color: var(--border-subtle);
  }

  .dismiss-btn {
    padding: 2px;
    color: var(--ink-muted);
  }
</style>
