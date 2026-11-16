<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    ListTodo,
    Filter,
    Play,
    CheckCircle2,
    ClockAlert,
    Video,
    ShieldAlert,
    Compass
  } from '@lucide/svelte';
  import { isLectureInSyllabus } from '@core/validators.js';

  let selectedFilter = $state('all'); // 'all' | 'syllabus' | 'deferred' | 'online'
  let selectedCourseId = $state('all');

  function getCourse(courseId) {
    return (store.snapshot?.courses || []).find(c => c.id === courseId) || { code: courseId, color: '#1A6B4E' };
  }

  function isLectureInAnyExamSyllabus(lecture) {
    const exams = (store.snapshot?.upcomingExams || []).filter(e => e.course_id === lecture.course_id);
    return exams.some(e => isLectureInSyllabus(lecture.lecture_number, e.parsed_syllabus || 'ALL'));
  }

  let filteredLectures = $derived(
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

  async function launchRecovery(lecture) {
    await api.startPomodoro({
      course_id: lecture.course_id,
      class_id: lecture.id,
      session_mode: 'recovery',
      target_duration_seconds: 1500,
      notes: `Recovering ${lecture.course_code || ''} Lecture ${lecture.lecture_number}`
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }

  async function markDone(lecture) {
    await api.markClassReviewed(lecture.id);
    store.showToast(`Lecture marked as reviewed.`);
    await store.refreshSnapshot();
  }
</script>

<div class="stage-content">
  <div class="view-header">
    <div>
      <h1>Recovery Queue</h1>
      <p>
        Unwatched lectures and deferred classes waiting for triage. Prioritize in-syllabus items to stay ahead of upcoming tests.
      </p>
    </div>

    {#if store.snapshot?.gapInfo?.gapDetected}
      <button class="primary" onclick={() => store.showGapReturnModal = true}>
        <Compass size={14} strokeWidth={1.75} />
        <span>Safe Return Triage Active</span>
      </button>
    {/if}
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <div class="filter-pills">
      <button
        class="filter-pill {selectedFilter === 'all' ? 'active' : ''}"
        onclick={() => selectedFilter = 'all'}
      >
        <span>All Items</span>
        <span class="pill-count tabular-nums">{store.snapshot?.unwatchedLectures?.length || 0}</span>
      </button>

      <button
        class="filter-pill {selectedFilter === 'syllabus' ? 'active' : ''}"
        onclick={() => selectedFilter = 'syllabus'}
      >
        <span>In Exam Syllabus</span>
      </button>

      <button
        class="filter-pill {selectedFilter === 'deferred' ? 'active' : ''}"
        onclick={() => selectedFilter = 'deferred'}
      >
        <ClockAlert size={13} strokeWidth={1.75} />
        <span>Crunch Deferred</span>
      </button>

      <button
        class="filter-pill {selectedFilter === 'online' ? 'active' : ''}"
        onclick={() => selectedFilter = 'online'}
      >
        <Video size={13} strokeWidth={1.75} />
        <span>Online / Recorded</span>
      </button>
    </div>

    <!-- Course Filter Dropdown -->
    <div class="course-filter">
      <select bind:value={selectedCourseId} aria-label="Filter by course">
        <option value="all">All Courses</option>
        {#each store.snapshot?.courses || [] as crs}
          <option value={crs.id}>{crs.code} — {crs.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Queue Items List -->
  <div class="queue-list">
    {#if filteredLectures.length > 0}
      {#each filteredLectures as lecture}
        {@const crs = getCourse(lecture.course_id)}
        {@const inSyllabus = isLectureInAnyExamSyllabus(lecture)}
        <div class="queue-card {inSyllabus ? 'syllabus-match' : ''}">
          <div class="card-main">
            <span class="course-badge" style="background: {crs.color || '#1A6B4E'}">
              {crs.code}
            </span>

            <div class="card-details">
              <div class="title-row">
                <span class="lecture-title">{lecture.title || `Lecture ${lecture.lecture_number}`}</span>
                {#if inSyllabus}
                  <span class="tag tag-crimson">In Exam Syllabus</span>
                {/if}
                {#if lecture.is_crunch_deferred}
                  <span class="tag tag-amber">Crunch Deferred</span>
                {/if}
                {#if lecture.status === 'online_recorded'}
                  <span class="tag tag-neutral">Online (48h Guard)</span>
                {/if}
              </div>

              <div class="meta-row tabular-nums">
                Recorded/Scheduled: {lecture.date} · Lecture #{lecture.lecture_number}
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button class="primary action-btn" onclick={() => launchRecovery(lecture)}>
              <Play size={13} strokeWidth={1.75} />
              <span>Launch Recovery (25m)</span>
            </button>
            <button class="ghost action-btn" onclick={() => markDone(lecture)}>
              Mark Reviewed
            </button>
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-queue-box">
        <ListTodo size={32} strokeWidth={1.75} class="empty-icon" />
        <p>No lectures match the selected filters. Your recovery queue is clear!</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
  }

  .filter-pills {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-pill {
    padding: 6px 12px;
    font-size: 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-xs);
    color: var(--ink-secondary);
    gap: 6px;
  }

  .filter-pill.active {
    background: var(--bg-subtle);
    border-color: var(--border-subtle);
    color: var(--ink-primary);
    font-weight: 600;
  }

  .pill-count {
    font-size: 11px;
    background: var(--bg-surface);
    padding: 1px 5px;
    border-radius: var(--radius-full);
  }

  .course-filter select {
    width: 200px;
    padding: 6px 10px;
    font-size: 12px;
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .queue-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
  }

  .queue-card.syllabus-match {
    border-color: var(--accent-crimson);
    background: var(--accent-crimson-subtle);
  }

  .card-main {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .course-badge {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: #FFFFFF;
    padding: 4px 8px;
    border-radius: var(--radius-xs);
  }

  .card-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .lecture-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .meta-row {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .empty-queue-box {
    background: var(--bg-surface);
    border: 1px dashed var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 48px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--ink-muted);
  }

  :global(.empty-icon) {
    color: var(--accent-emerald);
  }
</style>
