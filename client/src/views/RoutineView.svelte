<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import {
    CalendarDays,
    BookOpen,
    GraduationCap,
    Plus,
    Trash2,
    CalendarPlus,
    Video,
    BookMarked,
    Clock,
    Gauge
  } from '@lucide/svelte';

  // Course modal state
  let showAddCourseModal = $state(false);
  let newCourseName = $state('');
  let newCourseCode = $state('');
  let newCourseColor = $state('#1A6B4E');
  let newCourseMultiplier = $state(1.0);

  // Assessment modal state
  let showAddExamModal = $state(false);
  let examTitle = $state('');
  let examType = $state('CT');
  let examCourseId = $state('');
  let examDate = $state(new Date().toISOString().substring(0, 10));
  let examTime = $state('10:00');
  let examSyllabus = $state('8-12');
  let examRevisionTarget = $state(4);

  // Timetable slot modal state
  let showAddSlotModal = $state(false);
  let slotCourseId = $state('');
  let slotDay = $state(1); // Monday
  let slotStart = $state('10:00');
  let slotEnd = $state('11:30');
  let slotLocation = $state('');

  const weekdays = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 0, name: 'Sunday' }
  ];

  async function handleAddCourse() {
    if (!newCourseCode.trim()) return;
    await api.createCourse({
      name: newCourseName.trim() || newCourseCode.trim(),
      code: newCourseCode.trim().toUpperCase(),
      color: newCourseColor,
      effort_multiplier: parseFloat(newCourseMultiplier) || 1.0
    });
    newCourseName = '';
    newCourseCode = '';
    showAddCourseModal = false;
    store.showToast('Course added successfully.');
    await store.refreshSnapshot();
  }

  async function handleUpdateMultiplier(courseId, newMult) {
    await api.updateCourse(courseId, { effort_multiplier: newMult });
    store.showToast(`Effort multiplier updated to ${newMult}x.`);
    await store.refreshSnapshot();
  }

  let confirmingCourseId = $state(null);
  let courseTimeout = null;

  async function handleDeleteCourse(id) {
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

  async function handleAddExam() {
    if (!examTitle.trim() || !examCourseId) return;
    const fullDate = `${examDate}T${examTime}:00`;
    await api.createAssessment({
      course_id: examCourseId,
      title: examTitle.trim(),
      assessment_type: examType,
      exam_date: fullDate,
      syllabus_range: examSyllabus.trim() || 'ALL',
      revision_target_blocks: parseInt(examRevisionTarget, 10) || 4
    });
    showAddExamModal = false;
    examTitle = '';
    store.showToast('Assessment scheduled. Exam Radar updated!');
    await store.refreshSnapshot();
  }

  let confirmingExamId = $state(null);
  let examTimeout = null;

  async function handleDeleteExam(id) {
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

  async function handleAddSlot() {
    if (!slotCourseId) return;
    try {
      await api.createRoutineSlot({
        course_id: slotCourseId,
        day_of_week: parseInt(slotDay, 10),
        start_time: slotStart,
        end_time: slotEnd,
        location: slotLocation.trim()
      });
      showAddSlotModal = false;
      store.showToast('Routine timeslot added.');
      await store.refreshSnapshot();
    } catch (err) {
      store.showToast(err.message, 'error');
    }
  }

  let confirmingSlotId = $state(null);
  let slotTimeout = null;

  async function handleDeleteSlot(id) {
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
</script>

<div class="stage-content">
  <div class="view-header">
    <div>
      <h1>Routine, Courses & Exams</h1>
      <p>
        Manage courses, set effort multipliers, track recurring weekly timetable, and configure upcoming exams.
      </p>
    </div>

    <div class="header-actions">
      <button class="ghost" onclick={() => store.openDisruptionModal()}>
        <CalendarPlus size={14} strokeWidth={1.75} />
        <span>Disruption / Makeup</span>
      </button>
      <button class="primary" onclick={() => showAddCourseModal = true}>
        <Plus size={14} strokeWidth={1.75} />
        <span>+ Add Course</span>
      </button>
    </div>
  </div>

  <!-- Course Effort Multipliers Panel -->
  <section class="config-section">
    <div class="section-title-row">
      <div class="title-with-icon">
        <Gauge size={16} strokeWidth={1.75} class="section-icon" />
        <h2>Course Effort Multipliers</h2>
      </div>
      <span class="section-desc">Shift study hours toward demanding courses (0.5x Light to 2.0x Heavy).</span>
    </div>

    <div class="courses-grid">
      {#each store.snapshot?.courses || [] as course}
        <div class="course-card">
          <div class="card-header">
            <span class="course-color-bar" style="background: {course.color || '#1A6B4E'}"></span>
            <div class="course-titles">
              <span class="course-code">{course.code}</span>
              <span class="course-name">{course.name}</span>
            </div>
            <button
              class="ghost delete-icon-btn {confirmingCourseId === course.id ? 'confirming-active' : ''}"
              onclick={() => handleDeleteCourse(course.id)}
              title={confirmingCourseId === course.id ? 'Click again to confirm delete' : 'Delete Course'}
            >
              {#if confirmingCourseId === course.id}
                <span class="confirm-del-text">Confirm?</span>
              {:else}
                <Trash2 size={13} strokeWidth={1.75} />
              {/if}
            </button>
          </div>

          <div class="multiplier-control">
            <label>Effort Multiplier:</label>
            <div class="multiplier-pills">
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
  </section>

  <!-- Scheduled Assessments Panel -->
  <section class="config-section">
    <div class="section-title-row">
      <div class="title-with-icon">
        <GraduationCap size={16} strokeWidth={1.75} class="section-icon" />
        <h2>Assessments & Exams</h2>
      </div>
      <button class="primary mini-btn" onclick={() => {
        if (store.snapshot?.courses?.length) {
          examCourseId = store.snapshot.courses[0].id;
        }
        showAddExamModal = true;
      }}>
        <Plus size={13} strokeWidth={1.75} />
        <span>Schedule Exam / CT</span>
      </button>
    </div>

    <div class="exams-table-wrapper">
      {#if store.snapshot?.upcomingExams?.length}
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Assessment</th>
              <th>Type</th>
              <th>Exam Date</th>
              <th>Syllabus Range</th>
              <th>Target Blocks</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each store.snapshot.upcomingExams as ex}
              <tr>
                <td class="font-mono font-bold">{ex.course_code}</td>
                <td>{ex.title}</td>
                <td><span class="tag tag-neutral">{ex.assessment_type}</span></td>
                <td class="tabular-nums">{ex.exam_date.replace('T', ' ')}</td>
                <td class="font-mono">{ex.syllabus_range}</td>
                <td class="tabular-nums">{ex.revision_target_blocks} blocks</td>
                <td>
                  <button
                    class="ghost mini-del {confirmingExamId === ex.id ? 'confirming-active' : ''}"
                    onclick={() => handleDeleteExam(ex.id)}
                    title={confirmingExamId === ex.id ? 'Click again to confirm delete' : 'Delete'}
                  >
                    {confirmingExamId === ex.id ? 'Confirm?' : 'Delete'}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="empty-hint-card">
          <p>No upcoming exams scheduled. Click "+ Schedule Exam / CT" to set your exam dates.</p>
        </div>
      {/if}
    </div>
  </section>

  <!-- Weekly Timetable Grid -->
  <section class="config-section">
    <div class="section-title-row">
      <div class="title-with-icon">
        <CalendarDays size={16} strokeWidth={1.75} class="section-icon" />
        <h2>Weekly Class Timetable</h2>
      </div>
      <button class="primary mini-btn" onclick={() => {
        if (store.snapshot?.courses?.length) {
          slotCourseId = store.snapshot.courses[0].id;
        }
        showAddSlotModal = true;
      }}>
        <Plus size={13} strokeWidth={1.75} />
        <span>+ Add Class Slot</span>
      </button>
    </div>

    <div class="timetable-grid">
      {#each weekdays as day}
        <div class="day-column">
          <div class="day-header">{day.name}</div>
          <div class="day-slots">
            {#each (store.snapshot?.routineSlots || []).filter(s => s.day_of_week === day.id) as slot}
              <div class="slot-card">
                <div class="slot-header">
                  <span class="slot-course-code" style="color: {slot.course_color || 'var(--accent-emerald)'}">
                    {slot.course_code || 'Class'}
                  </span>
                  <button
                    class="ghost mini-slot-del {confirmingSlotId === slot.id ? 'confirming-active' : ''}"
                    onclick={() => handleDeleteSlot(slot.id)}
                    title={confirmingSlotId === slot.id ? 'Click again to remove slot' : 'Remove slot'}
                  >
                    {#if confirmingSlotId === slot.id}
                      <span class="confirm-slot-txt">&check;</span>
                    {:else}
                      <Trash2 size={11} strokeWidth={1.75} />
                    {/if}
                  </button>
                </div>
                <div class="slot-time font-mono">{slot.start_time} &ndash; {slot.end_time}</div>
                {#if slot.location}
                  <div class="slot-location">{slot.location}</div>
                {/if}
              </div>
            {/each}
            <div class="slot-add-placeholder">
              <button
                class="ghost slot-plus-btn"
                onclick={() => {
                  slotDay = day.id;
                  if (store.snapshot?.courses?.length) slotCourseId = store.snapshot.courses[0].id;
                  showAddSlotModal = true;
                }}
              >
                + Add slot
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<!-- Modal: Add Course -->
{#if showAddCourseModal}
  <div class="modal-backdrop" onclick={() => showAddCourseModal = false} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
      <h2>Add Enrolled Course</h2>
      <div class="form-grid">
        <div class="form-group">
          <label for="c-code">Course Code</label>
          <input id="c-code" type="text" placeholder="e.g. CS101" bind:value={newCourseCode} />
        </div>
        <div class="form-group">
          <label for="c-name">Course Name</label>
          <input id="c-name" type="text" placeholder="e.g. Computer Science I" bind:value={newCourseName} />
        </div>
        <div class="form-group">
          <label for="c-color">Theme Color</label>
          <input id="c-color" type="color" bind:value={newCourseColor} />
        </div>
        <div class="form-group">
          <label for="c-mult">Effort Multiplier</label>
          <select id="c-mult" bind:value={newCourseMultiplier}>
            <option value="0.5">0.5x (Light)</option>
            <option value="1.0">1.0x (Normal)</option>
            <option value="1.5">1.5x (Heavy Focus)</option>
            <option value="2.0">2.0x (Intensive)</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="ghost" onclick={() => showAddCourseModal = false}>Cancel</button>
        <button class="primary" onclick={handleAddCourse}>Save Course</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Add Assessment -->
{#if showAddExamModal}
  <div class="modal-backdrop" onclick={() => showAddExamModal = false} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
      <h2>Schedule Assessment / Exam</h2>
      <div class="form-grid">
        <div class="form-group">
          <label for="ex-course">Course</label>
          <select id="ex-course" bind:value={examCourseId}>
            {#each store.snapshot?.courses || [] as crs}
              <option value={crs.id}>{crs.code} — {crs.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="ex-title">Assessment Title</label>
          <input id="ex-title" type="text" placeholder="e.g. Class Test 2" bind:value={examTitle} />
        </div>
        <div class="form-group">
          <label for="ex-type">Type</label>
          <select id="ex-type" bind:value={examType}>
            <option value="CT">Class Test (CT)</option>
            <option value="Quiz">Quiz</option>
            <option value="Midterm">Midterm Exam</option>
            <option value="Final">Final Exam</option>
          </select>
        </div>
        <div class="form-group">
          <label for="ex-date">Exam Date</label>
          <input id="ex-date" type="date" bind:value={examDate} />
        </div>
        <div class="form-group">
          <label for="ex-time">Exam Time</label>
          <input id="ex-time" type="time" bind:value={examTime} />
        </div>
        <div class="form-group">
          <label for="ex-syllabus">Syllabus Range</label>
          <input id="ex-syllabus" type="text" placeholder="e.g. 8-12 or All" bind:value={examSyllabus} />
        </div>
        <div class="form-group">
          <label for="ex-target">Practice Target (Blocks)</label>
          <input id="ex-target" type="number" min="1" max="30" bind:value={examRevisionTarget} />
        </div>
      </div>
      <div class="modal-actions">
        <button class="ghost" onclick={() => showAddExamModal = false}>Cancel</button>
        <button class="primary" onclick={handleAddExam}>Schedule Assessment</button>
      </div>
    </div>
  </div>
{/if}

<!-- Modal: Add Slot -->
{#if showAddSlotModal}
  <div class="modal-backdrop" onclick={() => showAddSlotModal = false} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog">
      <h2>Add Routine Class Slot</h2>
      <div class="form-grid">
        <div class="form-group">
          <label for="sl-course">Course</label>
          <select id="sl-course" bind:value={slotCourseId}>
            {#each store.snapshot?.courses || [] as crs}
              <option value={crs.id}>{crs.code} — {crs.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="sl-day">Weekday</label>
          <select id="sl-day" bind:value={slotDay}>
            {#each weekdays as day}
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
          <label for="sl-loc">Location / Room</label>
          <input id="sl-loc" type="text" placeholder="e.g. Room 402" bind:value={slotLocation} />
        </div>
      </div>
      <div class="modal-actions">
        <button class="ghost" onclick={() => showAddSlotModal = false}>Cancel</button>
        <button class="primary" onclick={handleAddSlot}>Save Slot</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .config-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-desc {
    font-size: 12px;
    color: var(--ink-muted);
  }

  .courses-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .course-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--shadow-sm);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .course-color-bar {
    width: 6px;
    height: 32px;
    border-radius: 2px;
  }

  .course-titles {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .course-code {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 13px;
  }

  .course-name {
    font-size: 12px;
    color: var(--ink-secondary);
  }

  .delete-icon-btn {
    padding: 4px;
    color: var(--accent-crimson);
  }

  .multiplier-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .multiplier-control label {
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-muted);
    text-transform: uppercase;
  }

  .multiplier-pills {
    display: flex;
    gap: 6px;
  }

  .mult-pill {
    flex: 1;
    padding: 4px;
    font-size: 12px;
    font-weight: 500;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .mult-pill.active {
    background: var(--accent-emerald-subtle);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 700;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .data-table th, .data-table td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border-subtle);
  }

  .data-table th {
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-muted);
    text-transform: uppercase;
    background: var(--bg-subtle);
  }

  .font-bold {
    font-weight: 700;
  }

  .mini-del {
    font-size: 11px;
    color: var(--accent-crimson);
  }

  .empty-hint-card {
    background: var(--bg-surface);
    border: 1px dashed var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 24px;
    text-align: center;
    color: var(--ink-muted);
    font-size: 13px;
  }

  .timetable-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    overflow-x: auto;
  }

  .day-column {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    min-width: 130px;
    display: flex;
    flex-direction: column;
  }

  .day-header {
    font-size: 12px;
    font-weight: 600;
    padding: 8px;
    text-align: center;
    background: var(--bg-subtle);
    border-bottom: 1px solid var(--border-subtle);
    color: var(--ink-primary);
  }

  .day-slots {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 120px;
  }

  .slot-plus-btn {
    width: 100%;
    font-size: 11px;
    padding: 4px;
    color: var(--ink-muted);
    border: 1px dashed var(--border-subtle);
  }

  .slot-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: var(--shadow-sm);
  }

  .slot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .slot-course-code {
    font-size: 11px;
    font-weight: 700;
  }

  .mini-slot-del {
    padding: 2px;
    color: var(--accent-crimson);
  }

  .mini-slot-del.confirming-active {
    background: var(--accent-crimson-subtle);
    border-radius: var(--radius-full);
  }

  .confirm-slot-txt {
    font-size: 10px;
    font-weight: bold;
    color: var(--accent-crimson);
  }

  .slot-time {
    font-size: 10px;
    color: var(--ink-secondary);
  }

  .slot-location {
    font-size: 10px;
    color: var(--ink-muted);
  }

  .confirm-del-text {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent-crimson);
  }

  .delete-icon-btn.confirming-active {
    background: var(--accent-crimson-subtle);
    border: 1px solid var(--accent-crimson);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
  }

  .mini-del.confirming-active {
    color: var(--accent-crimson);
    font-weight: 700;
    text-decoration: underline;
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    width: 480px;
    max-width: 90vw;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: var(--shadow-lg);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
</style>
