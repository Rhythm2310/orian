<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import {
    CalendarDays,
    BookOpen,
    GraduationCap,
    Plus,
    Trash2,
    CalendarPlus,
    Video,
    Clock,
    Gauge,
    Check,
    X,
    Calendar,
    Flame
  } from '@lucide/svelte';
  import type { AssessmentType, Course, Assessment, RoutineSlot } from '../lib/types.ts';

  // Active Tab
  type ActiveTab = 'timetable' | 'courses' | 'assessments';
  let activeTab = $state<ActiveTab>('timetable');

  // Course modal state
  let showAddCourseModal = $state<boolean>(false);
  let newCourseName = $state<string>('');
  let newCourseCode = $state<string>('');
  let newCourseColor = $state<string>('#1A6B4E');
  let newCourseMultiplier = $state<number>(1.0);

  // Assessment modal state
  let showAddExamModal = $state<boolean>(false);
  let examTitle = $state<string>('');
  let examType = $state<AssessmentType>('CT');
  let examCourseId = $state<string>('');
  let examDate = $state<string>(new Date().toISOString().substring(0, 10));
  let examTime = $state<string>('10:00');
  let examSyllabus = $state<string>('8-12');
  let examRevisionTarget = $state<number>(4);

  // Timetable slot modal state
  let showAddSlotModal = $state<boolean>(false);
  let slotCourseId = $state<string>('');
  let slotDay = $state<number>(1); // Monday
  let slotStart = $state<string>('10:00');
  let slotEnd = $state<string>('11:30');
  let slotLocation = $state<string>('');

  const weekdays = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 0, name: 'Sunday' }
  ];

  async function handleAddCourse(): Promise<void> {
    if (!newCourseCode.trim()) return;
    await api.createCourse({
      name: newCourseName.trim() || newCourseCode.trim(),
      code: newCourseCode.trim().toUpperCase(),
      color: newCourseColor,
      effort_multiplier: Number(newCourseMultiplier) || 1.0
    });
    newCourseName = '';
    newCourseCode = '';
    showAddCourseModal = false;
    store.showToast('Course added successfully.');
    await store.refreshSnapshot();
  }

  async function handleUpdateMultiplier(courseId: string, newMult: number): Promise<void> {
    await api.updateCourse(courseId, { effort_multiplier: newMult });
    store.showToast(`Effort multiplier updated to ${newMult}x.`);
    await store.refreshSnapshot();
  }

  let confirmingCourseId = $state<string | null>(null);
  let courseTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleDeleteCourse(id: string): Promise<void> {
    if (confirmingCourseId !== id) {
      confirmingCourseId = id;
      if (courseTimeout) clearTimeout(courseTimeout);
      courseTimeout = setTimeout(() => {
        confirmingCourseId = null;
      }, 4000);
      return;
    }
    confirmingCourseId = null;
    if (courseTimeout) clearTimeout(courseTimeout);
    await api.deleteCourse(id);
    store.showToast('Course deleted.');
    await store.refreshSnapshot();
  }

  async function handleAddExam(): Promise<void> {
    if (!examTitle.trim() || !examCourseId) return;
    const fullDate = `${examDate}T${examTime}:00`;
    await api.createAssessment({
      course_id: examCourseId,
      title: examTitle.trim(),
      assessment_type: examType,
      exam_date: fullDate,
      syllabus_range: examSyllabus.trim() || 'ALL',
      revision_target_blocks: Number(examRevisionTarget) || 4
    });
    showAddExamModal = false;
    examTitle = '';
    store.showToast('Assessment scheduled. Exam Radar updated!');
    await store.refreshSnapshot();
  }

  let confirmingExamId = $state<string | null>(null);
  let examTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleDeleteExam(id: string): Promise<void> {
    if (confirmingExamId !== id) {
      confirmingExamId = id;
      if (examTimeout) clearTimeout(examTimeout);
      examTimeout = setTimeout(() => {
        confirmingExamId = null;
      }, 4000);
      return;
    }
    confirmingExamId = null;
    if (examTimeout) clearTimeout(examTimeout);
    await api.deleteAssessment(id);
    store.showToast('Assessment deleted.');
    await store.refreshSnapshot();
  }

  async function handleAddSlot(): Promise<void> {
    if (!slotCourseId) return;
    try {
      await api.createRoutineSlot({
        course_id: slotCourseId,
        day_of_week: Number(slotDay),
        start_time: slotStart,
        end_time: slotEnd,
        room: slotLocation.trim()
      });
      showAddSlotModal = false;
      store.showToast('Routine timeslot added.');
      await store.refreshSnapshot();
    } catch (err) {
      store.showToast(err instanceof Error ? err.message : 'Error adding slot');
    }
  }

  let confirmingSlotId = $state<string | null>(null);
  let slotTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleDeleteSlot(id: string): Promise<void> {
    if (confirmingSlotId !== id) {
      confirmingSlotId = id;
      if (slotTimeout) clearTimeout(slotTimeout);
      slotTimeout = setTimeout(() => {
        confirmingSlotId = null;
      }, 4000);
      return;
    }
    confirmingSlotId = null;
    if (slotTimeout) clearTimeout(slotTimeout);
    await api.deleteRoutineSlot(id);
    store.showToast('Routine slot removed.');
    await store.refreshSnapshot();
  }

  function getSlotsForDay(dayId: number): RoutineSlot[] {
    return (store.snapshot?.courses ? (store.snapshot as unknown as { routineSlots?: RoutineSlot[] }).routineSlots || [] : [])
      .filter(s => s.day_of_week === dayId);
  }
</script>

<div class="stage-content">
  <!-- Header (F-Pattern Navigation Plane) -->
  <div class="view-header">
    <div class="header-left">
      <h1>Routine, Courses & Assessments</h1>
      <p>
        Set effort multipliers, configure recurring timetable slots, and manage exam syllabus targets.
      </p>
    </div>

    <div class="header-actions">
      <button type="button" class="ghost" onclick={() => store.openDisruptionModal()}>
        <CalendarPlus size={13} strokeWidth={1.75} />
        <span>Disruption / Makeup</span>
      </button>

      {#if activeTab === 'courses'}
        <button type="button" class="primary" onclick={() => showAddCourseModal = true}>
          <Plus size={13} strokeWidth={2} />
          <span>Add Course</span>
        </button>
      {:else if activeTab === 'assessments'}
        <button type="button" class="primary" onclick={() => showAddExamModal = true}>
          <Plus size={13} strokeWidth={2} />
          <span>Schedule Assessment</span>
        </button>
      {:else}
        <button type="button" class="primary" onclick={() => showAddSlotModal = true}>
          <Plus size={13} strokeWidth={2} />
          <span>Add Routine Slot</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Tab Selector Navigation -->
  <div class="tab-selector surface-card" role="tablist">
    <button
      type="button"
      class="tab-btn {activeTab === 'timetable' ? 'active' : ''}"
      onclick={() => activeTab = 'timetable'}
      role="tab"
      aria-selected={activeTab === 'timetable'}
    >
      <CalendarDays size={14} strokeWidth={1.75} />
      <span>Weekly Timetable</span>
    </button>

    <button
      type="button"
      class="tab-btn {activeTab === 'courses' ? 'active' : ''}"
      onclick={() => activeTab = 'courses'}
      role="tab"
      aria-selected={activeTab === 'courses'}
    >
      <Gauge size={14} strokeWidth={1.75} />
      <span>Course Effort Dials ({store.snapshot?.courses?.length || 0})</span>
    </button>

    <button
      type="button"
      class="tab-btn {activeTab === 'assessments' ? 'active' : ''}"
      onclick={() => activeTab = 'assessments'}
      role="tab"
      aria-selected={activeTab === 'assessments'}
    >
      <GraduationCap size={14} strokeWidth={1.75} />
      <span>Assessments & Exams ({store.snapshot?.upcomingExams?.length || 0})</span>
    </button>
  </div>

  <!-- Tab 1: Weekly Timetable -->
  {#if activeTab === 'timetable'}
    <div class="timetable-grid">
      {#each weekdays as day (day.id)}
        <div class="day-column surface-card">
          <div class="day-header">
            <span class="day-name">{day.name}</span>
            <button
              type="button"
              class="ghost mini-add"
              onclick={() => { slotDay = day.id; showAddSlotModal = true; }}
              title="Add slot for {day.name}"
              aria-label="Add slot for {day.name}"
            >
              <Plus size={12} strokeWidth={2} />
            </button>
          </div>

          <div class="day-slots">
            {#each getSlotsForDay(day.id) as slot (slot.id)}
              <div class="slot-pill" style="border-left-color: {slot.course_color || '#1A6B4E'}">
                <div class="slot-main">
                  <span class="slot-code">{slot.course_code || 'Lecture'}</span>
                  <span class="slot-time tabular-nums">{slot.start_time} - {slot.end_time}</span>
                  {#if slot.room}
                    <span class="slot-room">{slot.room}</span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="ghost slot-del-btn {confirmingSlotId === slot.id ? 'confirming' : ''}"
                  onclick={() => handleDeleteSlot(slot.id)}
                  title={confirmingSlotId === slot.id ? 'Click to confirm delete' : 'Delete slot'}
                  aria-label="Delete slot"
                >
                  {#if confirmingSlotId === slot.id}
                    <Check size={11} strokeWidth={2} />
                  {:else}
                    <Trash2 size={11} strokeWidth={1.75} />
                  {/if}
                </button>
              </div>
            {/each}

            {#if getSlotsForDay(day.id).length === 0}
              <div class="no-slots-hint">No scheduled classes</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Tab 2: Course Effort Multipliers Panel -->
  {#if activeTab === 'courses'}
    <div class="courses-panel surface-card leading-line">
      <div class="panel-header">
        <h2>Course Effort Multipliers</h2>
        <p class="panel-desc">Shift study hours toward demanding courses (0.5x Light to 2.0x Heavy Focus). Affects proportional daily block allocation.</p>
      </div>

      <div class="courses-cards-grid">
        {#each store.snapshot?.courses || [] as course (course.id)}
          <div class="course-card surface-card">
            <div class="course-card-top">
              <div class="code-and-color">
                <span class="color-swatch" style="background: {course.color || '#1A6B4E'}"></span>
                <span class="course-code-badge font-mono">{course.code}</span>
              </div>
              <button
                type="button"
                class="ghost del-btn {confirmingCourseId === course.id ? 'confirming' : ''}"
                onclick={() => handleDeleteCourse(course.id)}
                title={confirmingCourseId === course.id ? 'Click to confirm delete' : 'Delete course'}
                aria-label="Delete course"
              >
                {#if confirmingCourseId === course.id}
                  <Check size={12} strokeWidth={2} />
                {:else}
                  <Trash2 size={12} strokeWidth={1.75} />
                {/if}
              </button>
            </div>

            <div class="course-name-text">{course.name}</div>

            <!-- Effort Multiplier Dial Buttons -->
            <div class="multiplier-control">
              <span class="control-label">Focus Multiplier:</span>
              <div class="multiplier-options">
                {#each [0.5, 1.0, 1.5, 2.0] as mult}
                  <button
                    type="button"
                    class="mult-pill {course.effort_multiplier === mult ? 'active' : ''}"
                    onclick={() => handleUpdateMultiplier(course.id, mult)}
                  >
                    {mult}x
                  </button>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Tab 3: Assessments & Exams Panel -->
  {#if activeTab === 'assessments'}
    <div class="assessments-panel surface-card leading-line">
      <div class="panel-header">
        <h2>Scheduled Assessments & Exams</h2>
        <p class="panel-desc">CTs, Midterms, and Finals automatically trigger proportional reallocation and exam crunch shields.</p>
      </div>

      <div class="assessments-table-wrap">
        {#if (store.snapshot?.upcomingExams || []).length > 0}
          <table class="assessments-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Course</th>
                <th>Title</th>
                <th>Exam Date & Time</th>
                <th>Syllabus Range</th>
                <th>Practice Target</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each store.snapshot?.upcomingExams || [] as exam (exam.id)}
                <tr>
                  <td><span class="tag tag-amber">{exam.assessment_type}</span></td>
                  <td><span class="font-mono font-bold">{exam.course_code || 'Course'}</span></td>
                  <td class="font-semibold">{exam.title}</td>
                  <td class="tabular-nums">{exam.exam_date}</td>
                  <td><span class="font-mono">{exam.syllabus_range}</span></td>
                  <td class="tabular-nums">{exam.revision_target_blocks} blocks</td>
                  <td>
                    <button
                      type="button"
                      class="ghost icon-btn {confirmingExamId === exam.id ? 'confirming' : ''}"
                      onclick={() => handleDeleteExam(exam.id)}
                      title={confirmingExamId === exam.id ? 'Click to confirm delete' : 'Delete assessment'}
                      aria-label="Delete assessment"
                    >
                      {#if confirmingExamId === exam.id}
                        <Check size={12} strokeWidth={2} />
                      {:else}
                        <Trash2 size={12} strokeWidth={1.75} />
                      {/if}
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <div class="empty-state">
            <p>No upcoming exams scheduled. Click "+ Schedule Assessment" above to register upcoming CTs or Finals.</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Modal: Add Course -->
{#if showAddCourseModal}
  <div class="modal-root" onkeydown={(e) => { if (e.key === 'Escape') showAddCourseModal = false; }} role="presentation">
    <button
      type="button"
      class="modal-backdrop"
      onclick={() => showAddCourseModal = false}
      aria-label="Close add course dialog"
      tabindex="-1"
    ></button>
    <div
      class="modal-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-course-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="add-course-title">Add Course</h2>
        <button type="button" class="ghost icon-btn" onclick={() => showAddCourseModal = false} aria-label="Close">
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="c-code">Course Code</label>
          <input id="c-code" type="text" placeholder="e.g. CS201" bind:value={newCourseCode} />
        </div>
        <div class="form-group">
          <label for="c-name">Course Name</label>
          <input id="c-name" type="text" placeholder="e.g. Data Structures" bind:value={newCourseName} />
        </div>
        <div class="form-group">
          <label for="c-color">Color Marker</label>
          <input id="c-color" type="color" bind:value={newCourseColor} />
        </div>
        <div class="form-group">
          <label for="c-mult">Initial Effort Multiplier</label>
          <select id="c-mult" bind:value={newCourseMultiplier}>
            <option value={0.5}>0.5x (Light Course)</option>
            <option value={1.0}>1.0x (Standard Focus)</option>
            <option value={1.5}>1.5x (Challenging / Priority)</option>
            <option value={2.0}>2.0x (Critical Heavy Focus)</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="ghost" onclick={() => showAddCourseModal = false}>Cancel</button>
        <button type="button" class="primary" onclick={handleAddCourse}>Save Course</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Schedule Assessment -->
{#if showAddExamModal}
  <div class="modal-root" onkeydown={(e) => { if (e.key === 'Escape') showAddExamModal = false; }} role="presentation">
    <button
      type="button"
      class="modal-backdrop"
      onclick={() => showAddExamModal = false}
      aria-label="Close schedule assessment dialog"
      tabindex="-1"
    ></button>
    <div
      class="modal-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-exam-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="add-exam-title">Schedule Assessment / Exam</h2>
        <button type="button" class="ghost icon-btn" onclick={() => showAddExamModal = false} aria-label="Close">
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="e-course">Course</label>
          <select id="e-course" bind:value={examCourseId}>
            <option value="">Select course...</option>
            {#each store.snapshot?.courses || [] as crs (crs.id)}
              <option value={crs.id}>{crs.code} — {crs.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="e-type">Assessment Type</label>
          <select id="e-type" bind:value={examType}>
            <option value="CT">Class Test (CT / Quiz)</option>
            <option value="MIDTERM">Midterm Exam</option>
            <option value="FINAL">Final Exam</option>
          </select>
        </div>
        <div class="form-group">
          <label for="e-title">Assessment Title</label>
          <input id="e-title" type="text" placeholder="e.g. CT 2 on Dynamic Programming" bind:value={examTitle} />
        </div>
        <div class="form-group">
          <label for="e-date">Exam Date</label>
          <input id="e-date" type="date" bind:value={examDate} />
        </div>
        <div class="form-group">
          <label for="e-time">Exam Time</label>
          <input id="e-time" type="time" bind:value={examTime} />
        </div>
        <div class="form-group">
          <label for="e-syl">Syllabus Range (Lectures)</label>
          <input id="e-syl" type="text" placeholder="e.g. 8-12 or ALL" bind:value={examSyllabus} />
        </div>
        <div class="form-group">
          <label for="e-rev">Revision Target (Pomodoro Blocks)</label>
          <input id="e-rev" type="number" min="1" max="20" bind:value={examRevisionTarget} />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="ghost" onclick={() => showAddExamModal = false}>Cancel</button>
        <button type="button" class="primary" onclick={handleAddExam}>Schedule Assessment</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Add Routine Slot -->
{#if showAddSlotModal}
  <div class="modal-root" onkeydown={(e) => { if (e.key === 'Escape') showAddSlotModal = false; }} role="presentation">
    <button
      type="button"
      class="modal-backdrop"
      onclick={() => showAddSlotModal = false}
      aria-label="Close add slot dialog"
      tabindex="-1"
    ></button>
    <div
      class="modal-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-slot-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="add-slot-title">Add Timetable Slot</h2>
        <button type="button" class="ghost icon-btn" onclick={() => showAddSlotModal = false} aria-label="Close">
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label for="sl-course">Course</label>
          <select id="sl-course" bind:value={slotCourseId}>
            <option value="">Select course...</option>
            {#each store.snapshot?.courses || [] as crs (crs.id)}
              <option value={crs.id}>{crs.code} — {crs.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="sl-day">Weekday</label>
          <select id="sl-day" bind:value={slotDay}>
            {#each weekdays as day (day.id)}
              <option value={day.id}>{day.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="sl-start">Start Time</label>
          <input id="sl-start" type="time" bind:value={slotStart} />
        </div>
        <div class="form-group">
          <label for="sl-end">End Time</label>
          <input id="sl-end" type="time" bind:value={slotEnd} />
        </div>
        <div class="form-group">
          <label for="sl-room">Room / Location</label>
          <input id="sl-room" type="text" placeholder="e.g. Room 402" bind:value={slotLocation} />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="ghost" onclick={() => showAddSlotModal = false}>Cancel</button>
        <button type="button" class="primary" onclick={handleAddSlot}>Save Slot</button>
      </div>
    </div>
  </div>
{/if}

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

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .tab-selector {
    display: flex;
    gap: 4px;
    padding: 4px;
    background: var(--bg-surface);
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius-xs);
    font-size: 12.5px;
    font-weight: 500;
    color: var(--ink-secondary);
    background: transparent;
    border: 1px solid transparent;
  }

  .tab-btn:hover {
    background: var(--bg-hover);
    color: var(--ink-primary);
  }

  .tab-btn.active {
    background: var(--bg-stage);
    color: var(--accent-emerald-ink);
    border-color: var(--border-subtle);
    font-weight: 600;
  }

  /* Weekly Timetable Grid */
  .timetable-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--grid-3);
  }

  .day-column {
    display: flex;
    flex-direction: column;
    gap: var(--grid-2);
    padding: var(--grid-3);
    min-height: 280px;
    background: var(--bg-surface);
  }

  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .day-name {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-secondary);
  }

  .mini-add {
    padding: 2px;
    min-width: 18px;
    min-height: 18px;
  }

  .day-slots {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slot-pill {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 6px 8px;
    background: var(--bg-stage);
    border: 1px solid var(--border-subtle);
    border-left: 3px solid;
    border-radius: var(--radius-xs);
    gap: 4px;
  }

  .slot-main {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .slot-code {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--ink-primary);
  }

  .slot-time {
    font-size: 10px;
    color: var(--ink-muted);
  }

  .slot-room {
    font-size: 9.5px;
    color: var(--ink-secondary);
  }

  .slot-del-btn {
    padding: 2px;
    min-width: 18px;
    min-height: 18px;
    color: var(--ink-muted);
  }

  .slot-del-btn.confirming,
  .del-btn.confirming {
    background: var(--accent-crimson) !important;
    color: #FFFFFF !important;
  }

  .no-slots-hint {
    font-size: 10.5px;
    color: var(--ink-muted);
    font-style: italic;
    padding: 12px 0;
    text-align: center;
  }

  /* Courses Cards Grid */
  .courses-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--grid-3);
    margin-top: var(--grid-4);
  }

  .course-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: var(--grid-4);
    background: var(--bg-stage);
  }

  .course-card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .code-and-color {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .color-swatch {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
  }

  .course-code-badge {
    font-size: 13px;
    font-weight: 700;
  }

  .course-name-text {
    font-size: 12.5px;
    color: var(--ink-secondary);
  }

  .multiplier-control {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--border-subtle);
  }

  .control-label {
    font-size: 10.5px;
    color: var(--ink-muted);
    font-weight: 500;
  }

  .multiplier-options {
    display: flex;
    gap: 4px;
  }

  .mult-pill {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    padding: 3px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .mult-pill.active {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 700;
  }

  /* Assessments Table */
  .assessments-table-wrap {
    overflow-x: auto;
    margin-top: var(--grid-3);
  }

  .assessments-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }

  .assessments-table th {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--ink-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .assessments-table td {
    padding: 10px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--ink-primary);
  }

  /* Form & Modal Layouts */
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--grid-3);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: var(--grid-3);
  }

  .font-mono {
    font-family: var(--font-mono);
  }

  .font-bold {
    font-weight: 700;
  }

  .font-semibold {
    font-weight: 600;
  }
</style>
