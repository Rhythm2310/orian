# AGENTS.md — Orian Autonomous Engineering Contract

You are building **Orian**, a 100% offline, production-ready desktop application packaged as a **Windows `.exe` (Electron + `electron-builder`)**, powered by **Node.js** (`node:sqlite` WAL + IPC service layer) and **Svelte 5 + `@lucide/svelte`**.

Read `PRODUCT.md`, `DESIGN.md`, and `SPEC.md` completely before writing any code. Execute autonomously from scaffold through tested `.exe` packaging without pausing for permission unless a destructive operation outside the workspace is requested.

---

## 1. Mandatory Skill Execution Rules

### A. `/tdd` — Core Engine, Exam Triage, Database & IPC Services
Obey the Iron Law: **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST**.
1. **RED:** Write a minimal failing test in `tests/` using Node's built-in `node --test` runner. Observe it fail.
2. **GREEN:** Write the smallest clean implementation to make it pass.
3. **REFACTOR:** Clean and optimize while keeping tests green.
- Every algorithm rule and real-world edge case in `SPEC.md §4–6` (CT in 3 days with syllabus matching, colliding Midterms/Finals proportional reallocation, Exam Crunch shield deferral, course `effort_multiplier` boosts, Finals Prep Mode, sudden online/recorded classes, off-day makeup classes, cancelled/rescheduled lectures, 4:00 AM academic day cutoff, multi-day absence gap prompt, and wall-clock Pomodoro sleep recovery) MUST have failing-first `/tdd` tests.

### B. `/impeccable` — Mandatory for EVERY Frontend Design Decision
You MUST invoke **`/impeccable`** (and its specialized commands) for **every** frontend design choice — tokens, typography, color, layout, Svelte 5 component anatomy, `@lucide/svelte` icons, charts, onboarding, Exam Radar, Effort Reallocation Bar, Pomodoro Studio, and accessibility settings. **Never invent generic layouts or arbitrary CSS.**

Execute `/impeccable` per focused surface:
1. **Context & Shape:** Load `PRODUCT.md` and `DESIGN.md` (`register: product`), then run `/impeccable shape` for Desktop Shell, Onboarding Wizard, Dashboard + Exam Radar, Recovery Queue, Routine/Courses/Assessments, Pomodoro Focus, and Settings & Accessibility.
2. **Design System:** Apply `/impeccable typeset`, `/impeccable colorize`, and `/impeccable layout`.
3. **Onboarding & Edge States:** Run `/impeccable onboard` for the 4-step Onboarding Wizard, Multi-Day Return Gap Modal, Crunch Deficit alerts, and empty states.
4. **Svelte 5 + `@lucide/svelte`:** Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) and `@lucide/svelte` exclusively (never Svelte 4 `lucide-svelte`).
5. **Per-View Polish Loop:** On each completed view, run `/impeccable critique` -> `/impeccable audit` -> `/impeccable harden` + `/impeccable adapt` + `/impeccable clarify` + `/impeccable optimize` + `/impeccable polish` until zero issues remain.

---

## 2. Hard Electron, Node.js & Offline Constraints

1. **100% Offline & Sandboxed Electron:**
   - Renderer: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
   - `electron/preload.cjs` MUST use `.cjs` extension exposing typed `window.orianAPI` via `contextBridge`.
   - Block all external HTTP/HTTPS requests at runtime via `session.defaultSession.webRequest.onBeforeRequest` + strict CSP.
   - Bundle all `.woff2` fonts (`Newsreader`, `Plus Jakarta Sans`, `IBM Plex Mono`, `OpenDyslexic`) locally under `client/public/fonts/`.
   - Web Audio API chimes (`client/src/lib/audio.js`) and offline quotes (`data/quotes.json`) only.
2. **Node.js & SQLite Stability (`electron >= 39.0.0`):**
   - Use built-in `node:sqlite` (`DatabaseSync` in `WAL` mode, `foreign_keys = ON`, `busy_timeout = 5000`, prepared statements, `BEGIN IMMEDIATE ... COMMIT`) — zero native C++ `node-gyp` rebuilds.
   - Store `orian.db` and 7-day rolling JSON backups in `app.getPath('userData')`, never inside `app.asar`.
   - Memoize computed dashboard/allocation snapshots in memory; invalidate atomically on mutations.
   - Implement `app.requestSingleInstanceLock()`, wall-clock persisted active Pomodoro recovery across restarts/sleep, `titleBarOverlay` theme sync, optional System Tray background timer, and `PRAGMA wal_checkpoint(TRUNCATE)` on clean quit.
3. **Windows `.exe` Packaging (`electron-builder`):**
   - Configure `nsis` (`Orian-Setup-${version}.exe`) and `portable` (`Orian-Portable-${version}.exe`) with distinct `artifactName` templates, `asar: true`, and Vite `base: './'`.
4. **No Native Browser Dialogs:** Never use `alert()`, `confirm()`, or `prompt()`. Use accessible Svelte modals, inline two-step confirms, and Undo toasts.

---

## 3. Autonomous Execution Sequence

1. **Phase 1 — Workspace, Fonts & Electron Scaffold:** Initialize `package.json`, install `svelte`, `@sveltejs/vite-plugin-svelte`, `vite`, `@lucide/svelte`, `electron` (`>=39`), `electron-builder`, bundle local `.woff2` fonts, `data/quotes.json`, and `build/icon.ico`.
2. **Phase 2 — Core Engine, Exam Triage & SQLite Layer (`/tdd`):** Test-first implementation of `src/core/` (`antiBacklog.js`, `allocator.js`, `pomodoro.js`, `validators.js`) and `src/db/` covering every algorithm rule and edge case in `SPEC.md`.
3. **Phase 3 — Electron Main Process, Preload & IPC Service (`/tdd`):** Test-first implementation of `src/ipc/service.js`, `electron/main.js`, and `electron/preload.cjs`.
4. **Phase 4 — Svelte 5 Frontend & Accessibility (`/impeccable`):** Design and build `client/` using `/impeccable` for every design choice, auditing every view individually.
5. **Phase 5 — Build, `.exe` Verification & Docs:** Run `npm test` (100% pass), `npm run build:client` (zero errors, zero external URLs), headless Electron smoke verification, Windows `.exe` packaging (`pack:win` / `dist:win`), and write `README.md`.
