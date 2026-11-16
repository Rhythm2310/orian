<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
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
    BookMarked,
    Plus
  } from '@lucide/svelte';

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function toggleTimer() {
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
  let stopTimeout = null;

  async function stopTimer() {
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
</script>

<aside class="left-rail">
  <div class="rail-top">
    <!-- Main Route Navigation -->
    <nav class="nav-links" aria-label="Main Navigation">
      <button
        class="nav-item {store.currentView === 'dashboard' ? 'active' : ''}"
        onclick={() => store.setView('dashboard')}
      >
        <LayoutDashboard size={16} strokeWidth={1.75} />
        <span>Today's Plan</span>
      </button>

      <button
        class="nav-item {store.currentView === 'queue' ? 'active' : ''}"
        onclick={() => store.setView('queue')}
      >
        <ListTodo size={16} strokeWidth={1.75} />
        <span>Recovery Queue</span>
        {#if store.snapshot?.unwatchedLectures?.length}
          <span class="count-badge tabular-nums">
            {store.snapshot.unwatchedLectures.length}
          </span>
        {/if}
      </button>

      <button
        class="nav-item {store.currentView === 'routine' ? 'active' : ''}"
        onclick={() => store.setView('routine')}
      >
        <CalendarDays size={16} strokeWidth={1.75} />
        <span>Routine & Exams</span>
        {#if store.snapshot?.upcomingExams?.length}
          <span class="exam-dot" title="Upcoming Exams"></span>
        {/if}
      </button>

      <button
        class="nav-item {store.currentView === 'pomodoro' ? 'active' : ''}"
        onclick={() => store.setView('pomodoro')}
      >
        <Timer size={16} strokeWidth={1.75} />
        <span>Pomodoro Focus</span>
      </button>

      <button
        class="nav-item {store.currentView === 'settings' ? 'active' : ''}"
        onclick={() => store.setView('settings')}
      >
        <Settings size={16} strokeWidth={1.75} />
        <span>Settings & A11y</span>
      </button>
    </nav>

    <!-- Enrolled Courses Section -->
    <div class="rail-section">
      <div class="section-header">
        <span class="section-title">Courses</span>
        <button
          class="ghost mini-add-btn"
          onclick={() => store.setView('routine')}
          title="Manage Courses"
        >
          <Plus size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div class="course-list">
        {#if store.snapshot?.courses?.length}
          {#each store.snapshot.courses as course}
            <div class="course-item">
              <span class="course-color" style="background: {course.color || '#1A6B4E'}"></span>
              <span class="course-code">{course.code}</span>
              {#if course.effort_multiplier > 1.0}
                <span class="multiplier-pill">{course.effort_multiplier}x</span>
              {/if}
            </div>
          {/each}
        {:else}
          <div class="empty-hint">No courses yet</div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Pinned Mini Pomodoro Dock -->
  <div class="rail-bottom">
    {#if store.activeTimer}
      <div class="mini-timer-card {store.activeTimer.status}">
        <div class="mini-timer-header">
          <span class="mini-timer-mode">
            {store.activeTimer.session_mode === 'exam_prep' ? 'Exam Prep' : 'Focus Block'}
          </span>
          <span class="mini-timer-digits tabular-nums">
            {formatTime(store.activeTimer.remainingSeconds || 0)}
          </span>
        </div>

        <div class="mini-timer-actions">
          <button class="primary mini-btn" onclick={toggleTimer} title="Pause or Resume">
            {#if store.activeTimer.status === 'running'}
              <Pause size={13} strokeWidth={1.75} />
            {:else}
              <Play size={13} strokeWidth={1.75} />
            {/if}
          </button>
          <button
            class="ghost mini-btn {confirmingStop ? 'confirming-active' : ''}"
            onclick={stopTimer}
            title={confirmingStop ? 'Click again to confirm completion' : 'Complete Block'}
          >
            {#if confirmingStop}
              <Check size={13} strokeWidth={2} />
            {:else}
              <Square size={13} strokeWidth={1.75} />
            {/if}
          </button>
        </div>
      </div>
    {:else}
      <button
        class="quick-focus-btn"
        onclick={() => store.setView('pomodoro')}
      >
        <Play size={14} strokeWidth={1.75} />
        <span>Start 25m Focus Block</span>
      </button>
    {/if}
  </div>
</aside>

<style>
  .rail-top {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .nav-links {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid transparent;
    color: var(--ink-secondary);
    font-size: 13px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--ink-primary);
  }

  .nav-item.active {
    background: var(--bg-surface);
    color: var(--ink-primary);
    border-color: var(--border-subtle);
    box-shadow: var(--shadow-sm);
    font-weight: 600;
  }

  .count-badge {
    margin-left: auto;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
    border: 1px solid var(--accent-amber);
    font-weight: 600;
  }

  .exam-dot {
    margin-left: auto;
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent-crimson);
  }

  .rail-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-subtle);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-muted);
  }

  .mini-add-btn {
    padding: 2px 4px;
    border-radius: var(--radius-xs);
    color: var(--ink-muted);
  }

  .course-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .course-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    color: var(--ink-primary);
  }

  .course-color {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  .course-code {
    font-family: var(--font-mono);
    font-weight: 500;
  }

  .multiplier-pill {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .empty-hint {
    font-size: 12px;
    color: var(--ink-muted);
    padding: 4px;
  }

  .rail-bottom {
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .mini-timer-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: var(--shadow-sm);
  }

  .mini-timer-card.running {
    border-color: var(--accent-emerald);
  }

  .mini-timer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mini-timer-mode {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--ink-secondary);
  }

  .mini-timer-digits {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    color: var(--accent-emerald);
  }

  .mini-timer-actions {
    display: flex;
    gap: 6px;
  }

  .mini-btn {
    flex: 1;
    padding: 4px;
  }

  .mini-btn.confirming-active {
    background: var(--accent-amber-subtle);
    border-color: var(--accent-amber);
    color: var(--accent-amber-ink);
  }

  .quick-focus-btn {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-primary);
    justify-content: center;
  }

  .quick-focus-btn:hover {
    background: var(--bg-subtle);
    border-color: var(--border-strong);
  }
</style>
