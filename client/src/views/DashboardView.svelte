<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { playSuccessChime } from '../lib/audio.ts';
  import {
    ShieldCheck,
    ClockAlert,
    Play,
    CheckCircle2,
    CalendarPlus,
    Sparkles,
    Flame,
    ArrowRight,
    GraduationCap
  } from '@lucide/svelte';

  import EffortSplitBar from '../components/EffortSplitBar.svelte';
  import ExamRadar from '../components/ExamRadar.svelte';
  import CrunchDeficitAlert from '../components/CrunchDeficitAlert.svelte';
  import type { ClassSession, Course, Assessment } from '../lib/types.ts';

  async function launchPomodoroForExam(exam: Assessment): Promise<void> {
    await api.startPomodoro({
      course_id: exam.course_id,
      assessment_id: exam.id,
      mode: 'exam_revision',
      durationMinutes: 25
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }

  async function launchPomodoroForClass(cls: ClassSession): Promise<void> {
    await api.startPomodoro({
      course_id: cls.course_id,
      class_id: cls.id,
      mode: 'lecture_recovery',
      durationMinutes: 25
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }

  async function markClassReviewed(cls: ClassSession): Promise<void> {
    playSuccessChime(store.chimesEnabled);
    await api.markClassReviewed(cls.id);
    store.showToast('Lecture marked as reviewed. Shield secured!');
    await store.refreshSnapshot();
  }

  function getCourse(courseId: string): Pick<Course, 'code' | 'color'> {
    const found = (store.snapshot?.courses || []).find(c => c.id === courseId);
    return found ? { code: found.code, color: found.color } : { code: courseId, color: '#1A6B4E' };
  }
</script>

<div class="stage-content">
  <!-- Top Section: Academic Day Status & Contextual Offline Quote (Z-Pattern Flow) -->
  <div class="dashboard-header">
    <div class="header-left">
      <h1>Today's Battle Plan</h1>
      <p class="academic-date-label">
        Academic Day: <span class="tabular-nums font-mono">{store.snapshot?.academicDate || 'Today'}</span>
        {#if store.snapshot?.settings?.finals_prep_mode}
          · <span class="tag tag-amber">Finals Prep Mode</span>
        {/if}
      </p>
    </div>

    {#if store.snapshot?.quote}
      <div class="quote-card surface-card" title="Offline study mindset quote">
        <Sparkles size={14} strokeWidth={2} class="quote-sparkle" />
        <span class="quote-text">"{store.snapshot.quote.text}"</span>
      </div>
    {/if}
  </div>

  <!-- Capacity Crunch Deficit Alert -->
  {#if store.snapshot?.capacityDeficit}
    <CrunchDeficitAlert deficit={store.snapshot.capacityDeficit} />
  {/if}

  <!-- Exam Radar & Proportional Reallocation Bar (Rule of Thirds Upper Focal Plane) -->
  <ExamRadar
    exams={store.snapshot?.upcomingExams || []}
    courses={store.snapshot?.courses || []}
    unwatchedLectures={store.snapshot?.unwatchedLectures || []}
  />

  <EffortSplitBar
    allocation={store.snapshot?.allocation}
    courses={store.snapshot?.courses || []}
  />

  <!-- Today's Live Class Shields -->
  <section class="plan-section surface-card leading-line" aria-label="Today's Live Classes">
    <div class="section-heading">
      <div class="heading-title">
        <ShieldCheck size={16} strokeWidth={2} class="section-icon" />
        <h2>Today's Live Class Shields</h2>
      </div>
      <button
        type="button"
        class="ghost mini-action-btn"
        onclick={() => store.openDisruptionModal()}
        title="Record schedule disruption (Online, Makeup, or Cancelled)"
      >
        <CalendarPlus size={13} strokeWidth={1.75} />
        <span>Disruption / Makeup</span>
      </button>
    </div>

    {#if store.snapshot?.todayClasses?.length}
      <div class="classes-grid">
        {#each store.snapshot.todayClasses as cls (cls.id)}
          {@const crs = getCourse(cls.course_id)}
          <div class="class-card {cls.status} {cls.is_crunch_deferred ? 'deferred' : ''}">
            <div class="card-left">
              <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
                {crs.code}
              </span>
              <div class="class-info">
                <div class="class-title truncate" title={cls.notes || `Lecture ${cls.lecture_number ?? 1}`}>
                  <span>{cls.notes || `Lecture ${cls.lecture_number ?? 1}`}</span>
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
                <div class="deferral-pill" title="Unrelated lecture postponed to protect imminent exam hours">
                  <ClockAlert size={13} strokeWidth={2} />
                  <span>Exam Crunch Deferred</span>
                </div>
              {:else if cls.status === 'attended' || cls.is_reviewed}
                <div class="shield-secured-badge">
                  <CheckCircle2 size={13} strokeWidth={2} />
                  <span>Shield Secured</span>
                </div>
              {:else}
                <button
                  type="button"
                  class="primary action-btn"
                  onclick={() => launchPomodoroForClass(cls)}
                  title="Launch 25m focus review to lock in same-day retention"
                >
                  <Play size={12} strokeWidth={2} />
                  <span>Review Shield (25m)</span>
                </button>
                <button
                  type="button"
                  class="ghost action-btn"
                  onclick={() => markClassReviewed(cls)}
                  title="Mark reviewed directly"
                >
                  Mark Done
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No live classes scheduled for today. Devote your available daily blocks to exam revision and backlog recovery.</p>
      </div>
    {/if}
  </section>

  <!-- Today's Exam Prep & Revision Blocks -->
  <section class="plan-section surface-card leading-line" aria-label="Today's Exam Prep and Revision Blocks">
    <div class="section-heading">
      <div class="heading-title">
        <GraduationCap size={16} strokeWidth={2} class="section-icon grad-icon" />
        <h2>Exam Prep & Revision Blocks</h2>
      </div>
      {#if store.snapshot?.settings?.finals_prep_mode}
        <span class="tag tag-amber">100% Finals Focus</span>
      {/if}
    </div>

    {#if store.snapshot?.upcomingExams?.length}
      <div class="classes-grid">
        {#each store.snapshot.upcomingExams as exam (exam.id)}
          {@const crs = getCourse(exam.course_id)}
          {@const alloc = store.snapshot?.allocation?.courseAllocations?.find(a => a.course_id === exam.course_id)}
          <div class="class-card exam-prep-card">
            <div class="card-left">
              <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
                {crs.code}
              </span>
              <div class="class-info">
                <div class="class-title truncate" title={exam.title}>
                  <span>{exam.title}</span>
                  <span class="tag tag-neutral">{exam.assessment_type}</span>
                </div>
                <div class="class-time tabular-nums">
                  Prep: {exam.revision_completed_blocks || 0} / {exam.revision_target_blocks || 4} blocks
                  {#if alloc && alloc.allocatedBlocks > 0}
                    · Today's Budget: {alloc.allocatedBlocks} blocks
                  {/if}
                  · Syllabus: {exam.syllabus_range}
                </div>
              </div>
            </div>

            <div class="card-right">
              <button
                type="button"
                class="primary action-btn"
                onclick={() => launchPomodoroForExam(exam)}
                title="Launch 25m Pomodoro exam prep session"
              >
                <Play size={12} strokeWidth={2} />
                <span>Prep Block (25m)</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No imminent assessments scheduled. All study capacity is allocated to live class shields and backlog recovery.</p>
      </div>
    {/if}
  </section>

  <!-- High-Priority Backlog Recovery Preview -->
  <section class="plan-section surface-card leading-line" aria-label="Priority Backlog Recovery">
    <div class="section-heading">
      <div class="heading-title">
        <Flame size={16} strokeWidth={2} class="section-icon flame-icon" />
        <h2>High-Priority Backlog Recovery</h2>
      </div>
      <button
        type="button"
        class="ghost mini-action-btn"
        onclick={() => store.setView('queue')}
        title="View Full Recovery Queue"
      >
        <span>View Full Queue ({store.snapshot?.unwatchedLectures?.length || 0})</span>
        <ArrowRight size={12} strokeWidth={2} />
      </button>
    </div>

    {#if store.snapshot?.unwatchedLectures?.length}
      <div class="backlog-preview-list">
        {#each store.snapshot.unwatchedLectures.slice(0, 4) as lecture (lecture.id)}
          {@const crs = getCourse(lecture.course_id)}
          <div class="backlog-row">
            <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
              {crs.code}
            </span>
            <div class="backlog-desc">
              <span class="backlog-title truncate" title={lecture.notes || `Class Lecture ${lecture.lecture_number ?? 1}`}>{lecture.notes || `Class Lecture ${lecture.lecture_number ?? 1}`}</span>
              <span class="backlog-date tabular-nums">{lecture.date}</span>
            </div>
            <button
              type="button"
              class="primary action-btn"
              onclick={() => launchPomodoroForClass(lecture)}
              title="Launch 25m recovery session"
            >
              <Play size={12} strokeWidth={2} />
              <span>Recover (25m)</span>
            </button>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>Zero backlog debt. All semester lectures are reviewed and up to date.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--grid-4);
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .academic-date-label {
    font-size: var(--text-sm);
    color: var(--ink-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .font-mono {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .quote-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    max-width: 460px;
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .quote-sparkle {
    color: var(--accent-amber);
    flex-shrink: 0;
  }

  .quote-text {
    font-style: italic;
    line-height: 1.4;
  }

  .plan-section {
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
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

  .section-icon {
    color: var(--accent-emerald);
  }

  .flame-icon {
    color: var(--accent-amber);
  }

  .mini-action-btn {
    font-size: 11.5px;
    padding: 4px 8px;
    gap: 5px;
  }

  .classes-grid {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
  }

  .class-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg-stage);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .class-card:hover {
    border-color: var(--border-strong);
    background: var(--bg-surface);
  }

  .class-card.deferred {
    border-style: dashed;
    background: color-mix(in srgb, var(--accent-amber-subtle) 30%, var(--bg-surface));
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
    padding: 3px 8px;
    border-radius: var(--radius-xs);
    letter-spacing: 0.03em;
  }

  .class-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .class-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .class-time {
    font-size: 11.5px;
    color: var(--ink-muted);
  }

  .card-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .deferral-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--accent-amber-ink);
    background: var(--accent-amber-subtle);
    border: 1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent);
    padding: 3px 9px;
    border-radius: var(--radius-xs);
  }

  .shield-secured-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--accent-emerald-ink);
    background: var(--accent-emerald-subtle);
    border: 1px solid color-mix(in srgb, var(--accent-emerald) 30%, transparent);
    padding: 3px 9px;
    border-radius: var(--radius-xs);
  }

  .action-btn {
    font-size: 11.5px;
    padding: 5px 10px;
  }

  .backlog-preview-list {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
  }

  .backlog-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--bg-stage);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
  }

  .backlog-row:hover {
    background: var(--bg-surface);
    border-color: var(--border-strong);
  }

  .backlog-desc {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .backlog-title {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .backlog-date {
    font-size: 11px;
    color: var(--ink-muted);
  }

  .empty-state {
    padding: var(--grid-6);
    text-align: center;
    color: var(--ink-muted);
    font-size: 12.5px;
    background: var(--bg-stage);
    border-radius: var(--radius-sm);
    border: 1px dashed var(--border-subtle);
  }
</style>
