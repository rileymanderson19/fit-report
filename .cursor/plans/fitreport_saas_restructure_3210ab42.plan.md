---
name: FitReport SaaS Restructure
overview: Restructure FitReport into a client-centric platform where clicking a client loads an on-demand (cached) “last 14 days” live report with flexible date ranges backed by Trainerize API, plus a V1 in-app automation engine that generates/stores per-client action items (no n8n initially).
todos:
  - id: report-generation-service
    content: Extract duplicated Trainerize-fetch + filtering + notes logic into a shared server-side report generation module and reuse it from both visual and text report generation.
    status: pending
  - id: live-report-cache
    content: Add Supabase migration for a live report cache table (report_runs/report_cache) with RLS and implement `/app/api/reports/generate/route.ts` to serve cached/on-demand report_data.
    status: pending
  - id: client-live-report-ui
    content: Update client report UI (`ClientReportsClient.tsx`) to add a default Live tab that auto-generates last 14 days and supports date range changes + Save snapshot into `public.reports`.
    status: pending
  - id: automation-v1
    content: "Implement Automation V1: coach profile + client tasks tables, `/api/automations/generate-tasks` endpoint, and UI to generate/store/display action items per client."
    status: pending
  - id: hardening
    content: "Plan and implement production hardening: remove browser-side report generation fan-out, apply rate limiting, and encrypt Trainerize credentials at rest."
    status: pending
isProject: false
---

# FitReport SaaS Restructure Plan

## Current state (what you have today)

- **Manual report generation (client-side)**: `[app/dashboard/reports/page.tsx](app/dashboard/reports/page.tsx)` calls multiple Trainerize routes in the browser and then persists `report_data` via `[app/api/reports/store/route.ts](app/api/reports/store/route.ts)`.
  - The fetch/store logic is embedded client-side:

```94:252:/Users/riley/CODE/fit-report-sf/fit-report/app/dashboard/reports/page.tsx
  const generateReportForClient = async (client: Client) => {
    // fetch /api/trainerize/* then POST /api/reports/store
  };
```

- **Text reports are already server-side + on-the-fly**: `[app/api/reports/generate-text/route.ts](app/api/reports/generate-text/route.ts)` can generate from an existing stored report **or** by fetching Trainerize data server-side.
- **Report display is snapshot-based**: client report viewer loads rows from `public.reports` and renders `report_data` using `[components/ReportVisualization.tsx](components/ReportVisualization.tsx)`.
- **Scheduling UI exists but backend missing**: `[components/ScheduleReportModal.tsx](components/ScheduleReportModal.tsx)` POSTs to `/api/scheduled-reports`, but there is no such API route.
- **There’s a broken link**: `ClientReportsClient` links to `/dashboard/clients/${clientId}/reports/new`, but no route exists (glob found none).

## Target behavior (your choices)

- **Click client → auto-generate last 14 days**: on-demand generation with caching; do **not** create stored report rows unless user clicks **Save snapshot**.
- **Automation V1 without n8n**: FitReport generates and stores a per-client to-do list/action plan using your internal orchestration.

## Architecture changes (high level)

### A) Introduce “Live Report” (on-demand, cached) alongside stored “Snapshots”

- Add a new server-side “report generation service” used by both visual reports and text reports.
- Add a cache table (Supabase) keyed by `(trainer_id, client_id, date_range, template, repRange, inputsVersion)`.
- Update the client UI to default to **Last 14 days ending yesterday** and to regenerate when date range changes.

### B) Make report generation server-side only

- Move the multi-endpoint Trainerize fetch + filtering + progressive-overload notes out of the browser.
- The browser should call **one endpoint** like `/api/reports/generate`.

### C) Add Automation V1: “Action Plan / To‑Do List” per client

- Add coach profile settings (tone/approach/rules) stored per trainer.
- Add a `client_tasks` (or `client_action_items`) table to persist generated tasks.
- Add `/api/automations/generate-tasks` that reads (cached) report context + client notes and returns structured tasks.

## Concrete implementation steps (file-by-file)

### 1) Create a shared server-side report generation module

- Add a new module such as:
  - `[lib/report-generator.ts](lib/report-generator.ts)` (or `libs/reporting/reportGenerator.ts`)
- It should:
  - Fetch Trainerize data (workouts/bodystats/health/nutrition/sleep/goals)
  - Apply excluded workout filtering (currently duplicated)
  - Apply progressive-overload note generation (currently duplicated)
  - Return a stable `report_data` shape compatible with `ReportVisualization`

**Why**: today the same logic exists in two places:

- `[app/dashboard/reports/page.tsx](app/dashboard/reports/page.tsx)`
- `[app/api/reports/generate-text/route.ts](app/api/reports/generate-text/route.ts)`

### 2) Add “Live report cache” table and API

- New migration (Supabase): `report_runs` (or `report_cache`)
  - Columns (suggested):
    - `id uuid pk`
    - `trainer_id uuid`
    - `client_id uuid`
    - `date_range_start timestamptz`
    - `date_range_end timestamptz`
    - `template text`
    - `rep_range jsonb`
    - `cache_key text unique`
    - `report_data jsonb`
    - `status text` (`ready|running|error`)
    - `expires_at timestamptz`
    - `error_message text`
    - `created_at/updated_at`
  - RLS: trainer-only access like `reports`.
- New API route:
  - `[app/api/reports/generate/route.ts](app/api/reports/generate/route.ts)`
  - Behavior:
    - Compute cache key
    - If unexpired cache exists → return cached `report_data`
    - Else generate via shared module → store cache row → return data

### 3) Update UI to be client-centric and auto-generate on click

- Update `[app/dashboard/clients/page.tsx](app/dashboard/clients/page.tsx)`:
  - Change “View Reports” to open a new client detail view that defaults to Live Report.
  - Keep “Snapshots” accessible.
- Update `[app/dashboard/clients/[id]/reports/ClientReportsClient.tsx](app/dashboard/clients/[id]/reports/ClientReportsClient.tsx)`:
  - Add two tabs:
    - **Live** (default): date picker (default last 14 days ending yesterday) + template selector
    - **Snapshots**: existing list of saved reports from `public.reports`
  - Live tab calls `/api/reports/generate` and renders `ReportVisualization` directly from returned `report_data`.
  - Add a **Save snapshot** button that calls existing `/api/reports/store` using the currently displayed live `report_data`.
- Fix the broken “New Report” link in `ClientReportsClient`:
  - Either remove it or implement a real route (recommended: remove and replace with Live tab).

### 4) Align date defaults everywhere

- Standardize default date range to **last 14 days ending yesterday**:
  - `DateRangePicker` already supports “Last 14 days” preset: `[components/DateRangePicker.tsx](components/DateRangePicker.tsx)`
  - Main reports currently default to last 7 days when `selectedClient` is present:

```49:55:/Users/riley/CODE/fit-report-sf/fit-report/app/dashboard/reports/page.tsx
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
```

### 5) Implement Automation V1 (no n8n): coach profile + client tasks

- Add migrations:
  - `coach_profiles` (per trainer): voice/tone, constraints, preferred goal, etc.
  - `client_tasks` (per client): title, rationale, category, priority, status, due_date, generated_from (report_run_id), created_at.
- Add API route:
  - `[app/api/automations/generate-tasks/route.ts](app/api/automations/generate-tasks/route.ts)`
  - Inputs:
    - `clientId`, `dateRange`, optional `goal`
  - Reads:
    - `clients.notes` (already exists)
    - coach profile
    - live report cache (or generates if missing)
  - Calls LLM provider (existing `libs/gpt.ts` is available but should be wrapped so we can swap providers later).
  - Validates structured JSON output with `zod` (already a dependency).
  - Inserts tasks into `client_tasks` and returns them.
- Add UI:
  - On the client page (Live tab), a button: **Generate Action Plan**
  - Show tasks list with status toggles (complete/pending).

### 6) Production hardening needed for $15k+/mo coaches

- **Stop browser-side fan-out** to Trainerize routes (reduces credential exposure surface and rate-limit risk).
- Add server-side caching + rate limiting:
  - You already have `[libs/rateLimit.ts](libs/rateLimit.ts)` (not consistently applied).
- Implement credential encryption at rest:
  - You already have `[libs/encryption.ts](libs/encryption.ts)` but Trainerize creds appear stored plaintext in `profiles` today.

## How you’ll run/operate this with Claude Code CLI

- **Run the app**:
  - `npm install`
  - `cp .env.example .env` and set Supabase keys (and `OPENAI_API_KEY` only if using automation generation)
  - `npm run dev`
- **Use Claude Code to execute**:
  - Start Claude Code in the repo root and ask it to run the scripts above and iterate on errors.
  - Add a couple helper scripts later (optional but recommended): `type-check`, env validation, mock Trainerize.

## Rollout phases

- **Phase 1 (core UX)**: Live report endpoint + cache + client page Live tab + Save snapshot.
- **Phase 2 (automation V1)**: coach profile + client tasks + generate-tasks endpoint + UI.
- **Phase 3 (hardening)**: credential encryption, rate limiting, caching tuning, scheduled reports execution.

