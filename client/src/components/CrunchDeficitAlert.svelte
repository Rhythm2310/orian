<script>
  import { AlertTriangle, TrendingUp } from '@lucide/svelte';

  let { deficit = null } = $props();
</script>

{#if deficit && deficit.hasDeficit}
  <div class="deficit-banner" role="alert">
    <div class="deficit-icon">
      <AlertTriangle size={18} strokeWidth={1.75} />
    </div>
    <div class="deficit-content">
      <div class="deficit-title">Capacity Crunch Warning</div>
      <div class="deficit-text">{deficit.warningText}</div>
    </div>
    <div class="deficit-stat tabular-nums">
      +{deficit.totalDeficitBlocks} total deficit blocks
    </div>
  </div>
{/if}

<style>
  .deficit-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--accent-amber-subtle);
    border: 1px solid var(--accent-amber);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    color: var(--accent-amber-ink);
  }

  .deficit-icon {
    color: var(--accent-amber);
    display: flex;
    align-items: center;
  }

  .deficit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .deficit-title {
    font-size: 13px;
    font-weight: 700;
  }

  .deficit-text {
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .deficit-stat {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    border: 1px solid var(--accent-amber);
  }
</style>
