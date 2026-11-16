<script>
  import { onMount } from 'svelte';
  import { store } from './lib/store.svelte.js';
  import { setupKeyboardShortcuts } from './lib/shortcuts.js';

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
    <div class="loading-screen">
      <span class="loading-pulse"></span>
      <span class="loading-text">Starting Orian...</span>
    </div>
  {:else if !store.snapshot?.settings?.onboarding_completed}
    <main class="onboarding-stage">
      <OnboardingWizard />
    </main>
  {:else}
    <div class="app-container">
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
  }

  .loading-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .loading-pulse {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--accent-emerald);
    box-shadow: 0 0 0 4px var(--accent-emerald-subtle);
    animation: pulse 1.5s infinite ease-in-out;
  }

  @keyframes pulse {
    0% { transform: scale(0.9); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(0.9); opacity: 0.8; }
  }

  .loading-text {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--ink-muted);
  }

  .onboarding-stage {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-stage);
  }
</style>
