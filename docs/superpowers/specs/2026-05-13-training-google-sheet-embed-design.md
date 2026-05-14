# Training Tab — Google Sheet Embed

**Date:** 2026-05-13  
**Status:** Approved

## Summary

When creating a training plan, the user can optionally paste a Google Sheets link. If the plan has a sheet URL, the training tab shows an interactive iframe (Google Sheets embed) instead of the built-in exercise table. Plans without a URL keep existing behavior.

## Database

**File to run:** `docs/superpowers/specs/2026-05-13-training-google-sheet-embed.sql`

```sql
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS google_sheet_url TEXT;
```

## URL Transformation

Input from user: any valid Google Sheets share/edit URL  
Output for iframe src: extract spreadsheet ID, build embed URL

```
https://docs.google.com/spreadsheets/d/{ID}/edit?rm=minimal
```

Transformation logic lives in a utility function `toGoogleSheetEmbedUrl(url: string): string | null`.

## Components

### `workout_plans` type update
Add `google_sheet_url: string | null` to `WorkoutPlan` interface in `src/types/fitness.ts`.

### Create Plan Dialog (`TrainingTab.tsx`)
- Add optional text input: "Link de Google Sheets (opcional)"
- Validate that input is a Google Sheets URL if provided
- Pass `google_sheet_url` to `createPlan()` in `useTraining.ts`

### `useTraining.ts`
- Update `createPlan()` to accept and save `google_sheet_url`
- No other changes needed (Supabase returns the new column automatically)

### TrainingTab render logic
```
if (activePlan?.google_sheet_url)
  → show <GoogleSheetViewer url={activePlan.google_sheet_url} />
else
  → show existing exercise table
```

### `GoogleSheetViewer` component (`src/components/fitness/GoogleSheetViewer.tsx`)
- Converts URL to embed format
- Renders `<iframe>` with `allow="clipboard-read; clipboard-write"`
- Fixed height (e.g. 600px) with resize handle or full remaining height
- Warning banner: "Debes estar logueado en Google para editar"
- Button: "Cambiar link" → opens edit dialog

## Edit Link
- Small button near plan name to update `google_sheet_url` on the active plan
- Calls Supabase `UPDATE workout_plans SET google_sheet_url = ? WHERE id = ?`

## SQL File

Separate `.sql` file with copy-paste SQL for the user to run manually.

## Constraints & Notes

- Google login required in same browser for edit access
- Sheet must have edit permissions granted to the user's Google account
- Read-only sheets will render but not allow editing
- No Google API OAuth needed — iframe handles auth natively
