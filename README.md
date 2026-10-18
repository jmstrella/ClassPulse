<p align="center">
  <img src="./dashboard/public/favicon.svg" width="72" alt="ClassPulse logo" />
</p>

<h1 align="center">ClassPulse</h1>

<p align="center">Real-time student engagement tracking for modern classrooms.</p>

<p align="center">
  <a href="https://useclasspulse.vercel.app"><strong>🌐 Live Dashboard</strong></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="./classpulse-extension.zip"><strong>📦 Download Chrome Extension</strong></a>
</p>

---

## Installing the Chrome Extension

> For students and instructors who just want to use ClassPulse. No code required.

1. **Download** [`classpulse-extension.zip`](./classpulse-extension.zip) from the root of this repository and extract it to a folder on your computer.

2. Open Chrome and go to `chrome://extensions`.

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **Load unpacked** and select the extracted `classpulse-extension` folder.

The ClassPulse icon will appear in your Chrome toolbar. Enter your class code to begin tracking.

> **Keep version updated:** return to `chrome://extensions` and click the **↺ Reload** button on the ClassPulse card to apply the latest changes.

---
## What is ClassPulse

ClassPulse helps instructors understand student engagement during live Google Meet sessions without interrupting class.

A lightweight Chrome extension runs silently in the background, detecting whether each student's Meet tab is open and focused. That signal is relayed in real time to a web dashboard, giving the instructor a live grid of every student's current attention state.

**Core features:**

- **Live status board** — per-student status cards: Active, Distracted, Idle, Offline, or Not Joined, updated in real time.
- **Check-in prompts** — instructors send a timed check-in; students confirm with one click through the extension.
- **Attention alerts** — a banner surfaces students who are distracted or idle so the instructor can act immediately.
- **Session reports** — per-student attendance percentage, time-in-state breakdown, and check-in response rates, exportable as CSV.
- **Roster management** — pre-load student names; participants claim their seat by selecting their name when joining.
- **Threshold presets** — configurable idle and offline thresholds per session.

---

## Privacy

The ClassPulse extension collects **only**:
- Whether the Google Meet tab is open (`meet_tab_open`)
- Whether the Google Meet tab is focused (`meet_tab_focused`)
- The system idle state as reported by the Chrome Idle API (`system_state`)

It does **not** read page content, other tab URLs or titles, chat messages, camera or microphone input, screen content, or keystrokes.

---

## Developer Setup

**Prerequisites:** Node.js v18+, npm

```bash
# 1. Clone the repository
git clone https://github.com/kurtscp/ClassPulse.git
cd ClassPulse

# 2. Install dashboard dependencies
cd dashboard && npm install && cd ..

# 3. Configure environment variables
cp dashboard/.env.example dashboard/.env.local
#    → Open dashboard/.env.local and fill in your Supabase URL and anon key

# 4. Start the development server
cd dashboard && npm run dev

# 5. (Optional) Package the extension for distribution
npm run package:zip
```

**Loading the extension locally:**
After making changes to the `/extension` folder, go to `chrome://extensions`, find the ClassPulse card, and click **↺ Reload**. No build step is needed — the extension is plain JavaScript.

### All available scripts

| Command | Location | Description |
|---|---|---|
| `npm run dev` | `dashboard/` | Start Vite dev server |
| `npm run build` | `dashboard/` | TypeScript check + production build → `dist/` |
| `npm run preview` | `dashboard/` | Serve the `dist/` build locally |
| `npm run lint` | `dashboard/` | Run oxlint |
| `npm run test` | `dashboard/` | Run Vitest unit tests |
| `npm run simulate` | root | Run heartbeat simulator against Supabase |
| `npm run package:zip` | root | Package extension into `classpulse-extension.zip` |

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✓ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Your Supabase anonymous (public) key |

Both values are found in **Supabase Dashboard → Project Settings → API**. Never use or commit the `service_role` key.

The Chrome extension reads its own Supabase config from `extension/config.js` (gitignored). Copy `extension/config.example.js` → `extension/config.js` and fill in the same URL and anon key.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Dashboard UI | React 19, TypeScript, Tailwind CSS v4, Vite 8 |
| Backend & DB | Supabase (Postgres, Realtime, Row-Level Security) |
| Auth | Supabase Auth (email/password) |
| Browser extension | Chrome Extension API, Manifest V3, plain JavaScript |
| Deployment | Vercel (dashboard), Chrome Load Unpacked (extension) |
| Testing | Vitest, jsdom |
| Linting | oxlint |

## Project Structure

```
ClassPulse/
├── dashboard/                  # React + Vite web app (Vercel)
│   ├── public/                 # Static assets (favicon, logo)
│   ├── src/
│   │   ├── app/                # Router, Auth, Layout, SessionContext
│   │   ├── features/
│   │   │   ├── live-board/     # Live student grid + student detail drawer
│   │   │   ├── checkins/       # Check-in send, live panel, history list
│   │   │   ├── report/         # Session report table + CSV export
│   │   │   └── settings/       # Per-session threshold configuration
│   │   ├── lib/                # Supabase client, shared types and utilities
│   │   └── pages/              # SessionsPage, SessionPage, LoginPage
│   └── .env.example            # Required environment variables
│
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── icons/                  # Extension icons (16/32/48/128px)
│   ├── lib/                    # Supabase RPC client, state manager, collectors
│   ├── modules/                # Content scripts (check-in overlay)
│   ├── background.js           # Service worker — heartbeat alarm loop
│   ├── popup.html / popup.js   # Extension popup UI
│   └── config.example.js       # Copy → config.js and fill in credentials
│
├── supabase/
│   └── migrations/             # Ordered SQL migrations (001–401)
│       ├── 001_tables.sql      # Core schema (sessions, participants, heartbeats)
│       ├── 002_functions.sql   # RPC: create_session, join_session, send_heartbeat
│       ├── 003_security.sql    # RLS policies + Realtime subscriptions
│       ├── 004_roster.sql      # Roster entries + release_roster_entry RPC
│       ├── 200_fix_checkins_rls.sql
│       └── 401_report_function.sql  # get_session_report analytics RPC
│
├── scripts/
│   ├── simulate.mjs            # Heartbeat simulator for local development
│   └── package-extension.mjs  # Packages extension → classpulse-extension.zip
│
├── docs/
│   ├── ClassPulse_MVP.md       # Product spec and feature contracts
│   └── CONTRACTS.md            # Shared type/API contracts between tracks
│
├── classpulse-extension.zip    # Latest packaged extension (Load Unpacked ready)
└── package.json                # Root scripts: simulate, package:zip
```

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied in numeric order through the Supabase CLI (`supabase db push`) or the Supabase Dashboard SQL editor. Never edit an already-applied migration, add a new numbered file instead.

```bash
# Apply all pending migrations
supabase db push
```

