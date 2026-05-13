import { Info } from 'lucide-react';
import { BRAND } from '../constants';
import type { ScraperMeta } from '../types';

const SCRAPER_META: Record<'google-places' | 'scraper-2', ScraperMeta> = {
  'google-places': {
    title: '🗺️ Google Places Scraper',
    description:
      'Busca negocios en Google Maps usando palabras clave y ubicación. ' +
      'Obtené nombre, dirección, teléfono, web, categoría y reseñas de cada lugar. ' +
      'Ideal para prospectar negocios locales en cualquier ciudad del mundo.',
    highlights: [
      { label: '⚡ 1 crédito por lead encontrado', variant: 'warning' },
      { label: '📞 Incluye Numeros verificados', variant: 'info' },
      { label: '📍 Requiere keyword + ubicación para mejores resultados', variant: 'default' },
    ],
  },
  'scraper-2': {
    title: '🔗 LinkedIn Leads Finder',
    description:
      'Buscá contactos profesionales en LinkedIn filtrando por cargo, industria, ubicación, tamaño de empresa y más. ' +
      'Cada resultado incluye nombre, email, empresa, cargo y URL de LinkedIn.',
    highlights: [
      { label: '⚡ 1 crédito por lead encontrado', variant: 'warning' },
      { label: '📧 Incluye emails verificados', variant: 'info' },
      { label: '🎯 Filtros avanzados de segmentación', variant: 'default' },
      { label: '🏢 Datos de empresa incluidos', variant: 'default' },
    ],
  },
};

const variantStyles: Record<string, string> = {
  default: 'bg-muted text-foreground border border-border',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  info:    'border text-white',
};

export function ScraperInfo({ id }: { id: 'google-places' | 'scraper-2' }) {
  const meta = SCRAPER_META[id];

  return (
    <div className="rounded-xl border px-5 py-4 space-y-3" style={{ borderColor: `${BRAND}20`, background: `${BRAND}06` }}>
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: BRAND }} />
        <span className="font-semibold text-sm" style={{ color: BRAND }}>{meta.title}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
      {meta.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {meta.highlights.map((h, i) => (
            <span
              key={i}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${variantStyles[h.variant ?? 'default']}`}
              style={h.variant === 'info' ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
            >
              {h.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
