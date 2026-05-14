import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNutrition } from '@/hooks/fitness/useNutrition';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

interface Props { clientId: string; }

function toEmbedPdfUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    const match = trimmed.match(/[-\w]{25,}/);
    if (match) return `https://drive.google.com/file/d/${match[0]}/preview`;
  }
  return trimmed;
}

export function NutritionTab({ clientId }: Props) {
  const { plan, loading, createPlan, updatePlanPdfUrl } = useNutrition(clientId);

  const [linkDialog, setLinkDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleSaveUrl = async () => {
    const url = pdfUrl.trim();
    if (!url) return;
    if (plan) {
      await updatePlanPdfUrl(plan.id, url);
    } else {
      await createPlan('Plan nutricional', 2000, 150, 200, 67, url);
    }
    setLinkDialog(false);
    setPdfUrl('');
  };

  const openEditDialog = () => {
    setPdfUrl(plan?.pdf_url ?? '');
    setLinkDialog(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: T.text3, fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  const embedUrl = plan?.pdf_url ? toEmbedPdfUrl(plan.pdf_url) : null;

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {embedUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: T.text3 }}>
              Plan nutricional · PDF
            </span>
            <a
              href={plan!.pdf_url!}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.accent, textDecoration: 'none' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Abrir en pestaña
            </a>
            <button
              onClick={openEditDialog}
              style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Cambiar link
            </button>
          </div>

          {/* PDF viewer */}
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.borderStrong}` }}>
            {!iframeLoaded && (
              <div style={{
                position: 'absolute', inset: 0, minHeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: T.surface, color: T.text3, fontSize: 13,
              }}>
                Cargando PDF...
              </div>
            )}
            <iframe
              src={embedUrl}
              width="100%"
              height="700"
              style={{ display: 'block', border: 'none' }}
              onLoad={() => setIframeLoaded(true)}
              allow="autoplay"
            />
          </div>
        </div>
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>
              Sin plan nutricional
            </p>
            <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
              Vinculá un PDF para previsualizarlo desde aquí.
            </p>
          </div>
          <button
            onClick={() => { setPdfUrl(''); setLinkDialog(true); }}
            style={{
              background: T.accent, color: T.accentInk, border: 'none',
              borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cargar link del PDF
          </button>
        </div>
      )}

      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>
              {plan?.pdf_url ? 'Cambiar PDF' : 'Cargar plan nutricional'}
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3, display: 'block', marginBottom: 6 }}>
                Link del PDF
              </label>
              <input
                placeholder="https://drive.google.com/file/d/... o link directo al PDF"
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                style={{
                  background: T.surface2, border: `1px solid ${T.border}`,
                  color: T.text, height: 36, borderRadius: 8, fontSize: 13,
                  padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                }}
                autoFocus
              />
            </div>
            <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>
              Soporta Google Drive (se embebe automáticamente) y links directos a PDF.
            </p>
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
              disabled={!pdfUrl.trim()}
              style={{
                background: T.accent, color: T.accentInk, border: 'none',
                borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: !pdfUrl.trim() ? 0.5 : 1,
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
