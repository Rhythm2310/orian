<script lang="ts">
  import { AlertTriangle, Clock } from '@lucide/svelte';
  import type { CapacityDeficit } from '../lib/types.ts';

  interface Props {
    deficit?: CapacityDeficit | null;
  }

  let { deficit = null }: Props = $props();
</script>

{#if deficit && deficit.hasDeficit}
  <div class="deficit-banner" role="alert" aria-live="polite">
    <div class="deficit-icon-wrap" aria-hidden="true">
      <AlertTriangle size={17} strokeWidth={2} class="alert-icon" />
    </div>

    <div class="deficit-content">
      <div class="deficit-header">
        <span class="deficit-heading">Exam Capacity Deficit Warning</span>
        <span class="deficit-pill tabular-nums">
          <Clock size={11} strokeWidth={2} />
          +{deficit.dailyDeficit} blocks/day needed
        </span>
      </div>
      <p class="deficit-desc">{deficit.warningText}</p>
    </div>

    <div class="deficit-badge tabular-nums" title="Total deficit across all upcoming exams">
      <span class="badge-num">+{deficit.totalDeficitBlocks}</span>
      <span class="badge-label">Blocks Short</span>
    </div>
  </div>
{/if}

<style>
  .deficit-banner {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
    background: var(--accent-amber-subtle);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 35%, transparent);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    box-shadow: var(--shadow-sm);
  }

  .deficit-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent-amber) 15%, transparent);
    color: var(--accent-amber);
    flex-shrink: 0;
  }

  .deficit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .deficit-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .deficit-heading {
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-amber-ink);
  }

  .deficit-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    color: var(--accent-amber-ink);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
  }

  .deficit-desc {
    font-size: 12px;
    color: var(--ink-secondary);
    line-height: 1.4;
    margin: 0;
  }

  .deficit-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    background: var(--bg-surface);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .badge-num {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    color: var(--accent-amber-ink);
  }

  .badge-label {
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-muted);
  }
</style>
