/**
 * Orian Client Main Entry Point
 * 100% Strict TypeScript
 */

import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Fatal: #app root element not found in DOM');
}

const app = mount(App, {
  target
});

export default app;
