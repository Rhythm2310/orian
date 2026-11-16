<script>
  import { store } from '../lib/store.svelte.js';
  import { api } from '../lib/api.js';
  import { Video, CalendarPlus, CalendarOff, X } from '@lucide/svelte';

  let disruptionType = $state('online_recorded');
  let selectedCourseId = $state('');
  let startTime = $state('10:00');
  let endTime = $state('11:30');
  let lectureNumber = $state(1);

  $effect(() => {
    if (store.disruptionTargetClass) {
      selectedCourseId = store.disruptionTargetClass.course_id;
      lectureNumber = store.disruptionTargetClass.lecture_number || 1;
    } else if (store.snapshot?.courses?.length && !selectedCourseId) {
      selectedCourseId = store.snapshot.courses[0].id;
    }
  });

  async function handleApply() {
    await api.handleClassDisruption({
      class_id: store.disruptionTargetClass ? store.disruptionTargetClass.id : null,
      course_id: selectedCourseId,
      disruptionType,
      date: store.snapshot?.academicDate || new Date().toISOString().substring(0, 10),
      startTime,
      endTime,
      lecture_number: lectureNumber
    });

    store.showToast('Schedule disruption applied cleanly. Recurring routine preserved.');
    store.closeDisruptionModal();
    await store.refreshSnapshot();
  }
</script>

{#if store.showDisruptionModal}
  <div class="modal-backdrop" onclick={() => store.closeDisruptionModal()} role="presentation">
    <div class="modal-card" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="disruption-title">
      <div class="modal-header">
        <h2 id="disruption-title">Routine Disruption Quick-Action</h2>
        <button class="ghost icon-btn" onclick={() => store.closeDisruptionModal()} aria-label="Close">
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

      <p class="modal-desc">
        Record schedule changes for today only. The recurring weekly routine is never permanently altered.
      </p>

      <div class="action-selector">
        <button
          type="button"
          class="selector-pill {disruptionType === 'online_recorded' ? 'active' : ''}"
          onclick={() => disruptionType = 'online_recorded'}
        >
          <Video size={14} strokeWidth={1.75} />
          <span>Switch Online / Recorded</span>
        </button>

        <button
          type="button"
          class="selector-pill {disruptionType === 'makeup' ? 'active' : ''}"
          onclick={() => disruptionType = 'makeup'}
        >
          <CalendarPlus size={14} strokeWidth={1.75} />
          <span>+ Off-Day Makeup</span>
        </button>

        <button
          type="button"
          class="selector-pill {disruptionType === 'cancelled' ? 'active' : ''}"
          onclick={() => disruptionType = 'cancelled'}
        >
          <CalendarOff size={14} strokeWidth={1.75} />
          <span>Cancel Today's Class</span>
        </button>
      </div>

      <div class="modal-form">
        <div class="form-row">
          <label for="disruption-course">Course</label>
          <select id="disruption-course" bind:value={selectedCourseId}>
            {#each store.snapshot?.courses || [] as crs}
              <option value={crs.id}>{crs.code} — {crs.name}</option>
            {/each}
          </select>
        </div>

        {#if disruptionType === 'makeup'}
          <div class="form-row grid-2">
            <div>
              <label for="disruption-start">Start Time</label>
              <input id="disruption-start" type="time" bind:value={startTime} />
            </div>
            <div>
              <label for="disruption-end">End Time</label>
              <input id="disruption-end" type="time" bind:value={endTime} />
            </div>
          </div>
          <div class="form-row">
            <label for="disruption-lecture">Lecture Number</label>
            <input id="disruption-lecture" type="number" min="1" bind:value={lectureNumber} />
          </div>
        {/if}

        {#if disruptionType === 'online_recorded'}
          <div class="guard-alert">
            <strong>Procrastination Guard:</strong> An uncompleted online class generates an urgent recovery item due within 48h to prevent invisible delay debt.
          </div>
        {/if}

        {#if disruptionType === 'cancelled'}
          <div class="guard-alert">
            <strong>Clean Exception:</strong> Tonight's shield for this class is removed. Next week's class remains unchanged.
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="ghost" onclick={() => store.closeDisruptionModal()}>Cancel</button>
        <button type="button" class="primary" onclick={handleApply}>Confirm Disruption</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 18, 0.6);
    backdrop-filter: blur(2px);
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

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    font-size: 18px;
  }

  .modal-desc {
    font-size: 13px;
    color: var(--ink-secondary);
  }

  .action-selector {
    display: flex;
    gap: 8px;
  }

  .selector-pill {
    flex: 1;
    font-size: 11px;
    padding: 8px 6px;
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .selector-pill.active {
    background: var(--bg-surface);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 600;
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-row label {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-secondary);
  }

  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .guard-alert {
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
    padding: 10px 12px;
    font-size: 12px;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 8px;
  }
</style>
