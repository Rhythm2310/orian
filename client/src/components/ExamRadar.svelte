<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { GraduationCap, ClockAlert, Play, CheckCircle2, BookOpen } from '@lucide/svelte';
  import { isLectureInSyllabus } from '@core/validators.ts';
  import type { Assessment, Course, ClassSession } from '../lib/types.ts';

  interface Props {
    exams?: Assessment[];
    courses?: Course[];
    unwatchedLectures?: ClassSession[];
  }

  let { exams = [], courses = [], unwatchedLectures = [] }: Props = $props();

  function getCourse(courseId: string): Pick<Course, 'code' | 'color'> {
    const found = courses.find(c => c.id === courseId);
    return found ? { code: found.code, color: found.color } : { code: courseId, color: '#1A6B4E' };
  }

  interface ExamMetrics {
    days: number;
    diffHours: number;
    isCrunch: boolean;
    inSyllabusCount: number;
    prepTarget: number;
    completedBlocks: number;
  }

  function getExamMetrics(exam: Assessment): ExamMetrics {
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
      prepTarget: exam.revision_target_blocks || 4,
      completedBlocks: exam.revision_completed_blocks || 0
    };
  }

  async function startExamPrep(exam: Assessment): Promise<void> {
    await api.startPomodoro({
      course_id: exam.course_id,
      assessment_id: exam.id,
      mode: 'exam_revision',
      durationMinutes: 25
    });
    await store.refreshSnapshot();
    store.setView('pomodoro');
  }
</script>

{#if exams && exams.length > 0}
  <div class="exam-radar-container surface-card leading-line" aria-label="Exam Radar Strip">
    <div class="radar-header">
      <div class="header-title">
        <span class="grad-icon"><GraduationCap size={15} strokeWidth={2} /></span>
        <span class="radar-heading">Imminent Assessment Radar</span>
      </div>
      <span class="exam-count tabular-nums">{exams.length} Upcoming</span>
    </div>

    <!-- Exam Cards Strip (Rule of Thirds Horizontal Flow) -->
    <div class="exam-cards-strip">
      {#each exams as exam (exam.id)}
        {@const crs = getCourse(exam.course_id)}
        {@const metrics = getExamMetrics(exam)}
        <div class="exam-card {metrics.isCrunch ? 'crunch-active' : ''}">
          <div class="exam-card-top">
            <span
              class="exam-type-tag"
              style="border-color: {crs.color || '#1A6B4E'}; color: {crs.color || '#1A6B4E'};"
            >
              {exam.assessment_type}
            </span>
            <span
              class="exam-countdown tabular-nums {metrics.isCrunch ? 'countdown-urgent' : ''}"
            >
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
            <div class="exam-name" title={exam.title}>{exam.title}</div>
            <div class="exam-course">
              <span class="course-code" style="color: {crs.color || '#1A6B4E'};">{crs.code}</span>
              <span class="course-syllabus">Syllabus: {exam.syllabus_range}</span>
            </div>
          </div>

          <!-- Progress / Readiness Indicator -->
          <div class="exam-card-metrics">
            <div class="metric-line">
              <span class="metric-label">Unwatched Syllabus:</span>
              <span class="metric-val tabular-nums {metrics.inSyllabusCount > 0 ? 'metric-warn' : ''}">
                {metrics.inSyllabusCount} lectures
              </span>
            </div>
            <div class="metric-line">
              <span class="metric-label">Prep Completed:</span>
              <span class="metric-val tabular-nums">
                {metrics.completedBlocks} / {metrics.prepTarget} blocks
              </span>
            </div>
          </div>

          {#if metrics.isCrunch}
            <div class="crunch-notice">
              <ClockAlert size={12} strokeWidth={2} />
              <span>Exam Crunch: Unrelated routine shielded</span>
            </div>
          {/if}

          <div class="exam-card-footer">
            <button
              type="button"
              class="primary mini-prep-btn"
              onclick={() => startExamPrep(exam)}
              title="Launch dedicated Pomodoro Exam Prep Block"
            >
              <Play size={11} strokeWidth={2} />
              <span>Launch Prep Block</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .exam-radar-container {
    display: flex;
    flex-direction: column;
    gap: var(--grid-3);
    padding: var(--grid-4);
  }

  .radar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .grad-icon {
    color: var(--accent-emerald);
  }

  .radar-heading {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .exam-count {
    font-size: 11px;
    color: var(--ink-muted);
    font-weight: 500;
  }

  .exam-cards-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--grid-3);
  }

  .exam-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--bg-stage);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    transition: all var(--transition-fast);
  }

  .exam-card:hover {
    border-color: var(--border-strong);
    background: var(--bg-surface);
  }

  .exam-card.crunch-active {
    border-color: var(--accent-amber);
    background: color-mix(in srgb, var(--accent-amber-subtle) 40%, var(--bg-surface));
  }

  .exam-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .exam-type-tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid currentColor;
    background: var(--bg-surface);
  }

  .exam-countdown {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .countdown-urgent {
    color: var(--accent-crimson);
    font-weight: 700;
  }

  .exam-card-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .exam-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .exam-course {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .course-code {
    font-family: var(--font-mono);
    font-weight: 700;
  }

  .course-syllabus {
    color: var(--ink-muted);
  }

  .exam-card-metrics {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 4px 0;
    border-top: 1px solid var(--border-subtle);
  }

  .metric-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
  }

  .metric-label {
    color: var(--ink-muted);
  }

  .metric-val {
    font-weight: 600;
    color: var(--ink-primary);
  }

  .metric-warn {
    color: var(--accent-crimson);
  }

  .crunch-notice {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    color: var(--accent-amber-ink);
    background: var(--accent-amber-subtle);
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    font-weight: 500;
  }

  .exam-card-footer {
    margin-top: auto;
    padding-top: 4px;
  }

  .mini-prep-btn {
    width: 100%;
    padding: 4px 8px;
    font-size: 11px;
    gap: 5px;
  }
</style>
