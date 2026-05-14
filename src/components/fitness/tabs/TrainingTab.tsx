import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTraining } from '@/hooks/fitness/useTraining';
import { GoogleSheetViewer } from '@/components/fitness/GoogleSheetViewer';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

interface Props { clientId: string; }

export function TrainingTab({ clientId }: Props) {
  const { activePlan, loading, createPlan, updatePlanSheetUrl } = useTraining(clientId);

  const [linkDialog, setLinkDialog] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  const handleSaveUrl = async () => {
    const url = sheetUrl.trim();
    if (!url) return;
    if (activePlan) {
      await updatePlanSheetUrl(activePlan.id, url);
    } else {
      await createPlan('Plan de entrenamiento', url);
    }
    setLinkDialog(false);
    setSheetUrl('');
  };

  const openEditDialog = () => {
    setSheetUrl(activePlan?.google_sheet_url ?? '');
    setLinkDialog(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: T.text3, fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {activePlan?.google_sheet_url ? (
        <GoogleSheetViewer
          url={activePlan.google_sheet_url}
          onChangeUrl={openEditDialog}
          theme={T}
        />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 360, gap: 16,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>
              Sin plan de entrenamiento
            </p>
            <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
              Vinculá un Google Sheet para ver y editar el plan desde aquí.
            </p>
          </div>
          <button
            onClick={() => { setSheetUrl(''); setLinkDialog(true); }}
            style={{
              background: T.accent, color: T.accentInk, border: 'none',
              borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cargar link de Google Sheets
          </button>
        </div>
      )}

      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 420 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>
              {activePlan?.google_sheet_url ? 'Cambiar link' : 'Cargar plan de entrenamiento'}
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <label style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3, display: 'block', marginBottom: 6 }}>
              Link de Google Sheets
            </label>
            <input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              style={{
                background: T.surface2, border: `1px solid ${T.border}`,
                color: T.text, height: 36, borderRadius: 8, fontSize: 13,
                padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const,
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setLinkDialog(false)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveUrl}
              disabled={!sheetUrl.trim()}
              style={{
                background: T.accent, color: T.accentInk, border: 'none',
                borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: !sheetUrl.trim() ? 0.5 : 1,
              }}
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
