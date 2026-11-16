<script>
  import { store } from '../lib/store.svelte.js';

  let { allocation = null, courses = [] } = $props();

  function getCourse(courseId) {
    return courses.find(c => c.id === courseId) || { code: courseId, color: '#1A6B4E' };
  }

  let routineShieldPct = $derived(
    allocation && allocation.totalDailyBlocks > 0 && allocation.routineShieldBlocks > 0
      ? Math.round((allocation.routineShieldBlocks / allocation.totalDailyBlocks) * 100)
      : 0
  );
</script>

{#if allocation && allocation.courseAllocations && allocation.courseAllocations.length > 0}
  <div class="effort-bar-wrapper">
    <div class="bar-header">
      <span class="bar-title">Recommended Daily Focus Distribution</span>
      <span class="bar-summary tabular-nums">
        {allocation.totalDailyBlocks} Blocks Budget
        {#if allocation.routineShieldBlocks > 0}
          · {allocation.routineShieldBlocks} Routine Shield
        {/if}
      </span>
    </div>

    <!-- Segmented Proportional Bar -->
    <div class="split-track" role="progressbar" aria-label="Effort Allocation Distribution">
      {#if routineShieldPct > 0}
        <div
          class="track-segment routine-shield-segment"
          style="width: {routineShieldPct}%;"
          title="Routine Shield: {allocation.routineShieldBlocks} blocks ({routineShieldPct}%) preserved for today's classes"
        ></div>
      {/if}
      {#each allocation.courseAllocations as alloc}
        {@const crs = getCourse(alloc.course_id)}
        {@const pct = allocation.totalDailyBlocks > 0 ? Math.round((alloc.allocatedBlocks / allocation.totalDailyBlocks) * 100) : alloc.percentage}
        <div
          class="track-segment"
          style="width: {pct}%; background: {crs.color || '#1A6B4E'};"
          title="{crs.code}: {alloc.allocatedBlocks} blocks ({pct}%) - {alloc.reason}"
        ></div>
      {/each}
    </div>

    <!-- Legend -->
    <div class="bar-legend">
      {#if routineShieldPct > 0}
        <div class="legend-item">
          <span class="legend-dot routine-shield-dot"></span>
          <span class="legend-code">Routine Shield</span>
          <span class="legend-blocks tabular-nums">{allocation.routineShieldBlocks}b</span>
          <span class="legend-pct tabular-nums">({routineShieldPct}%)</span>
        </div>
      {/if}
      {#each allocation.courseAllocations as alloc}
        {@const crs = getCourse(alloc.course_id)}
        {@const pct = allocation.totalDailyBlocks > 0 ? Math.round((alloc.allocatedBlocks / allocation.totalDailyBlocks) * 100) : alloc.percentage}
        <div class="legend-item">
          <span class="legend-dot" style="background: {crs.color || '#1A6B4E'};"></span>
          <span class="legend-code">{crs.code}</span>
          <span class="legend-blocks tabular-nums">{alloc.allocatedBlocks}b</span>
          <span class="legend-pct tabular-nums">({pct}%)</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .effort-bar-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    box-shadow: var(--shadow-sm);
  }

  .bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bar-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .bar-summary {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .split-track {
    height: 10px;
    border-radius: var(--radius-full);
    overflow: hidden;
    display: flex;
    background: var(--bg-subtle);
  }

  .track-segment {
    height: 100%;
    transition: width var(--transition-normal);
  }

  .routine-shield-segment {
    background: repeating-linear-gradient(
      -45deg,
      var(--accent-emerald-subtle),
      var(--accent-emerald-subtle) 4px,
      rgba(26, 107, 78, 0.35) 4px,
      rgba(26, 107, 78, 0.35) 8px
    );
  }

  .routine-shield-dot {
    background: var(--accent-emerald);
    border: 1px dashed var(--accent-emerald-ink);
  }

  .bar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 4px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
  }

  .legend-code {
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--ink-primary);
  }

  .legend-blocks {
    font-weight: 500;
    color: var(--ink-secondary);
  }

  .legend-pct {
    color: var(--ink-muted);
  }
</style>
