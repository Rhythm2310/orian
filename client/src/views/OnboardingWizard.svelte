<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { Compass, BookOpen, Calendar, GraduationCap, Check, ArrowRight } from '@lucide/svelte';

  let step = $state(1);

  // Step 1: Preferences
  let dailyTarget = $state(6);
  let cutoffHour = $state(4);

  // Step 2: Courses
  let coursesList = $state([
    { name: 'Calculus II', code: 'MATH204', color: '#1A6B4E', effort_multiplier: 1.5 },
    { name: 'Data Structures', code: 'CS201', color: '#B9581A', effort_multiplier: 1.0 },
    { name: 'University Physics', code: 'PHYS112', color: '#1D5CA3', effort_multiplier: 1.0 }
  ]);
  let newCourseName = $state('');
  let newCourseCode = $state('');

  function addCourse() {
    if (newCourseCode.trim()) {
      coursesList = [
        ...coursesList,
        {
          name: newCourseName.trim() || newCourseCode.trim(),
          code: newCourseCode.trim().toUpperCase(),
          color: '#1A6B4E',
          effort_multiplier: 1.0
        }
      ];
      newCourseName = '';
      newCourseCode = '';
    }
  }

  function removeCourse(idx) {
    coursesList = coursesList.filter((_, i) => i !== idx);
  }

  // Step 3: First Exam / Assessment (Optional)
  let examTitle = $state('Class Test 1');
  let examType = $state('CT');
  let examCourseCode = $state('MATH204');
  let examDaysAhead = $state(3);
  let examSyllabus = $state('8-12');
  let examTargetBlocks = $state(4);

  async function completeOnboarding() {
    // 1. Save Settings
    await api.updateSettings({
      daily_block_target: dailyTarget,
      academic_cutoff_hour: cutoffHour,
      onboarding_completed: true,
      last_active_academic_date: new Date().toISOString().substring(0, 10)
    });

    // 2. Create Courses
    const createdCourses = [];
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
        location: 'Hall A'
      });
      await api.createRoutineSlot({
        course_id: createdCourses[1].id,
        day_of_week: 1, // Mon
        start_time: '14:00',
        end_time: '15:30',
        location: 'Lab 2'
      });
    }

    // 4. Create First Assessment if configured
    if (examTitle.trim() && createdCourses.length > 0) {
      const targetCourse = createdCourses.find(c => c.code === examCourseCode) || createdCourses[0];
      const examDate = new Date();
      examDate.setDate(examDate.getDate() + examDaysAhead);
      examDate.setHours(10, 0, 0, 0);

      await api.createAssessment({
        course_id: targetCourse.id,
        title: examTitle.trim(),
        assessment_type: examType,
        exam_date: examDate.toISOString(),
        syllabus_range: examSyllabus.trim() || 'ALL',
        revision_target_blocks: examTargetBlocks
      });
    }

    await store.refreshSnapshot();
    store.showToast('Welcome to Orian! Your academic workspace is ready.');
    store.setView('dashboard');
  }
</script>

<div class="onboarding-container">
  <div class="wizard-header">
    <div class="wizard-logo">
      <span class="logo-dot"></span>
      <span class="logo-text">Orian Setup</span>
    </div>
    <div class="step-indicator tabular-nums">
      Step {step} of 4
    </div>
  </div>

  <div class="wizard-body">
    {#if step === 1}
      <div class="step-card">
        <div class="step-icon">
          <Compass size={24} strokeWidth={1.75} />
        </div>
        <h2>Daily Rhythm & Academic Day Cutoff</h2>
        <p>
          Configure how Orian measures your study capacity. Late-night study sessions before 4:00 AM are counted toward yesterday's effort budget so your streaks and daily plans stay honest.
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label for="daily-target">Daily Focus Capacity Target</label>
            <div class="input-with-hint">
              <input id="daily-target" type="number" min="1" max="16" bind:value={dailyTarget} />
              <span class="field-unit">Blocks / day (25m each)</span>
            </div>
            <span class="field-hint">6 blocks ≈ 2.5 hours of pure focus. Recommended for university semesters.</span>
          </div>

          <div class="form-group">
            <label for="cutoff-hour">Academic Day Cutoff Hour</label>
            <div class="input-with-hint">
              <input id="cutoff-hour" type="number" min="0" max="8" bind:value={cutoffHour} />
              <span class="field-unit">:00 AM</span>
            </div>
            <span class="field-hint">Default 4:00 AM: Sessions completed at 2:30 AM belong to tonight's budget.</span>
          </div>
        </div>

        <div class="step-actions">
          <button class="primary" onclick={() => step = 2}>
            <span>Continue to Courses</span>
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    {:else if step === 2}
      <div class="step-card">
        <div class="step-icon">
          <BookOpen size={24} strokeWidth={1.75} />
        </div>
        <h2>Enrolled Semester Courses</h2>
        <p>
          Add the courses you are currently attending. You can adjust individual course effort multipliers (0.5x to 2.0x) anytime to smoothly shift study hours toward harder subjects.
        </p>

        <div class="courses-preview-list">
          {#each coursesList as crs, idx}
            <div class="course-row">
              <span class="course-code-badge">{crs.code}</span>
              <span class="course-name-label">{crs.name}</span>
              <span class="course-mult-badge">{crs.effort_multiplier}x effort</span>
              <button class="ghost mini-del" onclick={() => removeCourse(idx)}>Remove</button>
            </div>
          {/each}
        </div>

        <div class="add-course-bar">
          <input type="text" placeholder="Course Code (e.g. CS101)" bind:value={newCourseCode} />
          <input type="text" placeholder="Course Title" bind:value={newCourseName} />
          <button type="button" onclick={addCourse}>+ Add</button>
        </div>

        <div class="step-actions split">
          <button class="ghost" onclick={() => step = 1}>Back</button>
          <button class="primary" onclick={() => step = 3}>
            <span>Continue to Routine</span>
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    {:else if step === 3}
      <div class="step-card">
        <div class="step-icon">
          <Calendar size={24} strokeWidth={1.75} />
        </div>
        <h2>Weekly Class Timetable</h2>
        <p>
          Orian sets up your recurring Monday to Friday routine slots so today's live classes generate review shields automatically. You can tweak exact room locations and times later in the Routine view.
        </p>

        <div class="routine-preview-box">
          <div class="preview-slot">
            <span class="day-tag">Monday 10:00 - 11:30</span>
            <span class="course-tag">{coursesList[0]?.code || 'Course 1'} Lecture</span>
          </div>
          <div class="preview-slot">
            <span class="day-tag">Monday 14:00 - 15:30</span>
            <span class="course-tag">{coursesList[1]?.code || 'Course 2'} Lecture</span>
          </div>
        </div>

        <div class="step-actions split">
          <button class="ghost" onclick={() => step = 2}>Back</button>
          <button class="primary" onclick={() => step = 4}>
            <span>Continue to First Assessment</span>
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    {:else if step === 4}
      <div class="step-card">
        <div class="step-icon">
          <GraduationCap size={24} strokeWidth={1.75} />
        </div>
        <h2>First Assessment & Exam Triage</h2>
        <p>
          Do you have an upcoming Class Test, Quiz, or Midterm? Orian will isolate your unwatched syllabus lectures and automatically shift tonight's focus budget toward it.
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label for="exam-title">Assessment Title</label>
            <input id="exam-title" type="text" bind:value={examTitle} />
          </div>

          <div class="form-group">
            <label for="exam-type">Type</label>
            <select id="exam-type" bind:value={examType}>
              <option value="CT">Class Test (CT)</option>
              <option value="Quiz">Quiz</option>
              <option value="Midterm">Midterm Exam</option>
              <option value="Final">Final Exam</option>
            </select>
          </div>

          <div class="form-group">
            <label for="exam-days">Scheduled In</label>
            <div class="input-with-hint">
              <input id="exam-days" type="number" min="1" max="60" bind:value={examDaysAhead} />
              <span class="field-unit">Days from today</span>
            </div>
          </div>

          <div class="form-group">
            <label for="exam-syllabus">Syllabus Lectures</label>
            <input id="exam-syllabus" type="text" placeholder="e.g. 8-12 or All" bind:value={examSyllabus} />
          </div>
        </div>

        <div class="step-actions split">
          <button class="ghost" onclick={() => step = 3}>Back</button>
          <button class="primary" onclick={completeOnboarding}>
            <Check size={14} strokeWidth={1.75} />
            <span>Launch Orian Battle Plan</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .onboarding-container {
    max-width: 640px;
    margin: 40px auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 0 16px;
  }

  .wizard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .wizard-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-dot {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
  }

  .logo-text {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
  }

  .step-indicator {
    font-size: 13px;
    color: var(--ink-muted);
  }

  .step-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-sm);
  }

  .step-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding-top: 8px;
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

  .input-with-hint {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-unit {
    font-size: 12px;
    color: var(--ink-muted);
    white-space: nowrap;
  }

  .field-hint {
    font-size: 11px;
    color: var(--ink-muted);
    line-height: 1.4;
  }

  .courses-preview-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .course-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--bg-subtle);
    border-radius: var(--radius-xs);
  }

  .course-code-badge {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 12px;
  }

  .course-name-label {
    flex: 1;
    font-size: 13px;
  }

  .course-mult-badge {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    background: var(--accent-emerald-subtle);
    color: var(--accent-emerald-ink);
  }

  .mini-del {
    font-size: 11px;
    padding: 2px 6px;
    color: var(--accent-crimson);
  }

  .add-course-bar {
    display: flex;
    gap: 8px;
  }

  .routine-preview-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--bg-subtle);
    border-radius: var(--radius-xs);
  }

  .preview-slot {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .day-tag {
    color: var(--ink-muted);
  }

  .course-tag {
    font-weight: 600;
  }

  .step-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
  }

  .step-actions.split {
    justify-content: space-between;
  }
</style>
