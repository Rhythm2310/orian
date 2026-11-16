<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { GraduationCap, ClockAlert, Play, CheckCircle2 } from '@lucide/svelte';
  import { isLectureInSyllabus } from '@core/validators.js';

  let { exams = [], courses = [], unwatchedLectures = [] } = $props();

  function getCourse(courseId) {
    return courses.find(c => c.id === courseId) || { code: courseId, color: '#1A6B4E' };
  }

  function getExamMetrics(exam) {
    const examDate = new Date(exam.exam_date);
    const now = new Date();
    const diffHours = (examDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const days = Math.ceil(diffHours / 24);

    const isMidtermOrFinal = ['MIDTERM', 'FINAL', 'FINALS'].includes((exam.assessment_type || '').toUpperCase());
    const isCrunch = (isMidtermOrFinal && diffHours <= 48) || (!isMidtermOrFinal && diffHours <= 24);

    const inSyllabusCount = unwatchedLectures.filter(l =>
      l.course_id === exam.course_id &&
      isLectureInSyllabus(l.lecture_number, exam.parsed_syllabus || 'ALL')
    ).length;

    return {
      days,
      diffHours: Math.round(diffHours),
      isCrunch,
      inSyllabusCount,
      prepTarget: exam.revision_target_blocks || 4
    };
  }

  async function startExamPrep(exam) {
    await api.startPomodoro({
      course_id: exam.course_id,
      assessment_id: exam.id,
      session_mode: 'exam_prep',
      target_duration_seconds: 1500,
      notes: `Prep for ${exam.title}`
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }
</script>

{#if exams && exams.length > 0}
  <div class="exam-radar-container">
    <div class="radar-header">
      <div class="header-title">
        <GraduationCap size={16} strokeWidth={1.75} />
        <span>Exam Radar & Assessment Triage</span>
      </div>
      <span class="exam-count tabular-nums">{exams.length} Upcoming</span>
    </div>

    <div class="exam-cards-strip">
      {#each exams as exam}
        {@const crs = getCourse(exam.course_id)}
        {@const metrics = getExamMetrics(exam)}
        <div class="exam-card {metrics.isCrunch ? 'crunch-active' : ''}">
          <div class="exam-card-top">
            <span class="exam-type-tag" style="border-color: {crs.color || '#1A6B4E'}; color: {crs.color || '#1A6B4E'};">
              {exam.assessment_type}
            </span>
            <span class="exam-countdown tabular-nums">
              {#if metrics.days <= 0}
                Today!
              {:else if metrics.days === 1}
                Tomorrow ({metrics.diffHours}h)
              {:else}
                in {metrics.days}d
              {/if}
            </span>
          </div>

          <div class="exam-card-main">
            <div class="exam-name">{exam.title}</div>
            <div class="exam-course">
              <span class="course-code">{crs.code}</span>
              <span class="course-syllabus">Syllabus: {exam.syllabus_range}</span>
            </div>
          </div>

          <div class="exam-card-metrics">
            <div class="metric-line">
              <span class="metric-label">Unwatched Syllabus:</span>
              <span class="metric-val tabular-nums">{metrics.inSyllabusCount} lectures</span>
            </div>
            <div class="metric-line">
              <span class="metric-label">Practice Target:</span>
              <span class="metric-val tabular-nums">{metrics.prepTarget} blocks</span>
            </div>
          </div>

          {#if metrics.isCrunch}
            <div class="crunch-notice">
              <ClockAlert size={13} strokeWidth={1.75} />
              <span>Exam Crunch Deferral Active</span>
            </div>
          {/if}

          <button class="primary launch-prep-btn" onclick={() => startExamPrep(exam)}>
            <Play size={13} strokeWidth={1.75} />
            <span>Launch Exam Prep Block</span>
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .exam-radar-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .radar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .exam-count {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .exam-cards-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 14px;
  }

  .exam-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: var(--shadow-sm);
    position: relative;
    transition: border-color var(--transition-fast);
  }

  .exam-card.crunch-active {
    border-color: var(--accent-amber);
    background: var(--accent-amber-subtle);
  }

  .exam-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .exam-type-tag {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    border: 1px solid currentColor;
    background: var(--bg-surface);
  }

  .exam-countdown {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-amber);
  }

  .exam-card.crunch-active .exam-countdown {
    color: var(--accent-crimson);
  }

  .exam-card-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .exam-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .exam-course {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .course-code {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .course-syllabus {
    color: var(--ink-muted);
  }

  .exam-card-metrics {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 0;
    border-top: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
    font-size: 12px;
  }

  .metric-line {
    display: flex;
    justify-content: space-between;
  }

  .metric-label {
    color: var(--ink-muted);
  }

  .metric-val {
    font-weight: 600;
    color: var(--ink-primary);
  }

  .crunch-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-amber-ink);
  }

  .launch-prep-btn {
    width: 100%;
    padding: 6px 10px;
    font-size: 12px;
  }
</style>
