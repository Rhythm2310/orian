<script lang="ts">
  import { store, type ViewName } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import {
    LayoutDashboard,
    ListTodo,
    CalendarDays,
    Timer,
    Settings,
    Play,
    Pause,
    Square,
    Check,
    Plus,
    Flame,
    Zap
  } from '@lucide/svelte';

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function toggleTimer(): Promise<void> {
    if (!store.activeTimer) {
      store.setView('pomodoro');
      return;
    }
    if (store.activeTimer.status === 'running') {
      await api.pausePomodoro();
    } else {
      await api.resumePomodoro();
    }
    await store.refreshSnapshot();
  }

  let confirmingStop = $state(false);
  let stopTimeout: ReturnType<typeof setTimeout> | null = null;

  async function stopTimer(): Promise<void> {
    if (!confirmingStop) {
      confirmingStop = true;
      if (stopTimeout) clearTimeout(stopTimeout);
      stopTimeout = setTimeout(() => {
        confirmingStop = false;
      }, 4000);
      return;
    }
    confirmingStop = false;
    if (stopTimeout) clearTimeout(stopTimeout);
    await api.completePomodoro();
    await store.refreshSnapshot();
    store.showToast('Pomodoro focus block completed.');
  }

  const activeProgress = $derived.by(() => {
    if (!store.activeTimer) return 0;
    const target = store.activeTimer.target_duration_seconds || 1500;
    const remaining = store.activeTimer.remainingSeconds ?? 0;
    const elapsed = Math.max(0, target - remaining);
    return Math.min(1, elapsed / target);
  });

  function getActiveCourseCode(): string | null {
    if (!store.activeTimer || !store.activeTimer.course_id) return null;
    const crs = (store.snapshot?.courses || []).find(c => c.id === store.activeTimer!.course_id);
    return crs ? crs.code : null;
  }
</script>

<aside class="left-rail" aria-label="Workbench Sidebar">
  <div class="rail-top">
    <!-- Main Route Navigation -->
    <nav class="nav-links" aria-label="Main Navigation">
      <button
        type="button"
        class="nav-item {store.currentView === 'dashboard' ? 'active' : ''}"
        onclick={() => store.setView('dashboard')}
        aria-current={store.currentView === 'dashboard' ? 'page' : undefined}
      >
        <LayoutDashboard size={15} strokeWidth={1.75} />
        <span class="nav-label">Today's Plan</span>
      </button>

      <button
        type="button"
        class="nav-item {store.currentView === 'queue' ? 'active' : ''}"
        onclick={() => store.setView('queue')}
        aria-current={store.currentView === 'queue' ? 'page' : undefined}
      >
        <ListTodo size={15} strokeWidth={1.75} />
        <span class="nav-label">Recovery Queue</span>
        {#if store.snapshot?.unwatchedLectures?.length}
          <span class="count-badge tabular-nums">
            {store.snapshot.unwatchedLectures.length}
          </span>
        {/if}
      </button>

      <button
        type="button"
        class="nav-item {store.currentView === 'routine' ? 'active' : ''}"
        onclick={() => store.setView('routine')}
        aria-current={store.currentView === 'routine' ? 'page' : undefined}
      >
        <CalendarDays size={15} strokeWidth={1.75} />
        <span class="nav-label">Routine & Exams</span>
        {#if store.snapshot?.upcomingExams?.length}
          <span class="exam-dot" title="Upcoming Exams Active"></span>
        {/if}
      </button>

      <button
        type="button"
        class="nav-item {store.currentView === 'pomodoro' ? 'active' : ''}"
        onclick={() => store.setView('pomodoro')}
        aria-current={store.currentView === 'pomodoro' ? 'page' : undefined}
      >
        <Timer size={15} strokeWidth={1.75} />
        <span class="nav-label">Pomodoro Focus</span>
      </button>

      <button
        type="button"
        class="nav-item {store.currentView === 'settings' ? 'active' : ''}"
        onclick={() => store.setView('settings')}
        aria-current={store.currentView === 'settings' ? 'page' : undefined}
      >
        <Settings size={15} strokeWidth={1.75} />
        <span class="nav-label">Settings & A11y</span>
      </button>
    </nav>

    <!-- Finals Mode Banner in Rail -->
    {#if store.snapshot?.settings?.finals_prep_mode}
      <div class="finals-banner">
        <Flame size={13} strokeWidth={2} class="flame-icon" />
        <div class="finals-text">
          <span class="finals-title">Finals Mode</span>
          <span class="finals-desc">100% capacity to exams</span>
        </div>
      </div>
    {/if}

    <!-- Enrolled Courses Section with Effort Multipliers -->
    <div class="rail-section">
      <div class="section-header">
        <span class="section-title">Enrolled Courses</span>
        <button
          type="button"
          class="ghost mini-add-btn"
          onclick={() => store.setView('routine')}
          title="Add / Manage Courses"
          aria-label="Add / Manage Courses"
        >
          <Plus size={13} strokeWidth={1.75} />
        </button>
      </div>

      <div class="course-list">
        {#if store.snapshot?.courses?.length}
          {#each store.snapshot.courses as course (course.id)}
            <div class="course-item" title="{course.code} — {course.name}">
              <span class="course-color" style="background: {course.color || '#1A6B4E'}"></span>
              <span class="course-code">{course.code}</span>
              {#if course.effort_multiplier && course.effort_multiplier > 1.0}
                <span class="multiplier-pill" title="Active Focus Boost: {course.effort_multiplier}x">
                  <Zap size={9} strokeWidth={2} />
                  {course.effort_multiplier}x
                </span>
              {/if}
            </div>
          {/each}
        {:else}
          <div class="empty-hint">No courses added yet</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Pinned Mini Pomodoro Dock (Golden Ratio Bottom Anchor) -->
  <div class="rail-bottom">
    {#if store.activeTimer}
      <div class="mini-timer-card {store.activeTimer.status}">
        <div
          class="mini-timer-left"
          onclick={() => store.setView('pomodoro')}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') store.setView('pomodoro'); }}
          title="Open Focus Studio"
          aria-label="Open Focus Studio"
        >
          <!-- Miniature Ring -->
          <svg class="mini-ring" viewBox="0 0 32 32">
            <circle class="ring-bg" cx="16" cy="16" r="13" />
            <circle
              class="ring-progress"
              cx="16"
              cy="16"
              r="13"
              stroke-dasharray={2 * Math.PI * 13}
              stroke-dashoffset={2 * Math.PI * 13 * (1 - activeProgress)}
            />
          </svg>
          <div class="mini-timer-info">
            <span class="mini-timer-mode truncate" title="{getActiveCourseCode() ? `${getActiveCourseCode()} · ` : ''}{store.activeTimer.mode === 'exam_revision' ? 'Exam Prep' : store.activeTimer.mode === 'lecture_recovery' ? 'Recovery' : 'Focus'}">
              {getActiveCourseCode() ? `${getActiveCourseCode()} · ` : ''}{store.activeTimer.mode === 'exam_revision' ? 'Exam Prep' : store.activeTimer.mode === 'lecture_recovery' ? 'Recovery' : 'Focus'}
            </span>
            <span class="mini-timer-digits tabular-nums">
              {formatTime(store.activeTimer.remainingSeconds || 0)}
            </span>
          </div>
        </div>

        <div class="mini-timer-actions">
          <button
            type="button"
            class="primary mini-btn"
            onclick={toggleTimer}
            title={store.activeTimer.status === 'running' ? 'Pause focus block' : 'Resume focus block'}
            aria-label={store.activeTimer.status === 'running' ? 'Pause' : 'Resume'}
          >
            {#if store.activeTimer.status === 'running'}
              <Pause size={12} strokeWidth={2} />
            {:else}
              <Play size={12} strokeWidth={2} />
            {/if}
          </button>
          <button
            type="button"
            class="ghost mini-btn {confirmingStop ? 'confirming-active' : ''}"
            onclick={stopTimer}
            title={confirmingStop ? 'Click again to confirm finish' : 'Complete Block'}
            aria-label={confirmingStop ? 'Confirm finish' : 'Complete Block'}
          >
            {#if confirmingStop}
              <Check size={12} strokeWidth={2.2} />
            {:else}
              <Square size={12} strokeWidth={2} />
            {/if}
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="quick-focus-btn"
        onclick={() => store.setView('pomodoro')}
        title="Launch Pomodoro Studio"
      >
        <Play size={13} strokeWidth={2} />
        <span>Focus Studio</span>
      </button>
    {/if}
  </div>
</aside>

<style>
  .rail-top {
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 11px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-secondary);
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    width: 100%;
    position: relative;
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--ink-primary);
  }

  .nav-item.active {
    background: var(--bg-surface);
    color: var(--accent-emerald-ink);
    border-color: var(--border-subtle);
    box-shadow: var(--shadow-sm);
    font-weight: 600;
  }

  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 0 var(--radius-full) var(--radius-full) 0;
    background: var(--accent-emerald);
  }

  .nav-label {
    flex: 1;
  }

  .count-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    padding: 1.5px 6px;
    border-radius: var(--radius-full);
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
  }

  .exam-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent-crimson);
  }

  .finals-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--accent-amber-subtle);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
    border-radius: var(--radius-sm);
  }

  .finals-banner :global(.flame-icon) {
    color: var(--accent-amber);
  }

  .finals-text {
    display: flex;
    flex-direction: column;
  }

  .finals-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-amber-ink);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .finals-desc {
    font-size: 10px;
    color: var(--ink-muted);
  }

  .rail-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: var(--grid-2);
    border-top: 1px solid var(--border-subtle);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .section-title {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-muted);
  }

  .mini-add-btn {
    padding: 2px;
    min-width: 20px;
    min-height: 20px;
    border-radius: var(--radius-xs);
  }

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .course-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .course-item:hover {
    background: var(--bg-hover);
    color: var(--ink-primary);
  }

  .course-color {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
  }

  .course-code {
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    flex: 1;
  }

  .multiplier-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 9.5px;
    font-family: var(--font-mono);
    font-weight: 700;
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .empty-hint {
    font-size: 11px;
    color: var(--ink-muted);
    font-style: italic;
    padding: 4px 8px;
  }

  /* Rail Bottom: Mini Pomodoro Dock */
  .rail-bottom {
    padding-top: var(--grid-3);
    border-top: 1px solid var(--border-subtle);
  }

  .mini-timer-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }

  .mini-timer-card.paused {
    opacity: 0.85;
    border-style: dashed;
  }

  .mini-timer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mini-ring {
    width: 28px;
    height: 28px;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: var(--border-subtle);
    stroke-width: 3;
  }

  .ring-progress {
    fill: none;
    stroke: var(--accent-emerald);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 300ms ease;
  }

  .mini-timer-info {
    display: flex;
    flex-direction: column;
  }

  .mini-timer-mode {
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .mini-timer-digits {
    font-family: var(--font-mono);
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink-primary);
  }

  .mini-timer-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .mini-btn {
    padding: 5px;
    min-width: 26px;
    min-height: 26px;
    border-radius: var(--radius-xs);
  }

  .confirming-active {
    background: var(--accent-crimson) !important;
    color: #FFFFFF !important;
    border-color: var(--accent-crimson) !important;
  }

  .quick-focus-btn {
    width: 100%;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-primary);
    font-size: 12.5px;
    font-weight: 600;
    gap: 8px;
  }

  .quick-focus-btn:hover {
    background: var(--bg-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
  }
</style>
