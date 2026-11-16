<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { Compass, ShieldCheck, X, Sparkles } from '@lucide/svelte';

  async function handleApplyTriage(): Promise<void> {
    await api.applyGapReturnTriage({ maxImmediateCapacity: 4 });
    store.showToast('Safe Return Buffer activated: prioritized syllabus items queued.');
    store.showGapReturnModal = false;
    await store.refreshSnapshot();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      store.showGapReturnModal = false;
    }
  }
</script>

{#if store.showGapReturnModal && store.snapshot?.gapInfo?.gapDetected}
  <div class="modal-root" onkeydown={handleKeyDown} role="presentation">
    <button
      type="button"
      class="modal-backdrop"
      onclick={() => store.showGapReturnModal = false}
      aria-label="Dismiss gap return modal"
      tabindex="-1"
    ></button>

    <div
      class="modal-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <div class="title-with-icon">
          <span class="icon-bubble emerald"><Compass size={18} strokeWidth={2} /></span>
          <h2 id="gap-title">Safe Return Protocol</h2>
        </div>
        <button
          type="button"
          class="ghost icon-btn"
          onclick={() => store.showGapReturnModal = false}
          aria-label="Dismiss"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      <div class="gap-status">
        <span class="gap-pill font-mono tabular-nums">
          {store.snapshot.gapInfo.gapDays} Days Inactive
        </span>
        <span class="gap-text">
          Last active academic day was {store.snapshot.settings?.last_active_academic_date || 'earlier this semester'}.
        </span>
      </div>

      <div class="gap-explanation">
        <p>
          Returning after an absence is triage, not punishment. Instead of overwhelming you with a mountain of overdue lectures all at once, Orian isolates in-syllabus lectures for upcoming exams and defers the rest into your recovery queue.
        </p>
      </div>

      <div class="triage-features">
        <div class="feature-item">
          <span class="feature-icon"><ShieldCheck size={16} strokeWidth={2} /></span>
          <span>Caps today's immediate recovery workload to <strong>4 critical lectures</strong></span>
        </div>
        <div class="feature-item">
          <span class="feature-icon"><Sparkles size={16} strokeWidth={2} /></span>
          <span>Prioritizes lectures tied directly to imminent assessments</span>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="ghost" onclick={() => store.showGapReturnModal = false}>
          I'll Manage Manually
        </button>
        <button type="button" class="primary" onclick={handleApplyTriage}>
          Activate Safe Return Buffer
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 2300;
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
    z-index: 2301;
    width: 490px;
    max-width: 90vw;
    padding: var(--grid-6);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .title-with-icon h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .icon-bubble.emerald {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-xs);
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gap-status {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
  }

  .gap-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
    border: 1px solid rgba(185, 88, 26, 0.3);
    padding: 2px 7px;
    border-radius: var(--radius-xs);
  }

  .gap-text {
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .gap-explanation p {
    font-size: 13px;
    line-height: 1.5;
    color: var(--ink-secondary);
  }

  .triage-features {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
    padding: var(--grid-1) 0;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    font-size: 13px;
    color: var(--ink-primary);
  }

  .feature-icon {
    color: var(--accent-emerald);
    display: flex;
    align-items: center;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--grid-3);
    padding-top: var(--grid-2);
  }
</style>
