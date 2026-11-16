# Orian — Offline Study Backlog Prevention, Exam Triage & Focus Recovery Workbench

**Orian** is a 100% offline, production-grade native Windows desktop application packaged as a Windows `.exe` (`NSIS` setup installer + `Portable` executable). It is engineered for college and university students navigating unpredictable semesters, shifting timetables, and acute workload spikes around Class Tests (CTs), Quizzes, Midterms, and Finals.

Powered by **Electron 39**, **Node.js 24 (`node:sqlite` WAL)**, and **Svelte 5 + `@lucide/svelte`**, Orian combines honest study capacity mathematics with calm urgency, eliminating academic anxiety through decisive triage rather than toxic hustle fluff.

---

## 1. Core Academic Reality Solved

### A. Imminent Exam & Class Test Triage (e.g., CT in 3 Days)
When a Class Test or Quiz approaches, Orian does **not** treat all subjects equally. It parses your syllabus range (e.g. `8-12` or `1-6`), isolates the exact unwatched **in-syllabus lectures**, calculates dedicated **exam revision blocks**, and reallocates tonight's study capacity toward the imminent exam while temporarily deferring unrelated low-urgency backlog.

### B. Colliding Midterms & Finals Reallocation
When two or three exams land in the same week, studying 100% for Tuesday's test leaves Thursday's test ruined. Orian computes **strain ratios** across all imminent assessments:
$$\text{Strain} = \frac{\text{Remaining Prep Blocks} \times \text{Course Multiplier}}{\text{Days Remaining}}$$
Daily study blocks are divided proportionally (e.g., `4 blocks CS101 + 2 blocks PHYS112`) so later exams are protected from starvation.

### C. Exam Crunch Protection (Shield Deferral)
When a Midterm or Final is $\le 48\text{ hours}$ away (or an unprepped CT is $\le 24\text{ hours}$ away), live recurring classes of unrelated courses occurring today receive **Crunch Deferral**. Tonight's focus budget is shielded from routine lecture debts—the deferred classes safely wait in the post-exam recovery queue.

### D. Manual Course Effort Shifting & Finals Mode
- **Effort Multiplier Dials:** Set any demanding course from `0.5x` (Light) to `2.0x` (Intensive) with optional auto-expiry.
- **Finals Prep Mode:** When semester classes finish, flip Finals Mode to dedicate 100% of daily study blocks to finals revision, completely suppressing daily live lecture shields.

### E. Schedule Disruption Quick-Actions
- **Online / Recorded Switch:** Flags the lecture with an **Online Procrastination Guard** requiring review within 48 hours to prevent delay debt.
- **Off-Day Makeup Classes:** Seamlessly adds single-day makeup sessions for today without mutating the weekly recurring template.
- **Single-Day Cancellations:** Marks the lecture cancelled for today without breaking next week's schedule.

### F. Post-Midnight Study Cutoff & Multi-Day Gap Return
- **4:00 AM Academic Day Cutoff:** Study sessions logged after midnight (e.g. 2:30 AM Tuesday) count toward Monday's capacity budget and streak.
- **Multi-Day Absence Safe Return Buffer:** Missing 2+ days triggers a triage prompt that queues high-priority exam syllabus items while deferring excessive older lectures into the recovery queue to prevent cognitive overload.

### G. Wall-Clock Resilient Pomodoro Focus Studio
Active timers persist across system sleep, hibernation, and restarts. Using wall-clock delta checks against `Date.now()`, Orian resumes cleanly with exact remaining seconds or detects completed sessions without timer drift. Procedural chimes synthesized via the **Web Audio API** provide offline audio cues.

---

## 2. Technical Architecture & Constraints

- **100% Offline Sandboxed Electron:**
  - Sandboxed renderer (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`).
  - Strict Content Security Policy (CSP) blocking external scripts and connections.
  - Runtime request interceptor (`session.defaultSession.webRequest.onBeforeRequest`) canceling all external HTTP/HTTPS traffic.
  - Zero external web fonts: bundled local `.woff2` fonts (`Newsreader`, `Plus Jakarta Sans`, `IBM Plex Mono`, `OpenDyslexic`).
- **High-Performance Persistence (`node:sqlite`):**
  - Uses Node's built-in `node:sqlite` (`DatabaseSync` in `WAL` mode, `foreign_keys = ON`, `busy_timeout = 5000`).
  - Zero C++ native rebuilds (`node-gyp`).
  - Stored in `%APPDATA%\Orian\orian.db` (outside `app.asar`).
  - Automatic rolling 7-day JSON backups in `%APPDATA%\Orian\backups\`.
  - Atomic in-memory snapshot cache invalidated on mutations.
  - Clean shutdown checkpoint: `PRAGMA wal_checkpoint(TRUNCATE);`.
- **Svelte 5 + `@lucide/svelte` Frontend:**
  - Full reactive architecture using Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
  - Tree-shaken `@lucide/svelte` icons (`strokeWidth={1.75}`).
  - Studio Light, Studio Dark, High-Contrast (`data-contrast="high"`), and OpenDyslexic modes.
  - Zero native browser popups (`alert`/`confirm`): accessible Svelte dialogs and non-blocking Undo toasts.

---

## 3. Verified Test Suite & Craft Standards

Orian was developed strictly test-first following the `/tdd` protocol:
```text
▶ AntiBacklog Core Engine (13 tests)
▶ Edge Cases & Pomodoro Engine (10 tests)
▶ Exam Triage & Daily Capacity Allocator (7 tests)
▶ Validators & Syllabus Matcher (14 tests)
▶ SQLite Repositories & Migrations (12 tests)
▶ Diagnostic Bug Reproduction Suite (8 tests)
▶ Pure IPC Service Controller (5 tests)

Total: 69 tests passing (0 failures, 100% pass)
```

The frontend complies with the `/impeccable` design system rules (`impeccable detect` reports 0 issues).

---

## 4. Packaging & Distributables

The application is packaged for Windows via `electron-builder`:
- **NSIS Setup Installer:** `release/Orian-Setup-1.0.0.exe`
- **Portable Standalone Executable:** `release/Orian-Portable-1.0.0.exe`
- **Unpacked Directory:** `release/win-unpacked/Orian.exe`

### Available NPM Scripts:
- `npm test`: Runs all 61 automated unit/integration tests (`node --test tests/*.test.js`).
- `npm run build:client`: Compiles Svelte 5 client via Vite (`dist/client/`).
- `npm start`: Launches the local desktop application in Electron.
- `npm run pack:win`: Builds client and packages unpacked Windows executable (`release/win-unpacked/`).
- `npm run dist:win`: Produces production `NSIS` installer and `Portable` `.exe`.
