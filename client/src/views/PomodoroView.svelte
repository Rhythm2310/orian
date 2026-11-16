<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import {
    playFocusStartChime,
    playCompletionBell,
    playBreakBell
  } from '../lib/audio.ts';
  import {
    Play,
    Pause,
    Square,
    RotateCcw,
    Sparkles,
    GraduationCap,
    BookOpen,
    CheckCircle2,
    Volume2,
    VolumeX,
    Flame
  } from '@lucide/svelte';
  import type { PomodoroMode, Course, Assessment } from '../lib/types.ts';

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let sessionNotes = $state<string>('');
  let selectedMode = $state<PomodoroMode>('free_focus');
  let selectedCourseId = $state<string>('');
  let customDurationMinutes = $state<number>(25);

  const active = $derived(store.activeTimer);

  function formatTime(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  onMount(() => {
    // Wall-clock ticker
    timerInterval = setInterval(() => {
      if (store.activeTimer && store.activeTimer.status === 'running') {
        const elapsed = Math.floor((Date.now() - store.activeTimer.started_at) / 1000);
        const target = store.activeTimer.target_duration_seconds || 1500;
        const remaining = Math.max(0, target - elapsed);

        store.activeTimer.elapsedSeconds = elapsed;
        store.activeTimer.remainingSeconds = remaining;

        if (remaining <= 0) {
          handleAutoCompletion();
        }
      }
    }, 1000);
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  async function handleAutoCompletion(): Promise<void> {
    playCompletionBell(store.chimesEnabled);
    await api.completePomodoro({ notes: sessionNotes });
    store.showToast('Pomodoro focus block completed! Take a 5m break.');
    sessionNotes = '';
    await store.refreshSnapshot();
  }

  async function startTimer(): Promise<void> {
    playFocusStartChime(store.chimesEnabled);
    await api.startPomodoro({
      course_id: selectedCourseId || (store.snapshot?.courses?.[0]?.id || null),
      mode: selectedMode,
      durationMinutes: customDurationMinutes
    });
    await store.refreshSnapshot();
  }

  async function pauseTimer(): Promise<void> {
    await api.pausePomodoro();
    await store.refreshSnapshot();
  }

  async function resumeTimer(): Promise<void> {
    await api.resumePomodoro();
    await store.refreshSnapshot();
  }

  async function completeTimer(): Promise<void> {
    playCompletionBell(store.chimesEnabled);
    await api.completePomodoro({ notes: sessionNotes });
    store.showToast('Block recorded successfully.');
    sessionNotes = '';
    await store.refreshSnapshot();
  }

  let confirmingDiscard = $state<boolean>(false);
  let discardTimeout: ReturnType<typeof setTimeout> | null = null;

  async function cancelTimer(): Promise<void> {
    if (!confirmingDiscard) {
      confirmingDiscard = true;
      if (discardTimeout) clearTimeout(discardTimeout);
      discardTimeout = setTimeout(() => {
        confirmingDiscard = false;
      }, 4000);
      return;
    }
    confirmingDiscard = false;
    if (discardTimeout) clearTimeout(discardTimeout);
    await api.cancelPomodoro();
    store.showToast('Session cancelled.');
    await store.refreshSnapshot();
  }

  const ringRadius = 108;
  const circumference = 2 * Math.PI * ringRadius;

  const progress = $derived.by(() => {
    if (!active) return 0;
    const target = active.target_duration_seconds || 1500;
    const remaining = active.remainingSeconds ?? 0;
    const elapsed = Math.max(0, target - remaining);
    return Math.min(1, elapsed / target);
  });

  function getActiveCourse(): Pick<Course, 'code' | 'name' | 'color'> | null {
    if (!active || !active.course_id) return null;
    const found = (store.snapshot?.courses || []).find(c => c.id === active.course_id);
    return found ? { code: found.code, name: found.name, color: found.color } : null;
  }
</script>

<div class="stage-content focus-studio-stage">
  <!-- Focal Focus Stage (Golden Spiral Center) -->
  <div class="focus-arena">
    <!-- Focal SVG Progress Ring (1500 DPI Subpixel Crisp Anti-Aliasing) -->
    <div class="ring-container">
      <svg class="progress-ring-svg" viewBox="0 0 240 240" aria-hidden="true">
        <circle
          class="ring-track"
          cx="120"
          cy="120"
          r={ringRadius}
        />
        <circle
          class="ring-fill"
          cx="120"
          cy="120"
          r={ringRadius}
          stroke-dasharray={circumference}
          stroke-dashoffset={circumference * (1 - progress)}
        />
      </svg>

      <!-- Center Clock Display (Tabular Numerics) -->
      <div class="timer-center-content">
        {#if active}
          <div class="active-badge-row">
            {#if getActiveCourse()}
              {@const crs = getActiveCourse()!}
              <span class="course-pill font-mono" style="background: {crs.color || '#1A6B4E'};">
                {crs.code}
              </span>
            {/if}
            <span class="mode-tag tag tag-emerald">
              {active.mode === 'exam_revision' ? 'Exam Revision' : active.mode === 'lecture_recovery' ? 'Lecture Recovery' : 'Deep Focus'}
            </span>
          </div>

          <div class="timer-clock-digits tabular-nums">
            {formatTime(active.remainingSeconds ?? active.target_duration_seconds)}
          </div>

          <div class="timer-state-label">
            {#if active.status === 'running'}
              <span class="pulse-indicator"></span> Focus block running
            {:else if active.status === 'paused'}
              <span class="paused-indicator"></span> Timer paused (Press Space to resume)
            {:else}
              Block ready
            {/if}
          </div>
        {:else}
          <div class="idle-clock tabular-nums">
            {String(customDurationMinutes).padStart(2, '0')}:00
          </div>
          <div class="idle-label">Ready to Focus</div>
        {/if}
      </div>
    </div>

    <!-- Timer Primary Control Buttons -->
    <div class="timer-controls-row">
      {#if active}
        {#if active.status === 'running'}
          <button
            type="button"
            class="control-btn ghost-control"
            onclick={pauseTimer}
            title="Pause timer (Space)"
            aria-label="Pause timer"
          >
            <Pause size={18} strokeWidth={2} />
            <span>Pause</span>
          </button>
        {:else}
          <button
            type="button"
            class="control-btn primary-control"
            onclick={resumeTimer}
            title="Resume focus timer (Space)"
            aria-label="Resume timer"
          >
            <Play size={18} strokeWidth={2} />
            <span>Resume</span>
          </button>
        {/if}

        <button
          type="button"
          class="control-btn primary-control"
          onclick={completeTimer}
          title="Complete and log this focus block"
          aria-label="Complete focus block"
        >
          <CheckCircle2 size={18} strokeWidth={2} />
          <span>Finish Block</span>
        </button>

        <button
          type="button"
          class="control-btn discard-control {confirmingDiscard ? 'confirming' : ''}"
          onclick={cancelTimer}
          title={confirmingDiscard ? 'Click again to confirm discard' : 'Discard session'}
          aria-label="Discard session"
        >
          <RotateCcw size={16} strokeWidth={1.75} />
          <span>{confirmingDiscard ? 'Confirm Discard' : 'Discard'}</span>
        </button>
      {:else}
        <button
          type="button"
          class="control-btn primary-control launch-btn"
          onclick={startTimer}
          title="Start 25m Focus Block"
        >
          <Play size={18} strokeWidth={2.2} />
          <span>Start Focus Block</span>
        </button>
      {/if}
    </div>

    <!-- Active Timer Notes -->
    {#if active}
      <div class="session-notes-box surface-card">
        <label for="pomo-notes" class="notes-label">Session Notes / Task Focus</label>
        <input
          id="pomo-notes"
          type="text"
          placeholder="e.g. Practicing MATH204 CT 2 questions 1-5..."
          bind:value={sessionNotes}
        />
      </div>
    {/if}

    <!-- Setup Options When Idle -->
    {#if !active}
      <div class="idle-config-card surface-card leading-line">
        <div class="config-grid">
          <div class="config-col">
            <span class="col-title">Focus Mode</span>
            <div class="mode-pills">
              <button
                type="button"
                class="mode-btn {selectedMode === 'free_focus' ? 'active' : ''}"
                onclick={() => selectedMode = 'free_focus'}
              >
                <Sparkles size={13} strokeWidth={2} />
                <span>Free Focus</span>
              </button>
              <button
                type="button"
                class="mode-btn {selectedMode === 'exam_revision' ? 'active' : ''}"
                onclick={() => selectedMode = 'exam_revision'}
              >
                <GraduationCap size={13} strokeWidth={2} />
                <span>Exam Prep</span>
              </button>
              <button
                type="button"
                class="mode-btn {selectedMode === 'lecture_recovery' ? 'active' : ''}"
                onclick={() => selectedMode = 'lecture_recovery'}
              >
                <BookOpen size={13} strokeWidth={2} />
                <span>Lecture Recovery</span>
              </button>
            </div>
          </div>

          <div class="config-col">
            <span class="col-title">Target Course</span>
            <select bind:value={selectedCourseId} aria-label="Select Target Course">
              <option value="">General Focus (No Course)</option>
              {#each store.snapshot?.courses || [] as crs (crs.id)}
                <option value={crs.id}>{crs.code} — {crs.name}</option>
              {/each}
            </select>
          </div>

          <div class="config-col">
            <span class="col-title">Duration</span>
            <div class="duration-pills">
              {#each [15, 25, 45, 60] as mins}
                <button
                  type="button"
                  class="dur-pill {customDurationMinutes === mins ? 'active' : ''}"
                  onclick={() => customDurationMinutes = mins}
                >
                  {mins}m
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .focus-studio-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: var(--grid-6);
  }

  .focus-arena {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--grid-6);
    max-width: 580px;
    width: 100%;
  }

  /* Ring Container & Clock Display */
  .ring-container {
    position: relative;
    width: 250px;
    height: 250px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .progress-ring-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: var(--bg-subtle);
    stroke-width: 6;
  }

  .ring-fill {
    fill: none;
    stroke: var(--accent-emerald);
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 400ms ease;
  }

  .timer-center-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    z-index: 10;
  }

  .active-badge-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .course-pill {
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: var(--radius-xs);
  }

  .timer-clock-digits {
    font-family: var(--font-mono);
    font-size: 42px;
    font-weight: 700;
    color: var(--ink-primary);
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .timer-state-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--ink-muted);
  }

  .pulse-indicator {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
    box-shadow: 0 0 0 2px var(--accent-emerald-subtle);
  }

  .paused-indicator {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent-amber);
  }

  .idle-clock {
    font-family: var(--font-mono);
    font-size: 40px;
    font-weight: 700;
    color: var(--ink-muted);
    line-height: 1;
  }

  .idle-label {
    font-size: 12px;
    color: var(--ink-muted);
    font-weight: 500;
  }

  /* Control Buttons */
  .timer-controls-row {
    display: flex;
    align-items: center;
    gap: var(--grid-3);
  }

  .control-btn {
    padding: 9px 18px;
    font-size: 13.5px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    gap: 8px;
  }

  .primary-control {
    background: var(--accent-emerald);
    color: #FFFFFF;
    border-color: var(--accent-emerald);
  }

  .primary-control:hover {
    background: #14553E;
    border-color: #14553E;
  }

  .ghost-control {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-primary);
  }

  .discard-control {
    background: transparent;
    border-color: transparent;
    color: var(--ink-muted);
  }

  .discard-control:hover {
    background: var(--bg-hover);
    color: var(--accent-crimson);
  }

  .discard-control.confirming {
    background: var(--accent-crimson) !important;
    color: #FFFFFF !important;
  }

  .launch-btn {
    padding: 11px 28px;
    font-size: 15px;
    border-radius: var(--radius-md);
  }

  /* Notes & Setup Cards */
  .session-notes-box {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--grid-3) var(--grid-4);
  }

  .notes-label {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-muted);
  }

  .idle-config-card {
    width: 100%;
    padding: var(--grid-4);
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--grid-4);
  }

  .config-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .col-title {
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-muted);
  }

  .mode-pills {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .mode-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    font-size: 11px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
    justify-content: flex-start;
  }

  .mode-btn.active {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 600;
  }

  .duration-pills {
    display: flex;
    gap: 4px;
  }

  .dur-pill {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    padding: 5px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .dur-pill.active {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 700;
  }

  @media (max-width: 640px) {
    .config-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
