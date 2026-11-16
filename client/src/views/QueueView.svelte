<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import {
    ListTodo,
    Filter,
    Play,
    CheckCircle2,
    ClockAlert,
    Video,
    ShieldAlert,
    Compass,
    BookOpen
  } from '@lucide/svelte';
  import { isLectureInSyllabus } from '@core/validators.ts';
  import type { ClassSession, Course } from '../lib/types.ts';

  type QueueFilter = 'all' | 'syllabus' | 'deferred' | 'online';

  let selectedFilter = $state<QueueFilter>('all');
  let selectedCourseId = $state<string>('all');

  function getCourse(courseId: string): Pick<Course, 'code' | 'color'> {
    const found = (store.snapshot?.courses || []).find(c => c.id === courseId);
    return found ? { code: found.code, color: found.color } : { code: courseId, color: '#1A6B4E' };
  }

  function isLectureInAnyExamSyllabus(lecture: ClassSession): boolean {
    const exams = (store.snapshot?.upcomingExams || []).filter(e => e.course_id === lecture.course_id);
    return exams.some(e => isLectureInSyllabus(lecture.lecture_number, e.parsed_syllabus || 'ALL'));
  }

  const filteredLectures = $derived(
    (store.snapshot?.unwatchedLectures || []).filter(l => {
      if (selectedCourseId !== 'all' && l.course_id !== selectedCourseId) {
        return false;
      }
      if (selectedFilter === 'syllabus') {
        return isLectureInAnyExamSyllabus(l);
      }
      if (selectedFilter === 'deferred') {
        return Boolean(l.is_crunch_deferred);
      }
      if (selectedFilter === 'online') {
        return l.status === 'online_recorded';
      }
      return true;
    })
  );

  async function launchRecovery(lecture: ClassSession): Promise<void> {
    await api.startPomodoro({
      course_id: lecture.course_id,
      class_id: lecture.id,
      mode: 'lecture_recovery',
      durationMinutes: 25
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }

  async function markDone(lecture: ClassSession): Promise<void> {
    await api.markClassReviewed(lecture.id);
    store.showToast('Lecture marked as reviewed.');
    await store.refreshSnapshot();
  }
</script>

<div class="stage-content">
  <!-- View Header (F-Pattern Horizontal Scan Anchor) -->
  <div class="view-header">
    <div class="header-left">
      <h1>Recovery Queue</h1>
      <p>
        Unwatched lectures and deferred classes waiting for triage. Prioritize in-syllabus items to stay ahead of upcoming tests.
      </p>
    </div>

    {#if store.snapshot?.gapInfo?.gapDetected}
      <button type="button" class="primary" onclick={() => store.showGapReturnModal = true}>
        <Compass size={14} strokeWidth={2} />
        <span>Safe Return Triage Active</span>
      </button>
    {/if}
  </div>

  <!-- Filter & Course Control Bar -->
  <div class="filter-bar surface-card">
    <div class="filter-pills" role="tablist" aria-label="Queue Filters">
      <button
        type="button"
        class="filter-pill {selectedFilter === 'all' ? 'active' : ''}"
        onclick={() => selectedFilter = 'all'}
        role="tab"
        aria-selected={selectedFilter === 'all'}
      >
        <span>All Backlog</span>
        <span class="pill-count tabular-nums">{store.snapshot?.unwatchedLectures?.length || 0}</span>
      </button>

      <button
        type="button"
        class="filter-pill {selectedFilter === 'syllabus' ? 'active' : ''}"
        onclick={() => selectedFilter = 'syllabus'}
        role="tab"
        aria-selected={selectedFilter === 'syllabus'}
      >
        <BookOpen size={12} strokeWidth={2} />
        <span>In Exam Syllabus</span>
      </button>

      <button
        type="button"
        class="filter-pill {selectedFilter === 'deferred' ? 'active' : ''}"
        onclick={() => selectedFilter = 'deferred'}
        role="tab"
        aria-selected={selectedFilter === 'deferred'}
      >
        <ClockAlert size={12} strokeWidth={2} />
        <span>Crunch Deferred</span>
      </button>

      <button
        type="button"
        class="filter-pill {selectedFilter === 'online' ? 'active' : ''}"
        onclick={() => selectedFilter = 'online'}
        role="tab"
        aria-selected={selectedFilter === 'online'}
      >
        <Video size={12} strokeWidth={2} />
        <span>Online / Recorded</span>
      </button>
    </div>

    <!-- Course Filter Select -->
    <div class="course-select-wrap">
      <select bind:value={selectedCourseId} aria-label="Filter by Course">
        <option value="all">All Courses</option>
        {#each store.snapshot?.courses || [] as crs (crs.id)}
          <option value={crs.id}>{crs.code} — {crs.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Queue Content (F-Pattern Content List) -->
  <div class="queue-list-container">
    {#if filteredLectures.length > 0}
      <div class="queue-list" role="list">
        {#each filteredLectures as lecture (lecture.id)}
          {@const crs = getCourse(lecture.course_id)}
          {@const inSyllabus = isLectureInAnyExamSyllabus(lecture)}
          <div class="queue-card surface-card leading-line {inSyllabus ? 'card-syllabus' : ''}" role="listitem">
            <div class="card-left">
              <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
                {crs.code}
              </span>

              <div class="lecture-details">
                <div class="lecture-title-row">
                  <span class="lecture-title">
                    {lecture.notes || `Lecture ${lecture.lecture_number ?? 1}`}
                  </span>
                  {#if inSyllabus}
                    <span class="tag tag-crimson">In Exam Syllabus</span>
                  {/if}
                  {#if lecture.is_crunch_deferred}
                    <span class="tag tag-amber">Crunch Deferred</span>
                  {/if}
                  {#if lecture.status === 'online_recorded'}
                    <span class="tag tag-blue">Online / Recorded</span>
                  {/if}
                </div>

                <div class="lecture-meta tabular-nums">
                  <span>Class Date: {lecture.date}</span>
                  {#if lecture.lecture_number}
                    <span>· Lecture #{lecture.lecture_number}</span>
                  {/if}
                </div>
              </div>
            </div>

            <div class="card-right">
              <button
                type="button"
                class="primary action-btn"
                onclick={() => launchRecovery(lecture)}
                title="Launch 25m Pomodoro Recovery Session"
              >
                <Play size={12} strokeWidth={2} />
                <span>Recover (25m)</span>
              </button>
              <button
                type="button"
                class="ghost action-btn"
                onclick={() => markDone(lecture)}
                title="Mark reviewed directly"
              >
                <CheckCircle2 size={13} strokeWidth={1.75} />
                <span>Mark Done</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state surface-card">
        <span class="empty-icon"><ListTodo size={24} strokeWidth={1.75} /></span>
        <p>No backlog items match the selected filter. You're completely up to date!</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .view-header {
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

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--grid-4);
    padding: var(--grid-2) var(--grid-3);
    flex-wrap: wrap;
  }

  .filter-pills {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
    flex-wrap: wrap;
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: var(--radius-xs);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
    background: transparent;
    border: 1px solid transparent;
  }

  .filter-pill:hover {
    background: var(--bg-hover);
    color: var(--ink-primary);
  }

  .filter-pill.active {
    background: var(--bg-surface);
    color: var(--ink-primary);
    border-color: var(--border-subtle);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .pill-count {
    font-family: var(--font-mono);
    font-size: 10px;
    background: var(--bg-subtle);
    padding: 1px 5px;
    border-radius: var(--radius-full);
    color: var(--ink-muted);
  }

  .course-select-wrap {
    min-width: 180px;
  }

  .queue-list-container {
    display: flex;
    flex-direction: column;
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
  }

  .queue-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg-surface);
  }

  .queue-card.card-syllabus {
    border-left: 3px solid var(--accent-crimson);
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

  .lecture-details {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .lecture-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .lecture-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .lecture-meta {
    font-size: 11.5px;
    color: var(--ink-muted);
    display: flex;
    gap: 6px;
  }

  .card-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn {
    font-size: 11.5px;
    padding: 5px 10px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: var(--grid-12);
    text-align: center;
    color: var(--ink-muted);
  }

  .empty-icon {
    color: var(--accent-emerald);
  }
</style>
