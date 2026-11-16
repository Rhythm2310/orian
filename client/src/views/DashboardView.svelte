<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    ShieldCheck,
    ShieldAlert,
    ClockAlert,
    Play,
    CheckCircle2,
    CalendarPlus,
    Sparkles,
    Flame
  } from '@lucide/svelte';

  import EffortSplitBar from '../components/EffortSplitBar.svelte';
  import ExamRadar from '../components/ExamRadar.svelte';
  import CrunchDeficitAlert from '../components/CrunchDeficitAlert.svelte';

  async function launchPomodoroForClass(cls) {
    await api.startPomodoro({
      course_id: cls.course_id,
      class_id: cls.id,
      session_mode: 'recovery',
      target_duration_seconds: 1500,
      notes: `Reviewing: ${cls.title || 'Lecture ' + cls.lecture_number}`
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }

  async function markClassReviewed(cls) {
    await api.markClassReviewed(cls.id);
    store.showToast(`Lecture marked as reviewed. Shield secured!`);
    await store.refreshSnapshot();
  }

  function getCourse(courseId) {
    return (store.snapshot?.courses || []).find(c => c.id === courseId) || { code: courseId, color: '#1A6B4E' };
  }
</script>

<div class="stage-content">
  <!-- Today's Header & Quote Banner -->
  <div class="dashboard-header">
    <div class="header-left">
      <h1>Today's Battle Plan</h1>
      <p class="academic-date-label">
        Academic Day: <span class="tabular-nums font-mono">{store.snapshot?.academicDate}</span>
        {#if store.snapshot?.settings?.finals_prep_mode}
          · <span class="finals-badge">Finals Prep Mode</span>
        {/if}
      </p>
    </div>

    {#if store.snapshot?.quote}
      <div class="quote-card">
        <Sparkles size={14} strokeWidth={1.75} class="quote-sparkle" />
        <span class="quote-text">"{store.snapshot.quote.text}"</span>
      </div>
    {/if}
  </div>

  <!-- Capacity Crunch Deficit Alert -->
  {#if store.snapshot?.deficit}
    <CrunchDeficitAlert deficit={store.snapshot.deficit} />
  {/if}

  <!-- Exam Radar Strip -->
  <ExamRadar
    exams={store.snapshot?.upcomingExams || []}
    courses={store.snapshot?.courses || []}
    unwatchedLectures={store.snapshot?.unwatchedLectures || []}
  />

  <!-- Effort Split Bar -->
  <EffortSplitBar
    allocation={store.snapshot?.allocation}
    courses={store.snapshot?.courses || []}
  />

  <!-- Today's Classes & Shields -->
  <section class="plan-section">
    <div class="section-heading">
      <div class="heading-title">
        <ShieldCheck size={18} strokeWidth={1.75} class="section-icon" />
        <h2>Today's Live Class Shields</h2>
      </div>
      <button class="ghost mini-action-btn" onclick={() => store.openDisruptionModal()}>
        <CalendarPlus size={14} strokeWidth={1.75} />
        <span>Report Disruption / Makeup</span>
      </button>
    </div>

    {#if store.snapshot?.todayClasses?.length}
      <div class="classes-grid">
        {#each store.snapshot.todayClasses as cls}
          {@const crs = getCourse(cls.course_id)}
          <div class="class-card {cls.status} {cls.is_crunch_deferred ? 'deferred' : ''}">
            <div class="card-left">
              <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
                {crs.code}
              </span>
              <div class="class-info">
                <div class="class-title">
                  {cls.title || `Lecture ${cls.lecture_number}`}
                  {#if cls.is_makeup}
                    <span class="tag tag-amber">Off-Day Makeup</span>
                  {/if}
                  {#if cls.status === 'online_recorded'}
                    <span class="tag tag-blue">Online / Recorded</span>
                  {/if}
                </div>
                <div class="class-time tabular-nums">
                  {cls.start_time || '09:00'} – {cls.end_time || '10:30'}
                </div>
              </div>
            </div>

            <div class="card-right">
              {#if cls.is_crunch_deferred}
                <div class="deferral-pill" title="Unrelated lecture postponed to protect imminent exam">
                  <ClockAlert size={13} strokeWidth={1.75} />
                  <span>Exam Crunch Deferred</span>
                </div>
              {:else if cls.status === 'reviewed'}
                <div class="shield-secured-badge">
                  <CheckCircle2 size={14} strokeWidth={1.75} />
                  <span>Shield Secured</span>
                </div>
              {:else}
                <button class="primary action-btn" onclick={() => launchPomodoroForClass(cls)}>
                  <Play size={13} strokeWidth={1.75} />
                  <span>Review Shield (25m)</span>
                </button>
                <button class="ghost action-btn" onclick={() => markClassReviewed(cls)}>
                  Mark Done
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No live classes scheduled for today. Devote full effort to backlog recovery and exam prep.</p>
      </div>
    {/if}
  </section>

  <!-- Priority Backlog Recovery Queue Preview -->
  <section class="plan-section">
    <div class="section-heading">
      <div class="heading-title">
        <Flame size={18} strokeWidth={1.75} class="section-icon" />
        <h2>High-Priority Backlog Recovery</h2>
      </div>
      <button class="ghost mini-action-btn" onclick={() => store.setView('queue')}>
        <span>View Full Queue ({store.snapshot?.unwatchedLectures?.length || 0})</span>
      </button>
    </div>

    {#if store.snapshot?.unwatchedLectures?.length}
      <div class="backlog-preview-list">
        {#each store.snapshot.unwatchedLectures.slice(0, 4) as lecture}
          {@const crs = getCourse(lecture.course_id)}
          <div class="backlog-row">
            <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
              {crs.code}
            </span>
            <div class="backlog-desc">
              <span class="backlog-title">{lecture.title || `Class Lecture ${lecture.lecture_number}`}</span>
              <span class="backlog-date tabular-nums">{lecture.date}</span>
            </div>
            <button class="primary action-btn" onclick={() => launchPomodoroForClass(lecture)}>
              <Play size={13} strokeWidth={1.75} />
              <span>Recover (25m)</span>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>Zero backlog debt! All semester lectures are reviewed and up to date.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .academic-date-label {
    font-size: 13px;
    color: var(--ink-secondary);
  }

  .font-mono {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .finals-badge {
    font-weight: 700;
    color: var(--accent-amber);
  }

  .quote-card {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    max-width: 460px;
    box-shadow: var(--shadow-sm);
  }

  :global(.quote-sparkle) {
    color: var(--accent-amber);
    flex-shrink: 0;
  }

  .quote-text {
    font-size: 12px;
    font-style: italic;
    color: var(--ink-secondary);
    line-height: 1.4;
  }

  .plan-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .heading-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  :global(.section-icon) {
    color: var(--accent-emerald);
  }

  .mini-action-btn {
    font-size: 12px;
    padding: 4px 8px;
    color: var(--ink-secondary);
  }

  .classes-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .class-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    box-shadow: var(--shadow-sm);
  }

  .class-card.deferred {
    border-color: var(--accent-amber);
    background: var(--accent-amber-subtle);
  }

  .class-card.reviewed {
    opacity: 0.8;
    background: var(--bg-subtle);
  }

  .card-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .course-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: #FFFFFF;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
  }

  .class-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .class-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .class-time {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .card-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .deferral-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    color: var(--accent-amber-ink);
    border: 1px solid var(--accent-amber);
  }

  .shield-secured-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-emerald-ink);
  }

  .action-btn {
    padding: 5px 10px;
    font-size: 12px;
  }

  .backlog-preview-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .backlog-row {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .backlog-desc {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .backlog-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .backlog-date {
    font-size: 11px;
    color: var(--ink-muted);
  }

  .empty-state {
    background: var(--bg-surface);
    border: 1px dashed var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 24px;
    text-align: center;
    color: var(--ink-muted);
    font-size: 13px;
  }
</style>
