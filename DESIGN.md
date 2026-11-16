# DESIGN.md — Orian Visual System & Exam-Aware Desktop UI

> Every frontend design decision must be shaped, reviewed, and polished through **`/impeccable`** (`shape`, `typeset`, `colorize`, `layout`, `onboard`, `critique`, `audit`, `harden`, `polish`).

## Native Electron Window Shell (`App.svelte`)
- **Frameless Native Desktop Chrome:** Electron `titleBarStyle: 'hidden'` + dynamic theme-synced `titleBarOverlay` (`height: 44`), Windows 11 Snap Layout support, `-webkit-app-region: drag` on header chrome (`no-drag` on interactive controls), `138px` right clearance for native window buttons.
- **Viewport Lock:** `height: 100vh; overflow: hidden;` on desktop (`>= 900px`) with independent scrollable workspace panes; collapsible drawer on compact widths (`< 900px`).
- **Four Desktop Zones:** Integrated Titlebar (`44px`), Left Rail (`228px` with routes, course badges, Finals Mode indicator, and pinned **Mini Pomodoro Dock**), Main Stage (`flex: 1`), and Overlay Layer (`Ctrl/Cmd+K` Command Palette + non-blocking Undo Toasts).

## Iconography (`@lucide/svelte` Exclusively)
- Tree-shaken `@lucide/svelte` components only (`strokeWidth={1.75}` globally).
- Semantic Icon Grammar (always paired with text/shape for color-blind safety):
  - Exams / CTs / Finals: `GraduationCap` / `FileCheck2` / `ClockAlert`
  - Effort Multiplier Boost: `Gauge` / `TrendingUp`
  - Finals Mode / Break Pause: `BookMarked` / `PauseCircle`
  - Online / Recorded / Makeup / Cancelled: `Video` / `MonitorPlay` / `CalendarPlus` / `CalendarOff`
  - Same-Day Shield / Focus Lock: `ShieldCheck` / `ShieldAlert` / `Lock`

## Color & Surface Tokens
- **Studio Light (Default):** `--bg-rail: #F4F2EC`, `--bg-stage: #FAF9F5`, `--bg-surface: #FFFFFF`, `--bg-subtle: #EFECE4`, `--ink-primary: #171917`, `--ink-secondary: #525650`, `--ink-muted: #636760` (>= 4.5:1 AA), `--accent-emerald: #1A6B4E`, `--accent-amber: #B9581A`, `--accent-crimson: #B91C1C`.
- **Studio Dark:** `--bg-rail: #111312`, `--bg-stage: #161917`, `--bg-surface: #1D201E`, `--bg-subtle: #262A27`, `--ink-primary: #F1F0EA`, `--ink-secondary: #B5B9B2`, `--ink-muted: #969B93`, `--accent-emerald: #34A87C`, `--accent-amber: #E58949`, `--accent-crimson: #EF5350`.
- **High-Contrast Mode (`data-contrast="high"`):** Crisp `#FFFFFF`/`#000000` palette, `2px solid` outlines, mandatory shape+text status tags.

## Bundled Offline Typography
- `--font-display`: `'Newsreader', Georgia, serif`
- `--font-sans`: `'Plus Jakarta Sans', system-ui, sans-serif`
- `--font-mono`: `'IBM Plex Mono', monospace`
- `--font-dyslexic`: `'OpenDyslexic', 'Plus Jakarta Sans', sans-serif` (letter-spacing `0.03em`, line-height `1.65`)
- **Mandatory:** `font-variant-numeric: tabular-nums` on every timer, counter, percentage, countdown, and chart axis.

## Exam-Aware & Edge-Case UI Components
1. **Dashboard — Today's Effort Reallocation Bar + Exam Radar:**
   - Displays a crisp proportional horizontal split of **today's recommended study blocks** across courses (`65% MATH204 · 25% CS101 · 10% Shield`) alongside an **Upcoming Assessments Strip** (e.g., `CT 2 · MATH204 in 3d · 2 in-syllabus lectures + 4 practice blocks`) and clear **Crunch Deficit Warnings** if daily capacity falls short before an exam.
2. **Dashboard — Today's Battle Plan:**
   - Unified actionable sections: **Same-Day Shield** (or *Crunch-Deferred* notice), **Exam Prep & Revision Blocks**, and **Priority Backlog Recovery**—every item directly launches a bound Pomodoro or marks progress.
3. **Routine, Courses & Assessments View:**
   - Per-course **Effort Multiplier Dial** (`0.5x` · `1.0x` · `1.5x` · `2.0x` + optional expiry date).
   - **Assessments & Exams Panel**: add/edit CTs, Quizzes, Midterms, Finals with date/time, syllabus range (`e.g. 8-12` or `All`), and revision Pomodoro target.
   - **Disruption Quick-Actions** (`+ Makeup Today`, `Switch to Online/Recorded`, `Cancel/Reschedule`, `Finals Prep Mode`, `Break Pause`).
4. **Pomodoro Focus Studio:**
   - Supports both **Lecture Recovery Mode** (`Recovering: CS101 · Class 14`) and **Exam Revision Mode** (`Exam Prep: MATH204 CT 2 · Block 2/4`), updating syllabus readiness or lecture progress automatically on completion.
