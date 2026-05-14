# Training Google Sheet Embed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Google Sheets embed to training plans — when a plan has a sheet URL, show an interactive iframe instead of the exercise table.

**Architecture:** Add `google_sheet_url` column to `workout_plans`. Update `WorkoutPlan` type, `useTraining` hook, and `TrainingTab` dialog. Create a `GoogleSheetViewer` component that converts the URL to embed format and renders it. TrainingTab conditionally renders the viewer or the existing exercise table based on `activePlan.google_sheet_url`.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, Tailwind/inline styles (matching existing TrainingTab pattern)

---

## Files

| Action | Path |
|--------|------|
| Modify | `src/types/fitness.ts` — add `google_sheet_url` to `WorkoutPlan` |
| Modify | `src/hooks/fitness/useTraining.ts` — update `createPlan`, add `updatePlanSheetUrl` |
| Create | `src/components/fitness/GoogleSheetViewer.tsx` — iframe embed component |
| Modify | `src/components/fitness/tabs/TrainingTab.tsx` — dialog field + conditional render |

---

### Task 1: Update `WorkoutPlan` type

**Files:**
- Modify: `src/types/fitness.ts:103-110`

- [ ] **Step 1: Add `google_sheet_url` field**

In `src/types/fitness.ts`, replace the `WorkoutPlan` interface:

```typescript
export interface WorkoutPlan {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  active: boolean;
  google_sheet_url: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/fitness.ts
git commit -m "feat: add google_sheet_url to WorkoutPlan type"
```

---

### Task 2: Update `useTraining` hook

**Files:**
- Modify: `src/hooks/fitness/useTraining.ts`

- [ ] **Step 1: Update `createPlan` to accept `google_sheet_url`**

Replace the `createPlan` function (lines 49-56):

```typescript
const createPlan = async (name: string, googleSheetUrl?: string) => {
  if (!userId) return;
  await supabase.from('workout_plans').update({ active: false }).eq('client_id', clientId);
  const { error } = await supabase.from('workout_plans').insert({
    client_id: clientId,
    user_id: userId,
    name,
    active: true,
    google_sheet_url: googleSheetUrl ?? null,
  });
  if (error) { toast.error('No se pudo crear el plan.'); return; }
  toast.success('Plan creado.');
  fetch();
};
```

- [ ] **Step 2: Add `updatePlanSheetUrl` function**

After `deleteExercise` (before the `activePlan` const, around line 73), add:

```typescript
const updatePlanSheetUrl = async (planId: string, url: string | null) => {
  const { error } = await supabase
    .from('workout_plans')
    .update({ google_sheet_url: url })
    .eq('id', planId);
  if (error) { toast.error('No se pudo actualizar el link.'); return; }
  toast.success('Link actualizado.');
  fetch();
};
```

- [ ] **Step 3: Export `updatePlanSheetUrl`**

Replace the return statement (line 78):

```typescript
return { records, plans, exercises, activePlan, days, loading, refetch: fetch, saveRecord, createPlan, updatePlanSheetUrl, saveExercise, updateExercise, deleteExercise };
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/fitness/useTraining.ts
git commit -m "feat: update useTraining to support google_sheet_url"
```

---

### Task 3: Create `GoogleSheetViewer` component

**Files:**
- Create: `src/components/fitness/GoogleSheetViewer.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

function toEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return null;
    const id = match[1];
    return `https://docs.google.com/spreadsheets/d/${id}/edit?rm=minimal`;
  } catch {
    return null;
  }
}

interface GoogleSheetViewerProps {
  url: string;
  onChangeUrl: () => void;
  theme: {
    surface: string;
    border: string;
    borderStrong: string;
    text: string;
    text2: string;
    accent: string;
    accentInk: string;
  };
}

export function GoogleSheetViewer({ url, onChangeUrl, theme: T }: GoogleSheetViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const embedUrl = toEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: 10, color: T.text2, fontSize: 13,
      }}>
        <AlertCircle size={16} />
        <span>Link inválido.</span>
        <button onClick={onChangeUrl} style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
          Cambiar link
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: T.text2 }}>
          Debes estar logueado en Google para editar
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.accent, textDecoration: 'none' }}>
          <ExternalLink size={12} /> Abrir en Google Sheets
        </a>
        <button
          onClick={onChangeUrl}
          style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
        >
          Cambiar link
        </button>
      </div>
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.borderStrong}` }}>
        {!loaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, color: T.text2, fontSize: 13 }}>
            Cargando...
          </div>
        )}
        <iframe
          src={embedUrl}
          width="100%"
          height="600"
          frameBorder="0"
          allow="clipboard-read; clipboard-write"
          onLoad={() => setLoaded(true)}
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fitness/GoogleSheetViewer.tsx
git commit -m "feat: add GoogleSheetViewer iframe component"
```

---

### Task 4: Update `TrainingTab` — dialog + conditional render

**Files:**
- Modify: `src/components/fitness/tabs/TrainingTab.tsx`

- [ ] **Step 1: Add `updatePlanSheetUrl` to the hook destructure and new state**

Find the line (around line 22):
```typescript
const { records, exercises, activePlan, days, loading, saveRecord, createPlan, saveExercise, updateExercise, deleteExercise } = useTraining(clientId);
```

Replace with:
```typescript
const { records, exercises, activePlan, days, loading, saveRecord, createPlan, updatePlanSheetUrl, saveExercise, updateExercise, deleteExercise } = useTraining(clientId);
```

- [ ] **Step 2: Add state for sheet URL fields**

Find the existing state declarations (around lines 26-31) and add after `const [planName, setPlanName] = useState('');`:

```typescript
const [planSheetUrl, setPlanSheetUrl] = useState('');
const [editSheetDialog, setEditSheetDialog] = useState(false);
const [editSheetUrl, setEditSheetUrl] = useState('');
```

- [ ] **Step 3: Import `GoogleSheetViewer`**

At the top of the file, after existing imports, add:
```typescript
import { GoogleSheetViewer } from '@/components/fitness/GoogleSheetViewer';
```

- [ ] **Step 4: Update plan creation handler**

Find (line 618):
```typescript
onClick={async () => { await createPlan(planName || 'Plan'); setPlanDialog(false); }}
```

Replace with:
```typescript
onClick={async () => { await createPlan(planName || 'Plan', planSheetUrl.trim() || undefined); setPlanDialog(false); setPlanSheetUrl(''); }}
```

- [ ] **Step 5: Add sheet URL input to Plan Dialog**

Find the Plan Dialog content (lines 602-609):
```typescript
<div style={{ padding: '8px 0' }}>
  <label style={labelStyle}>Nombre del plan</label>
  <input
    placeholder="Plan Definición 2026" value={planName}
    onChange={e => setPlanName(e.target.value)}
    style={inputStyle}
  />
</div>
```

Replace with:
```typescript
<div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <div>
    <label style={labelStyle}>Nombre del plan</label>
    <input
      placeholder="Plan Definición 2026" value={planName}
      onChange={e => setPlanName(e.target.value)}
      style={inputStyle}
    />
  </div>
  <div>
    <label style={labelStyle}>Link de Google Sheets (opcional)</label>
    <input
      placeholder="https://docs.google.com/spreadsheets/d/..." value={planSheetUrl}
      onChange={e => setPlanSheetUrl(e.target.value)}
      style={inputStyle}
    />
  </div>
</div>
```

- [ ] **Step 6: Replace exercise table with conditional render**

Find the section that renders the exercise table. Look for the JSX block that maps over `days` or shows the workout exercises (typically a `<div>` block with day headers and exercise rows). This is the section between the plan header and the PR section.

Wrap the entire exercise table section with a conditional. The pattern is:

```typescript
{activePlan?.google_sheet_url ? (
  <GoogleSheetViewer
    url={activePlan.google_sheet_url}
    onChangeUrl={() => { setEditSheetUrl(activePlan.google_sheet_url ?? ''); setEditSheetDialog(true); }}
    theme={T}
  />
) : (
  /* existing exercise table JSX — leave untouched */
  ...existing exercise table code...
)}
```

To find the exact boundaries, look for the block that starts rendering days/exercises (after the plan name header row) and ends before the Strength Records (`{/* Fuerza */}` or similar comment).

- [ ] **Step 7: Add Edit Sheet URL Dialog**

Before the closing `</div>` of the component (line 626), after the Plan Dialog closing tag (`</Dialog>`), add:

```typescript
{/* Edit Sheet URL Dialog */}
<Dialog open={editSheetDialog} onOpenChange={setEditSheetDialog}>
  <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 400 }}>
    <DialogHeader>
      <DialogTitle style={{ color: T.text }}>Cambiar link de Google Sheets</DialogTitle>
    </DialogHeader>
    <div style={{ padding: '8px 0' }}>
      <label style={labelStyle}>Link de Google Sheets</label>
      <input
        placeholder="https://docs.google.com/spreadsheets/d/..."
        value={editSheetUrl}
        onChange={e => setEditSheetUrl(e.target.value)}
        style={inputStyle}
      />
    </div>
    <DialogFooter>
      <button
        onClick={() => setEditSheetDialog(false)}
        style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
      >
        Cancelar
      </button>
      <button
        onClick={async () => {
          if (activePlan) {
            await updatePlanSheetUrl(activePlan.id, editSheetUrl.trim() || null);
          }
          setEditSheetDialog(false);
        }}
        style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        Guardar
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- [ ] **Step 8: Commit**

```bash
git add src/components/fitness/tabs/TrainingTab.tsx
git commit -m "feat: integrate GoogleSheetViewer into TrainingTab"
```

---

### Task 5: Run SQL migration

- [ ] **Step 1: Run SQL in Supabase**

Open Supabase dashboard → SQL Editor. Paste and run:

```sql
ALTER TABLE workout_plans
ADD COLUMN IF NOT EXISTS google_sheet_url TEXT;
```

File also at: `docs/superpowers/specs/2026-05-13-training-google-sheet-embed.sql`

- [ ] **Step 2: Verify**

In Supabase table editor, open `workout_plans` — confirm column `google_sheet_url` exists with type `text`, nullable.

---

### Task 6: Manual smoke test

- [ ] Open `http://localhost:5173/crm-clients/<any-id>` → tab Entrenamiento
- [ ] Click "Crear plan" → verify two inputs show: name + Google Sheets link
- [ ] Create plan **without** sheet URL → existing exercise table renders as before
- [ ] Create plan **with** a valid Google Sheets link → iframe renders with "Abrir en Google Sheets" link and "Cambiar link" button
- [ ] Click "Cambiar link" → dialog opens, can update or clear the URL
- [ ] Paste invalid URL → `GoogleSheetViewer` shows "Link inválido." error state
