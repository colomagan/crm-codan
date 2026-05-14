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

interface Theme {
  surface: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  accent: string;
  accentInk: string;
}

interface GoogleSheetViewerProps {
  url: string;
  onChangeUrl: () => void;
  theme: Theme;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.surface, color: T.text2, fontSize: 13, minHeight: 600 }}>
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
