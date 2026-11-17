<script lang="ts">
  import type { DailyAllocationResult, Course } from '../lib/types.ts';
  import { Shield, Sparkles } from '@lucide/svelte';

  interface Props {
    allocation?: DailyAllocationResult | null;
    courses?: Course[];
  }

  let { allocation = null, courses = [] }: Props = $props();

  function getCourse(courseId: string): Pick<Course, 'code' | 'color'> {
    const found = courses.find(c => c.id === courseId);
    return found ? { code: found.code, color: found.color } : { code: courseId, color: '#1A6B4E' };
  }

  const routineShieldPct = $derived.by(() => {
    if (!allocation || allocation.totalDailyBlocks <= 0 || !allocation.routineShieldBlocks) return 0;
    return Math.round((allocation.routineShieldBlocks / allocation.totalDailyBlocks) * 100);
  });
</script>

{#if allocation && allocation.courseAllocations && allocation.courseAllocations.length > 0}
  <div class="effort-bar-wrapper surface-card leading-line">
    <div class="bar-header">
      <div class="header-left">
        <span class="bar-title">Today's Proportional Effort Split</span>
        {#if allocation.finalsPrepMode}
          <span class="tag tag-amber">100% Finals Focus</span>
        {/if}
      </div>
      <div class="bar-summary tabular-nums">
        <span class="budget-pill">{allocation.totalDailyBlocks} Blocks Budget</span>
        {#if allocation.routineShieldBlocks > 0}
          <span class="shield-pill">
            <Shield size={11} strokeWidth={2} />
            {allocation.routineShieldBlocks} Shield
          </span>
        {/if}
      </div>
    </div>

    <!-- Segmented Proportional Bar (1500 DPI Subpixel Crisp Track) -->
    <div
      class="split-track"
      role="progressbar"
      aria-label="Daily Effort Split"
      aria-valuenow={100}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {#if routineShieldPct > 0}
        <div
          class="track-segment routine-shield-segment"
          style="width: {routineShieldPct}%;"
          title="Routine Shield: {allocation.routineShieldBlocks} blocks ({routineShieldPct}%) preserved for today's classes"
        ></div>
      {/if}
      {#each allocation.courseAllocations as alloc (alloc.course_id)}
        {@const crs = getCourse(alloc.course_id)}
        {@const pct = allocation.totalDailyBlocks > 0 ? Math.round((alloc.allocatedBlocks / allocation.totalDailyBlocks) * 100) : alloc.percentage}
        {#if pct > 0}
          <div
            class="track-segment"
            style="width: {pct}%; background: {crs.color || '#1A6B4E'};"
            title="{crs.code}: {alloc.allocatedBlocks} blocks ({pct}%) — {alloc.reason}"
          ></div>
        {/if}
      {/each}
    </div>

    <!-- Proportional Legend with Leading Line Anchors -->
    <div class="bar-legend">
      {#if routineShieldPct > 0}
        <div class="legend-item">
          <span class="legend-dot routine-shield-dot"></span>
          <span class="legend-code">Same-Day Shield</span>
          <span class="legend-blocks tabular-nums">{allocation.routineShieldBlocks}b</span>
          <span class="legend-pct tabular-nums">({routineShieldPct}%)</span>
        </div>
      {/if}
      {#each allocation.courseAllocations as alloc (alloc.course_id)}
        {@const crs = getCourse(alloc.course_id)}
        {@const pct = allocation.totalDailyBlocks > 0 ? Math.round((alloc.allocatedBlocks / allocation.totalDailyBlocks) * 100) : alloc.percentage}
        {#if alloc.allocatedBlocks > 0}
          <div class="legend-item" title="{alloc.reason}">
            <span class="legend-dot" style="background: {crs.color || '#1A6B4E'};"></span>
            <span class="legend-code">{crs.code}</span>
            <span class="legend-blocks tabular-nums">{alloc.allocatedBlocks}b</span>
            <span class="legend-pct tabular-nums">({pct}%)</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
  .effort-bar-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--grid-3);
    padding: var(--grid-4);
  }

  .bar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bar-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .bar-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
  }

  .budget-pill {
    color: var(--ink-muted);
    font-weight: 500;
  }

  .shield-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--accent-emerald-ink);
    background: var(--accent-emerald-subtle);
    padding: 1px 6px;
    border-radius: var(--radius-xs);
    font-weight: 600;
  }

  .split-track {
    height: 8px;
    border-radius: var(--radius-full);
    overflow: hidden;
    display: flex;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
  }

  .track-segment {
    height: 100%;
    transition: width var(--transition-normal);
  }

  .routine-shield-segment {
    background: color-mix(in srgb, var(--accent-emerald) 28%, var(--bg-surface));
    border-right: 1px solid var(--accent-emerald);
  }

  .routine-shield-dot {
    background: var(--accent-emerald);
    border-radius: var(--radius-full);
  }

  .bar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--grid-4);
    padding-top: 2px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .legend-dot {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }

  .legend-code {
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--ink-primary);
    font-size: 11.5px;
  }

  .legend-blocks {
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .legend-pct {
    color: var(--ink-muted);
    font-size: 11px;
  }
</style>
