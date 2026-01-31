---
name: last-7-days-calendar
overview: Add a “Last 7 days” calendar section under the existing Consistency Analysis on the client reports screen, showing daily calories/protein, steps, workout scheduled vs completed, and weigh-ins, anchored to today.
todos:
  - id: inspect-existing-render-point
    content: Confirm exact insertion point under Consistency Analysis in `components/EnhancedAnalytics.tsx` and where `EnhancedAnalytics` is used from `components/ReportVisualization.tsx`.
    status: completed
  - id: backend-workout-calendar
    content: Update `app/api/trainerize/workouts/route.ts` to return both detailed tracked workouts and a per-day `workoutCalendar` with scheduled+tracked statuses.
    status: completed
  - id: report-generator-plumbing
    content: Update `lib/report-generator.ts` to preserve/filter the new workout calendar data and keep current workout filtering/notes intact.
    status: completed
  - id: fetch-last7-client
    content: Add background fetch for rolling last 7 days in `ClientReportsClient.tsx` using `/api/reports/generate` (cache-only then generate).
    status: completed
  - id: ui-last7-calendar
    content: Add the 7-day calendar section under Consistency Analysis in `components/EnhancedAnalytics.tsx`, driven by the last7 report data (today anchored).
    status: completed
isProject: false
---

## Where this lives (important)

Although you referenced `[...]/reports/page.tsx`, that file only loads initial data and renders `ClientReportsClient`. The “Consistency Analysis” UI is rendered by `components/EnhancedAnalytics.tsx` (via `components/ReportVisualization.tsx`). The new section will be added there so it appears under the existing Consistency Analysis card.

## Data approach

Because you want **rolling last 7 days anchored to today**, this cannot reliably come from the currently selected report date range. We’ll fetch a lightweight “last 7 days” report in the background and feed it into the Consistency Analysis UI.

- **Fetch**: from the browser (inside `ClientReportsClient`) call `POST /api/reports/generate` with `dateRange = [today-6 .. today]`.
  - First try `mode: 'cache-only'` to get a fast cache hit; if it returns 202, immediately retry in default mode to generate.
  - Store result as `last7ReportData` state and pass it down to `ReportVisualization`.
- **Workout completion vs not completed**: you selected “Scheduled vs tracked”. The current Trainerize workouts route only includes `workoutRegular` items with `status === 'tracked'`, so we must extend the workouts fetch to also return scheduled-but-not-tracked items.
  - Update `app/api/trainerize/workouts/route.ts` to return:
    - `workouts`: tracked workouts with details (keep existing behavior for report/workout tables)
    - `workoutCalendar`: per-day workout items (scheduled + tracked) with `date`, `title`, `status` (and `id`/`workoutID` when present)
  - Update `lib/report-generator.ts` to preserve this new field on `workoutData` and to apply the excluded-workout-name filtering to both `workouts` and `workoutCalendar` entries.
- **Weigh-ins**: treat a “weigh-in” as `weight > 0` on that day (from `bodystats`).

## UI approach (calendar view)

Implement a compact 7-tile calendar row **under** the existing Consistency Analysis grid in `components/EnhancedAnalytics.tsx`.

- **Layout**: 7 columns (similar to the existing `SevenDayReference` grid), each tile shows:
  - Date label (weekday + day-of-month)
  - Calories + protein (or “—” if missing)
  - Steps (or “—” if missing)
  - Workout status:
    - **Completed** if any `workoutRegular` item is `tracked`
    - **Not completed** if at least one workout was scheduled that day but none are `tracked`
    - **No workout scheduled** if no workoutRegular items exist that day
  - Weigh-in: show check + optional weight value when present
- **Data normalization**:
  - Build a `Map<YYYY-MM-DD, DailyMetrics>` from `last7ReportData` (nutrition/steps/weight).
  - Build a `Map<YYYY-MM-DD, WorkoutDayStatus>` from `last7ReportData.workoutData.workoutCalendar`.
  - Generate 7 consecutive days ending today (in local timezone, mirroring the approach in `components/SevenDayReference.tsx`).

## Integration points (files)

- **Fetch + state**: `app/dashboard/clients/[id]/reports/ClientReportsClient.tsx`
  - Add `last7ReportData` + loading state.
  - Kick off fetch on `clientId` change.
  - Pass `last7ReportData` into `ReportVisualization`.
- **Plumb prop**: `components/ReportVisualization.tsx`
  - Accept optional `last7ReportData` prop and pass the derived last-7-day dataset to `EnhancedAnalytics`.
- **Render section**: `components/EnhancedAnalytics.tsx`
  - Add a new section directly below the existing “Consistency Analysis” header/grid.
  - Use the last-7-day dataset (not the main report range) for the calendar.
- **Backend shape change**: `app/api/trainerize/workouts/route.ts`
  - Include non-tracked scheduled workoutRegular calendar items in `workoutCalendar`.
- **Report generation**: `lib/report-generator.ts`
  - Ensure `workoutData` carries the new `workoutCalendar` field.
  - Extend excluded-workout-name filtering to also filter `workoutCalendar`.

## Data flow (high-level)

```mermaid
flowchart TD
  ClientReportsClient -->|POST /api/reports/generate (today-6..today)| ReportsGenerate
  ReportsGenerate --> ReportGenerator
  ReportGenerator --> TrainerizeWorkouts
  ReportGenerator --> TrainerizeNutrition
  ReportGenerator --> TrainerizeHealth
  ReportGenerator --> TrainerizeBodystats
  ClientReportsClient -->|props: last7ReportData| ReportVisualization
  ReportVisualization --> EnhancedAnalytics
  EnhancedAnalytics -->|render| Last7Calendar
```



## Notes / constraints

- This adds one extra background fetch per client view; caching will keep it fast after the first run.
- We keep the existing `workoutData.workouts` array semantics (tracked workouts with details) to avoid breaking current report rendering; scheduled items live separately in `workoutCalendar`.

