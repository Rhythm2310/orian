<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { CheckCircle2, AlertTriangle, RotateCcw, X } from '@lucide/svelte';
</script>

{#if store.toast}
  <aside class="toast-wrapper" role="status" aria-live="polite">
    <div class="toast-card surface-card {store.toast.type === 'error' ? 'toast-error' : ''}">
      <span class="toast-icon">
        {#if store.toast.type === 'error'}
          <AlertTriangle size={15} strokeWidth={2} />
        {:else}
          <CheckCircle2 size={15} strokeWidth={2} />
        {/if}
      </span>

      <span class="toast-message">{store.toast.message}</span>

      {#if store.toast.undoAction}
        <button type="button" class="undo-btn ghost" onclick={store.toast.undoAction}>
          <RotateCcw size={12} strokeWidth={2} />
          <span>Undo</span>
        </button>
      {/if}

      <button
        type="button"
        class="ghost icon-btn dismiss-btn"
        onclick={() => store.dismissToast()}
        aria-label="Dismiss notification"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  </aside>
{/if}

<style>
  .toast-wrapper {
    position: fixed;
    bottom: 24px;
    right: 28px;
    z-index: 3000;
    pointer-events: none;
    animation: toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .toast-card {
    pointer-events: auto;
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    box-shadow: var(--shadow-md);
    font-size: 13px;
    color: var(--ink-primary);
    max-width: 440px;
  }

  .toast-card.toast-error {
    border-color: rgba(197, 48, 48, 0.4);
  }

  .toast-icon {
    color: var(--accent-emerald);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .toast-error .toast-icon {
    color: var(--accent-crimson);
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  .undo-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
    cursor: pointer;
  }

  .dismiss-btn {
    padding: 3px;
    color: var(--ink-muted);
  }

  .dismiss-btn:hover {
    color: var(--ink-primary);
  }
</style>
