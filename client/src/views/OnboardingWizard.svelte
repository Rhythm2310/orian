<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { playSuccessChime } from '../lib/audio.ts';
  import {
    Compass,
    BookOpen,
    Calendar,
    GraduationCap,
    Check,
    ArrowRight,
    ArrowLeft,
    Clock,
    Plus,
    Trash2,
    Sliders
  } from '@lucide/svelte';
  import type { Course, AssessmentType } from '../lib/types.ts';

  interface LocalCourseItem {
    name: string;
    code: string;
    color: string;
    effort_multiplier: number;
  }

  let step = $state<number>(1);

  // Step 1: Daily Capacity & Cutoff Hour
  let dailyTarget = $state<number>(6);
  let cutoffHour = $state<number>(4);

  // Step 2: Courses
  let coursesList = $state<LocalCourseItem[]>([
    { name: 'Calculus II', code: 'MATH204', color: '#1A6B4E', effort_multiplier: 1.5 },
    { name: 'Data Structures', code: 'CS201', color: '#B9581A', effort_multiplier: 1.0 },
    { name: 'University Physics', code: 'PHYS112', color: '#1D5CA3', effort_multiplier: 1.0 }
  ]);
  let newCourseName = $state<string>('');
  let newCourseCode = $state<string>('');
  let newCourseMultiplier = $state<number>(1.0);

  function addCourse(): void {
    if (newCourseCode.trim()) {
      coursesList = [
        ...coursesList,
        {
          name: newCourseName.trim() || newCourseCode.trim(),
          code: newCourseCode.trim().toUpperCase(),
          color: '#1A6B4E',
          effort_multiplier: Number(newCourseMultiplier)
        }
      ];
      newCourseName = '';
      newCourseCode = '';
      newCourseMultiplier = 1.0;
    }
  }

  function removeCourse(idx: number): void {
    coursesList = coursesList.filter((_, i) => i !== idx);
  }

  // Step 4: First Assessment (Optional)
  let examTitle = $state<string>('Class Test 1');
  let examType = $state<AssessmentType>('CT');
  let examCourseCode = $state<string>('MATH204');
  let examDaysAhead = $state<number>(3);
  let examSyllabus = $state<string>('8-12');
  let examTargetBlocks = $state<number>(4);

  async function completeOnboarding(): Promise<void> {
    // 1. Save Settings
    await api.updateSettings({
      daily_study_blocks_target: Number(dailyTarget),
      daily_block_target: Number(dailyTarget),
      academic_cutoff_hour: Number(cutoffHour),
      onboarding_completed: true,
      last_active_academic_date: new Date().toISOString().substring(0, 10)
    });

    // 2. Create Courses
    const createdCourses: Course[] = [];
    for (const c of coursesList) {
      const created = await api.createCourse(c);
      if (created) createdCourses.push(created);
    }

    // 3. Create Sample Routine Slots
    if (createdCourses.length >= 2) {
      await api.createRoutineSlot({
        course_id: createdCourses[0].id,
        day_of_week: 1, // Mon
        start_time: '10:00',
        end_time: '11:30',
        room: 'Hall A'
      });
      await api.createRoutineSlot({
        course_id: createdCourses[1].id,
        day_of_week: 1, // Mon
        start_time: '14:00',
        end_time: '15:30',
        room: 'Lab 2'
      });
    }

    // 4. Create First Assessment if configured
    if (examTitle.trim() && createdCourses.length > 0) {
      const targetCourse = createdCourses.find(c => c.code === examCourseCode) || createdCourses[0];
      const examDate = new Date();
      examDate.setDate(examDate.getDate() + Number(examDaysAhead));
      examDate.setHours(10, 0, 0, 0);

      await api.createAssessment({
        course_id: targetCourse.id,
        title: examTitle.trim(),
        assessment_type: examType,
        exam_date: examDate.toISOString(),
        syllabus_range: examSyllabus.trim() || 'ALL',
        revision_target_blocks: Number(examTargetBlocks)
      });
    }

    await store.refreshSnapshot();
    playSuccessChime(store.chimesEnabled);
    store.showToast('Welcome to Orian! Your academic battle plan is active.');
    store.setView('dashboard');
  }
</script>

<div class="onboarding-viewport">
  <div class="onboarding-container" aria-label="Orian Setup Wizard">
    <!-- Header with Progress -->
    <header class="wizard-header">
      <div class="wizard-branding">
        <span class="pulse-emerald"></span>
        <span class="brand-text">Orian</span>
        <span class="subbrand-text">Setup</span>
      </div>

      <div class="wizard-stepper" role="tablist" aria-label="Setup steps">
        {#each [1, 2, 3, 4] as s}
          <div
            class="step-indicator {step === s ? 'current' : step > s ? 'completed' : ''}"
            role="tab"
            aria-selected={step === s}
          >
            <span class="step-num tabular-nums">{s}</span>
          </div>
          {#if s < 4}
            <span class="step-connector {step > s ? 'active' : ''}"></span>
          {/if}
        {/each}
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="wizard-body">
      {#if step === 1}
        <section class="step-card surface-card leading-line" aria-labelledby="step1-title">
          <div class="step-icon-wrap emerald">
            <Compass size={22} strokeWidth={2} />
          </div>

          <div class="step-header-text">
            <h2 id="step1-title">Daily Rhythm & Academic Day Cutoff</h2>
            <p>
              Orian adapts to true student schedules. Study sessions completed past midnight count toward yesterday's effort budget so your streaks and daily plans stay honest.
            </p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="daily-target">Daily Focus Target</label>
              <div class="input-with-unit">
                <input
                  id="daily-target"
                  type="number"
                  min="1"
                  max="16"
                  bind:value={dailyTarget}
                  class="font-mono"
                />
                <span class="unit-text">Blocks / day (25m)</span>
              </div>
              <span class="field-hint">6 blocks = 2.5h pure Pomodoro focus. Recommended university baseline.</span>
            </div>

            <div class="form-group">
              <label for="cutoff-hour">Academic Day Cutoff Hour</label>
              <div class="input-with-unit">
                <input
                  id="cutoff-hour"
                  type="number"
                  min="0"
                  max="8"
                  bind:value={cutoffHour}
                  class="font-mono"
                />
                <span class="unit-text">:00 AM Cutoff</span>
              </div>
              <span class="field-hint">Default 4:00 AM: Sessions completed at 2:30 AM belong to tonight's budget.</span>
            </div>
          </div>

          <footer class="step-actions right">
            <button type="button" class="primary" onclick={() => step = 2}>
              <span>Continue to Courses</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </footer>
        </section>

      {:else if step === 2}
        <section class="step-card surface-card leading-line" aria-labelledby="step2-title">
          <div class="step-icon-wrap amber">
            <BookOpen size={22} strokeWidth={2} />
          </div>

          <div class="step-header-text">
            <h2 id="step2-title">Enrolled Semester Courses</h2>
            <p>
              Add the courses you are currently attending. Adjust individual course effort multipliers (0.5x to 2.0x) to automatically shift study allocations toward heavier subjects.
            </p>
          </div>

          <div class="courses-preview-list">
            {#each coursesList as crs, idx (crs.code)}
              <div class="course-row">
                <div class="course-left">
                  <span class="color-dot" style="background: {crs.color};"></span>
                  <span class="course-code font-mono">{crs.code}</span>
                  <span class="course-name">{crs.name}</span>
                </div>
                <div class="course-right">
                  <span class="multiplier-pill font-mono">{crs.effort_multiplier}x Effort</span>
                  <button
                    type="button"
                    class="ghost icon-btn delete-btn"
                    onclick={() => removeCourse(idx)}
                    aria-label="Remove course {crs.code}"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>
            {/each}
          </div>

          <div class="add-course-bar">
            <input
              type="text"
              placeholder="Code (e.g. CS201)"
              bind:value={newCourseCode}
              class="code-input font-mono"
            />
            <input
              type="text"
              placeholder="Course Title"
              bind:value={newCourseName}
              class="name-input"
            />
            <select bind:value={newCourseMultiplier} class="multiplier-select">
              <option value={0.5}>0.5x (Light)</option>
              <option value={1.0}>1.0x (Standard)</option>
              <option value={1.5}>1.5x (Hard)</option>
              <option value={2.0}>2.0x (Intensive)</option>
            </select>
            <button type="button" class="primary add-btn" onclick={addCourse}>
              <Plus size={14} strokeWidth={2} />
              <span>Add</span>
            </button>
          </div>

          <footer class="step-actions split">
            <button type="button" class="ghost" onclick={() => step = 1}>
              <ArrowLeft size={14} strokeWidth={2} />
              <span>Back</span>
            </button>
            <button type="button" class="primary" onclick={() => step = 3}>
              <span>Continue to Routine</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </footer>
        </section>

      {:else if step === 3}
        <section class="step-card surface-card leading-line" aria-labelledby="step3-title">
          <div class="step-icon-wrap emerald">
            <Calendar size={22} strokeWidth={2} />
          </div>

          <div class="step-header-text">
            <h2 id="step3-title">Weekly Routine & Review Shields</h2>
            <p>
              Orian seeds your recurring timetable so today's live lectures generate same-day review shields automatically. You can add room locations and customize times later in the Routine tab.
            </p>
          </div>

          <div class="routine-preview-box">
            <div class="preview-slot">
              <span class="slot-day font-mono">Monday 10:00 - 11:30</span>
              <span class="slot-badge">{coursesList[0]?.code || 'Course 1'} Lecture • Hall A</span>
            </div>
            <div class="preview-slot">
              <span class="slot-day font-mono">Monday 14:00 - 15:30</span>
              <span class="slot-badge">{coursesList[1]?.code || 'Course 2'} Lecture • Lab 2</span>
            </div>
          </div>

          <div class="callout-card">
            <span class="callout-title">The Same-Day Shield Principle:</span>
            <p>
              When you attend a lecture today, reviewing it for 25 minutes before 4:00 AM prevents 80% of forgetting curve decay.
            </p>
          </div>

          <footer class="step-actions split">
            <button type="button" class="ghost" onclick={() => step = 2}>
              <ArrowLeft size={14} strokeWidth={2} />
              <span>Back</span>
            </button>
            <button type="button" class="primary" onclick={() => step = 4}>
              <span>Continue to Assessments</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </footer>
        </section>

      {:else if step === 4}
        <section class="step-card surface-card leading-line" aria-labelledby="step4-title">
          <div class="step-icon-wrap ruby">
            <GraduationCap size={22} strokeWidth={2} />
          </div>

          <div class="step-header-text">
            <h2 id="step4-title">Upcoming Assessment & Exam Triage</h2>
            <p>
              Do you have a Class Test (CT), Quiz, or Midterm coming up? Orian isolates in-syllabus lectures and proportionally reallocates study blocks toward it.
            </p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="exam-course">Course</label>
              <select id="exam-course" bind:value={examCourseCode}>
                {#each coursesList as crs (crs.code)}
                  <option value={crs.code}>{crs.code} — {crs.name}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="exam-title">Assessment Title</label>
              <input id="exam-title" type="text" bind:value={examTitle} />
            </div>

            <div class="form-group">
              <label for="exam-type">Assessment Type</label>
              <select id="exam-type" bind:value={examType}>
                <option value="CT">Class Test (CT)</option>
                <option value="QUIZ">Quiz</option>
                <option value="MIDTERM">Midterm Exam</option>
                <option value="FINAL">Final Exam</option>
              </select>
            </div>

            <div class="form-group">
              <label for="exam-days">Scheduled In (Days Ahead)</label>
              <div class="input-with-unit">
                <input
                  id="exam-days"
                  type="number"
                  min="1"
                  max="60"
                  bind:value={examDaysAhead}
                  class="font-mono"
                />
                <span class="unit-text">Days</span>
              </div>
            </div>

            <div class="form-group">
              <label for="exam-syllabus">Syllabus Lectures</label>
              <input
                id="exam-syllabus"
                type="text"
                placeholder="e.g. 8-12 or ALL"
                bind:value={examSyllabus}
                class="font-mono"
              />
            </div>
          </div>

          <footer class="step-actions split">
            <button type="button" class="ghost" onclick={() => step = 3}>
              <ArrowLeft size={14} strokeWidth={2} />
              <span>Back</span>
            </button>
            <button type="button" class="primary" onclick={completeOnboarding}>
              <Check size={14} strokeWidth={2} />
              <span>Launch Academic Battle Plan</span>
            </button>
          </footer>
        </section>
      {/if}
    </main>
  </div>
</div>

<style>
  .onboarding-viewport {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--grid-8) var(--grid-4);
  }

  .onboarding-container {
    width: 620px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--grid-5);
  }

  .wizard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--grid-2);
  }

  .wizard-branding {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .pulse-emerald {
    width: 9px;
    height: 9px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
    box-shadow: 0 0 0 3px var(--accent-emerald-subtle);
  }

  .brand-text {
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 700;
    color: var(--ink-primary);
    letter-spacing: -0.01em;
  }

  .subbrand-text {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-muted);
    margin-left: 2px;
  }

  .wizard-stepper {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .step-indicator {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-muted);
    transition: all 0.2s ease;
  }

  .step-indicator.current {
    background: var(--accent-emerald);
    border-color: var(--accent-emerald);
    color: #FFFFFF;
  }

  .step-indicator.completed {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
  }

  .step-connector {
    width: 16px;
    height: 2px;
    background: var(--border-subtle);
    border-radius: var(--radius-full);
    transition: background 0.2s ease;
  }

  .step-connector.active {
    background: var(--accent-emerald);
  }

  .step-card {
    padding: var(--grid-6);
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .step-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-icon-wrap.emerald {
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
  }

  .step-icon-wrap.amber {
    background: var(--accent-amber-subtle);
    color: var(--accent-amber-ink);
  }

  .step-icon-wrap.ruby {
    background: rgba(197, 48, 48, 0.12);
    color: var(--accent-crimson);
  }

  .step-header-text h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .step-header-text p {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.5;
    margin-top: 4px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--grid-4);
    padding-top: var(--grid-2);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .input-with-unit {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .unit-text {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .field-hint {
    font-size: 11px;
    color: var(--ink-muted);
    line-height: 1.4;
    margin-top: 2px;
  }

  .courses-preview-list {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
  }

  .course-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
  }

  .course-left {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
  }

  .course-code {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-primary);
  }

  .course-name {
    font-size: 13px;
    color: var(--ink-secondary);
  }

  .course-right {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .multiplier-pill {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: var(--radius-xs);
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
    font-weight: 600;
  }

  .delete-btn {
    padding: 4px;
    color: var(--ink-muted);
  }

  .delete-btn:hover {
    color: var(--accent-crimson);
  }

  .add-course-bar {
    display: flex;
    gap: var(--grid-2);
    align-items: center;
  }

  .code-input {
    width: 140px;
  }

  .name-input {
    flex: 1;
  }

  .multiplier-select {
    width: 140px;
  }

  .add-btn {
    white-space: nowrap;
    padding: 6px 14px;
  }

  .routine-preview-box {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
    padding: var(--grid-3);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
  }

  .preview-slot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .slot-day {
    color: var(--ink-muted);
    font-size: 12px;
  }

  .slot-badge {
    font-weight: 600;
    color: var(--ink-primary);
  }

  .callout-card {
    padding: var(--grid-3);
    background: var(--accent-emerald-subtle);
    border-radius: var(--radius-xs);
    border: 1px solid rgba(26, 107, 78, 0.15);
  }

  .callout-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-emerald-ink);
    display: block;
    margin-bottom: 2px;
  }

  .callout-card p {
    font-size: 12px;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .step-actions {
    display: flex;
    align-items: center;
    padding-top: var(--grid-3);
  }

  .step-actions.right {
    justify-content: flex-end;
  }

  .step-actions.split {
    justify-content: space-between;
  }
</style>
