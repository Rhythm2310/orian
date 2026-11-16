<script>
  import { onDestroy, onMount } from 'svelte';
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    playFocusStartChime,
    playCompletionBell,
    playBreakBell
  } from '../lib/audio.js';
  import {
    Play,
    Pause,
    Square,
    RotateCcw,
    Sparkles,
    GraduationCap,
    BookOpen,
    CheckCircle2
  } from '@lucide/svelte';

  let timerInterval = null;
  let sessionNotes = $state('');
  let selectedMode = $state('focus'); // 'focus' | 'exam_prep' | 'recovery'
  let selectedCourseId = $state('');
  let customDurationMinutes = $state(25);

  let active = $derived(store.activeTimer);

  function formatTime(totalSeconds) {
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

  async function handleAutoCompletion() {
    playCompletionBell(store.chimesEnabled);
    await api.completePomodoro({ notes: sessionNotes });
    store.showToast('Pomodoro focus block completed! Take a 5m break.');
    sessionNotes = '';
    await store.refreshSnapshot();
  }

  async function startTimer() {
    playFocusStartChime(store.chimesEnabled);
    const targetSeconds = customDurationMinutes * 60;
    await api.startPomodoro({
      course_id: selectedCourseId || (store.snapshot?.courses?.[0]?.id || null),
      session_mode: selectedMode,
      target_duration_seconds: targetSeconds,
      notes: sessionNotes
    });
    await store.refreshSnapshot();
  }

  async function pauseTimer() {
    await api.pausePomodoro();
    await store.refreshSnapshot();
  }

  async function resumeTimer() {
    await api.resumePomodoro();
    await store.refreshSnapshot();
  }

  async function completeTimer() {
    playCompletionBell(store.chimesEnabled);
    await api.completePomodoro({ notes: sessionNotes });
    store.showToast('Block recorded successfully.');
    sessionNotes = '';
    await store.refreshSnapshot();
  }

  let confirmingDiscard = $state(false);
  let discardTimeout = null;

  async function cancelTimer() {
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
    store.showToast('Timer reset.');
    await store.refreshSnapshot();
  }

  function getCourse(courseId) {
    return (store.snapshot?.courses || []).find(c => c.id === courseId) || { code: courseId || 'Focus', color: '#1A6B4E' };
  }
</script>

<div class="stage-content">
  <div class="studio-header">
    <div>
      <h1>Pomodoro Focus Studio</h1>
      <p>Deliberate single-task execution. Wall-clock resilient across sleep, suspension, and restarts.</p>
    </div>
  </div>

  <div class="studio-layout">
    <!-- Center Focus Dial -->
    <div class="focus-dial-card">
      <div class="dial-container">
        <!-- SVG Progress Ring -->
        <svg class="progress-ring" viewBox="0 0 240 240">
          <circle
            class="ring-bg"
            cx="120"
            cy="120"
            r="105"
            stroke-width="8"
          />
          <circle
            class="ring-indicator"
            cx="120"
            cy="120"
            r="105"
            stroke-width="8"
            style="stroke-dasharray: 660; stroke-dashoffset: {
              active
                ? 660 * (1 - (active.remainingSeconds / (active.target_duration_seconds || 1500)))
                : 0
            }"
          />
        </svg>

        <div class="dial-center">
          <span class="mode-tag">
            {active ? (active.session_mode === 'exam_prep' ? 'Exam Revision' : 'Focus Session') : 'Ready to Start'}
          </span>
          <span class="time-display tabular-nums">
            {active ? formatTime(active.remainingSeconds) : `${customDurationMinutes}:00`}
          </span>
          {#if active?.course_id}
            {@const crs = getCourse(active.course_id)}
            <span class="active-course-tag" style="color: {crs.color || '#1A6B4E'}">
              {crs.code}
            </span>
          {/if}
        </div>
      </div>

      <!-- Controls -->
      <div class="dial-controls">
        {#if !active}
          <button class="primary launch-btn" onclick={startTimer}>
            <Play size={18} strokeWidth={1.75} />
            <span>Begin {customDurationMinutes}m Focus Block</span>
          </button>
        {:else if active.status === 'running'}
          <button class="ghost control-btn" onclick={pauseTimer} title="Pause">
            <Pause size={18} strokeWidth={1.75} />
            <span>Pause</span>
          </button>
          <button class="primary control-btn" onclick={completeTimer} title="Complete">
            <CheckCircle2 size={18} strokeWidth={1.75} />
            <span>Complete</span>
          </button>
          <button
            class="ghost control-btn danger {confirmingDiscard ? 'confirming-active' : ''}"
            onclick={cancelTimer}
            title={confirmingDiscard ? 'Click again to discard timer' : 'Discard'}
          >
            {#if confirmingDiscard}
              <span>Confirm Discard?</span>
            {:else}
              <Square size={18} strokeWidth={1.75} />
            {/if}
          </button>
        {:else if active.status === 'paused'}
          <button class="primary control-btn" onclick={resumeTimer} title="Resume">
            <Play size={18} strokeWidth={1.75} />
            <span>Resume</span>
          </button>
          <button class="ghost control-btn" onclick={completeTimer} title="Complete">
            <CheckCircle2 size={18} strokeWidth={1.75} />
            <span>Complete</span>
          </button>
          <button
            class="ghost control-btn danger {confirmingDiscard ? 'confirming-active' : ''}"
            onclick={cancelTimer}
            title={confirmingDiscard ? 'Click again to discard timer' : 'Discard'}
          >
            {#if confirmingDiscard}
              <span>Confirm Discard?</span>
            {:else}
              <Square size={18} strokeWidth={1.75} />
            {/if}
          </button>
        {/if}
      </div>
    </div>

    <!-- Right Configuration & Notes Panel -->
    <div class="studio-side-panel">
      {#if !active}
        <div class="side-card">
          <h3>Session Setup</h3>

          <div class="form-group">
            <label for="pomo-mode">Session Mode</label>
            <select id="pomo-mode" bind:value={selectedMode}>
              <option value="focus">Regular Focus Block</option>
              <option value="exam_prep">Exam Prep & Revision</option>
              <option value="recovery">Backlog Lecture Recovery</option>
            </select>
          </div>

          <div class="form-group">
            <label for="pomo-course">Bound Course</label>
            <select id="pomo-course" bind:value={selectedCourseId}>
              {#each store.snapshot?.courses || [] as crs}
                <option value={crs.id}>{crs.code} — {crs.name}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="pomo-dur">Block Duration</label>
            <div class="duration-pills">
              {#each [15, 25, 45, 50] as dur}
                <button
                  type="button"
                  class="dur-pill {customDurationMinutes === dur ? 'active' : ''}"
                  onclick={() => customDurationMinutes = dur}
                >
                  {dur}m
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Session Notes -->
      <div class="side-card">
        <h3>Session Notes & Deliverable</h3>
        <textarea
          rows="4"
          placeholder="What specific problem, derivation, or lecture chunk are you solving in this block?"
          bind:value={sessionNotes}
        ></textarea>
      </div>

      <!-- Quote -->
      {#if store.snapshot?.quote}
        <div class="side-quote-card">
          <Sparkles size={16} strokeWidth={1.75} class="quote-sparkle" />
          <p class="quote-text">"{store.snapshot.quote.text}"</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .studio-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .studio-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 24px;
    align-items: start;
  }

  .focus-dial-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    box-shadow: var(--shadow-sm);
  }

  .dial-container {
    position: relative;
    width: 240px;
    height: 240px;
  }

  .progress-ring {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: var(--bg-subtle);
  }

  .ring-indicator {
    fill: none;
    stroke: var(--accent-emerald);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.8s ease;
  }

  .dial-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .mode-tag {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-muted);
  }

  .time-display {
    font-family: var(--font-mono);
    font-size: 42px;
    font-weight: 700;
    color: var(--ink-primary);
    line-height: 1;
  }

  .active-course-tag {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
  }

  .dial-controls {
    display: flex;
    gap: 12px;
    width: 100%;
    max-width: 320px;
  }

  .launch-btn {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    border-radius: var(--radius-sm);
  }

  .control-btn {
    flex: 1;
    padding: 10px;
  }

  .control-btn.danger.confirming-active {
    background: var(--accent-crimson-subtle);
    border-color: var(--accent-crimson);
    color: var(--accent-crimson-ink);
    font-size: 11px;
    font-weight: 700;
  }

  .studio-side-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .side-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-sm);
  }

  .side-card h3 {
    font-size: 14px;
    font-weight: 600;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .duration-pills {
    display: flex;
    gap: 8px;
  }

  .dur-pill {
    flex: 1;
    padding: 6px;
    font-size: 12px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .dur-pill.active {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 700;
  }

  .side-quote-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    display: flex;
    gap: 10px;
    box-shadow: var(--shadow-sm);
  }

  .quote-text {
    font-size: 12px;
    font-style: italic;
    color: var(--ink-secondary);
    line-height: 1.45;
  }
</style>
