<script lang="ts">
  import { onMount } from 'svelte';
  import { store } from './lib/store.svelte.ts';
  import { setupKeyboardShortcuts } from './lib/shortcuts.ts';

  import TitleBar from './components/TitleBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import DisruptionModal from './components/DisruptionModal.svelte';
  import GapReturnModal from './components/GapReturnModal.svelte';
  import ToastContainer from './components/ToastContainer.svelte';

  import OnboardingWizard from './views/OnboardingWizard.svelte';
  import DashboardView from './views/DashboardView.svelte';
  import QueueView from './views/QueueView.svelte';
  import RoutineView from './views/RoutineView.svelte';
  import PomodoroView from './views/PomodoroView.svelte';
  import SettingsView from './views/SettingsView.svelte';

  onMount(async () => {
    setupKeyboardShortcuts();
    await store.init();
  });
</script>

<div class="orian-app">
  <TitleBar />

  {#if store.isLoading}
    <div class="loading-screen" role="status" aria-live="polite">
      <div class="loading-pulse-ring">
        <span class="loading-dot"></span>
      </div>
      <span class="loading-text">Initializing Orian Engine...</span>
    </div>
  {:else if !store.snapshot?.settings?.onboarding_completed}
    <main class="onboarding-stage">
      <OnboardingWizard />
    </main>
  {:else}
    <div class="app-workspace">
      <Sidebar />

      <main class="main-stage">
        {#if store.currentView === 'dashboard'}
          <DashboardView />
        {:else if store.currentView === 'queue'}
          <QueueView />
        {:else if store.currentView === 'routine'}
          <RoutineView />
        {:else if store.currentView === 'pomodoro'}
          <PomodoroView />
        {:else if store.currentView === 'settings'}
          <SettingsView />
        {/if}
      </main>
    </div>
  {/if}

  <!-- Overlays -->
  <CommandPalette />
  <DisruptionModal />
  <GapReturnModal />
  <ToastContainer />
</div>

<style>
  .orian-app {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-app);
    color: var(--ink-primary);
  }

  .loading-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--grid-4);
  }

  .loading-pulse-ring {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    border: 2px solid var(--accent-emerald-subtle);
    border-top-color: var(--accent-emerald);
    animation: spin 0.8s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 500;
    color: var(--ink-muted);
  }

  .onboarding-stage {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-app);
  }

  .app-workspace {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .main-stage {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-app);
    padding: var(--grid-6);
  }
</style>
