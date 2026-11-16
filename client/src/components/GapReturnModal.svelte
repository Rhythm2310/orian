<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { Compass, ShieldCheck, X } from '@lucide/svelte';

  async function handleApplyTriage() {
    await api.applyGapReturnTriage({ maxImmediateCapacity: 4 });
    store.showToast('Safe Return Buffer active: prioritized syllabus items queued.');
    store.showGapReturnModal = false;
    await store.refreshSnapshot();
  }
</script>

{#if store.showGapReturnModal && store.snapshot?.gapInfo?.gapDetected}
  <div class="modal-backdrop" onclick={() => store.showGapReturnModal = false} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="gap-title">
      <div class="modal-header">
        <div class="title-with-icon">
          <Compass size={20} strokeWidth={1.75} class="accent-icon" />
          <h2 id="gap-title">Safe Return Protocol</h2>
        </div>
        <button class="ghost icon-btn" onclick={() => store.showGapReturnModal = false} aria-label="Dismiss">
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div class="gap-status">
        <span class="gap-pill tabular-nums">
          {store.snapshot.gapInfo.gapDays} Days Away
        </span>
        <span class="gap-text">
          Last active academic day was {store.snapshot.settings?.last_active_academic_date || 'earlier this week'}.
        </span>
      </div>

      <div class="gap-explanation">
        <p>
          Returning after an absence is triage, not punishment. Instead of slamming you with overdue lectures all at once, Orian isolates in-syllabus lectures for upcoming exams and defers the rest into your recovery queue.
        </p>
      </div>

      <div class="triage-features">
        <div class="feature-item">
          <ShieldCheck size={16} strokeWidth={1.75} />
          <span>Caps today's immediate recovery workload to 4 critical lectures</span>
        </div>
        <div class="feature-item">
          <ShieldCheck size={16} strokeWidth={1.75} />
          <span>Elevates lectures tied directly to imminent exams</span>
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
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 500px;
    max-width: 90vw;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  :global(.accent-icon) {
    color: var(--accent-emerald);
  }

  .gap-status {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-subtle);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
  }

  .gap-pill {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
    border: 1px solid var(--accent-amber);
    padding: 2px 6px;
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
    gap: 8px;
    padding: 8px 0;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--ink-primary);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
  }
</style>
