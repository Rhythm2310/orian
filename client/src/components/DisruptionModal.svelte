<script lang="ts">
  import { store } from '../lib/store.svelte.ts';
  import { api } from '../lib/api.ts';
  import { Video, CalendarPlus, CalendarOff, X, AlertCircle, ShieldAlert } from '@lucide/svelte';
  import type { DisruptionType } from '../lib/types.ts';

  let disruptionType = $state<DisruptionType>('online_recorded');
  let selectedCourseId = $state<string>('');
  let startTime = $state<string>('10:00');
  let endTime = $state<string>('11:30');
  let lectureNumber = $state<number>(1);

  $effect(() => {
    if (store.disruptionTargetClass) {
      selectedCourseId = store.disruptionTargetClass.course_id;
      lectureNumber = store.disruptionTargetClass.lecture_number || 1;
    } else if (store.snapshot?.courses?.length && !selectedCourseId) {
      selectedCourseId = store.snapshot.courses[0].id;
    }
  });

  async function handleApply(): Promise<void> {
    await api.handleClassDisruption({
      class_id: store.disruptionTargetClass ? store.disruptionTargetClass.id : undefined,
      course_id: selectedCourseId,
      disruptionType,
      date: store.snapshot?.academicDate || new Date().toISOString().substring(0, 10),
      startTime,
      endTime,
      lecture_number: Number(lectureNumber)
    });

    store.showToast('Schedule disruption applied. Recurring timetable preserved intact.');
    store.closeDisruptionModal();
    await store.refreshSnapshot();
  }

  let modalDialogEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (store.showDisruptionModal) {
      setTimeout(() => {
        modalDialogEl?.focus();
      }, 50);
    }
  });

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      store.closeDisruptionModal();
    }
  }
</script>

{#if store.showDisruptionModal}
  <div class="modal-root" onkeydown={handleKeyDown} role="presentation">
    <button
      type="button"
      class="modal-backdrop"
      onclick={() => store.closeDisruptionModal()}
      aria-label="Close disruption modal"
      tabindex="-1"
    ></button>

    <div
      bind:this={modalDialogEl}
      class="modal-card surface-card leading-line"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disruption-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <div class="title-wrap">
          <h2 id="disruption-title">Schedule Disruption Quick-Action</h2>
          <span class="day-badge font-mono">{store.snapshot?.academicDate || 'Today'}</span>
        </div>
        <button
          type="button"
          class="ghost icon-btn"
          onclick={() => store.closeDisruptionModal()}
          aria-label="Close"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      <p class="modal-desc">
        Record unexpected changes for today only. The recurring weekly routine is never permanently altered.
      </p>

      <div class="action-selector" role="radiogroup" aria-label="Disruption Type">
        <button
          type="button"
          class="selector-pill {disruptionType === 'online_recorded' ? 'active' : ''}"
          onclick={() => disruptionType = 'online_recorded'}
          role="radio"
          aria-checked={disruptionType === 'online_recorded'}
        >
          <Video size={14} strokeWidth={2} />
          <span>Switch Online / Recorded</span>
        </button>

        <button
          type="button"
          class="selector-pill {disruptionType === 'makeup' ? 'active' : ''}"
          onclick={() => disruptionType = 'makeup'}
          role="radio"
          aria-checked={disruptionType === 'makeup'}
        >
          <CalendarPlus size={14} strokeWidth={2} />
          <span>+ Off-Day Makeup</span>
        </button>

        <button
          type="button"
          class="selector-pill {disruptionType === 'cancelled' ? 'active' : ''}"
          onclick={() => disruptionType = 'cancelled'}
          role="radio"
          aria-checked={disruptionType === 'cancelled'}
        >
          <CalendarOff size={14} strokeWidth={2} />
          <span>Cancel Class Today</span>
        </button>
      </div>

      <div class="modal-form">
        <div class="form-row">
          <label for="disruption-course">Course</label>
          <select id="disruption-course" bind:value={selectedCourseId}>
            {#each store.snapshot?.courses || [] as crs (crs.id)}
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
          <div class="guard-alert amber">
            <ShieldAlert size={15} strokeWidth={2} />
            <div>
              <strong>Procrastination Guard:</strong> An uncompleted online lecture generates an urgent recovery item due within 48h to prevent invisible delay accumulation.
            </div>
          </div>
        {/if}

        {#if disruptionType === 'cancelled'}
          <div class="guard-alert">
            <AlertCircle size={15} strokeWidth={2} />
            <div>
              <strong>Clean Exception:</strong> Tonight's review shield for this lecture is cleanly withdrawn. Next week's routine remains active.
            </div>
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
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 2200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(17, 19, 18, 0.65);
    backdrop-filter: blur(2px);
    border: none;
    cursor: default;
  }

  .modal-card {
    position: relative;
    z-index: 2201;
    width: 480px;
    max-width: 90vw;
    padding: var(--grid-6);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: var(--grid-4);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-wrap {
    display: flex;
    align-items: center;
    gap: var(--grid-2);
  }

  .title-wrap h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink-primary);
  }

  .day-badge {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--ink-secondary);
  }

  .modal-desc {
    font-size: 13px;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .action-selector {
    display: flex;
    gap: var(--grid-2);
  }

  .selector-pill {
    flex: 1;
    font-size: 11px;
    padding: 10px 8px;
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
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .selector-pill:hover {
    color: var(--ink-primary);
    border-color: var(--border-strong);
  }

  .selector-pill.active {
    background: var(--bg-surface);
    border-color: var(--accent-emerald);
    color: var(--accent-emerald-ink);
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--grid-3);
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-row label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-secondary);
  }

  .grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--grid-3);
  }

  .guard-alert {
    display: flex;
    align-items: flex-start;
    gap: var(--grid-2);
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xs);
    padding: 10px 12px;
    font-size: 12px;
    color: var(--ink-secondary);
    line-height: 1.45;
  }

  .guard-alert.amber {
    background: var(--accent-amber-subtle);
    border-color: rgba(185, 88, 26, 0.25);
    color: var(--accent-amber-ink);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--grid-3);
    padding-top: var(--grid-2);
  }
</style>
