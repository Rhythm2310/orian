# SPEC.md — Orian Electron Architecture, Node.js Optimizations, Exam Triage & Edge-Case Spec

## 1. Repository & Build Layout

```text
orian/
├── AGENTS.md
├── PRODUCT.md
├── DESIGN.md
├── SPEC.md
├── package.json
├── vite.config.js            # base: './', builds client/ -> dist/client/
├── electron-builder.yml      # Windows NSIS Setup .exe + Portable .exe config
├── build/
│   └── icon.ico / icon.png
├── electron/
│   ├── main.js               # ESM Main Process: Window, Tray, IPC, Sleep/Quit lifecycle
│   └── preload.cjs           # Sandboxed CommonJS contextBridge -> window.orianAPI
├── data/
│   └── quotes.json           # Curated offline motivational quotes (mood & exam-aware)
├── client/                   # Svelte 5 + @lucide/svelte Renderer
│   ├── index.html
│   ├── public/fonts/         # Bundled .woff2 fonts (100% offline)
│   └── src/
│       ├── main.js
│       ├── App.svelte
│       ├── styles/           # tokens.css, shell.css, a11y.css
│       ├── lib/              # api.js, store.svelte.js, audio.js, shortcuts.js
│       ├── components/       # TitleBar, Sidebar, CommandPalette, MiniTimer, ProgressRing, VelocityChart, CourseBars, EffortSplitBar, ExamRadar, DisruptionModal, GapReturnModal
│       └── views/            # OnboardingWizard, DashboardView, QueueView, RoutineView, PomodoroView, SettingsView
├── src/                      # Pure Node.js Engine & Persistence
│   ├── core/
│   │   ├── antiBacklog.js    # Academic-day shields, exceptions, cascade & exam scoring
│   │   ├── allocator.js      # Multi-course daily capacity split, crunch deferral & ETA
│   │   ├── pomodoro.js       # Wall-clock timer recovery & contextual quote matcher
│   │   └── validators.js     # Syllabus matcher, range parser (12-15), overlap guards
│   ├── db/
│   │   ├── client.js         # node:sqlite WAL + prepared statement cache
│   │   ├── migrations.js     # Idempotent versioned SQLite schema
│   │   ├── repositories.js   # Transactional CRUD + backup/restore/integrity check
│   │   └── cache.js          # Memoized dashboard & allocation snapshot cache
│   └── ipc/
│       └── service.js        # Pure IPC controller decoupled from Electron UI for /tdd
└── tests/
    ├── core.antiBacklog.test.js
    ├── core.examAllocator.test.js
    ├── core.edgeCases.test.js
    ├── core.validators.test.js
    ├── db.repositories.test.js
    └── ipc.service.test.js
