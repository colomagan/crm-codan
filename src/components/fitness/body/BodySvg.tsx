import { useState } from 'react';
import type { BodyMeasurement, BodyZone } from '@/types/fitness';

type Layer = 'muscle' | 'fat' | 'measurements';

interface ZoneConfig {
  key: BodyZone;
  label: string;
  type: 'fat' | 'muscle' | 'neutral';
  frontPath?: string;
  backPath?: string;
}

const ZONES: ZoneConfig[] = [
  { key: 'neck',      label: 'Cuello',      type: 'fat',    frontPath: 'neck-front',    backPath: 'neck-back' },
  { key: 'shoulders', label: 'Hombros',     type: 'muscle', frontPath: 'shoulder-front', backPath: 'shoulder-back' },
  { key: 'chest',     label: 'Pecho',       type: 'muscle', frontPath: 'chest-front' },
  { key: 'bicep_l',   label: 'Bícep Izq.',  type: 'muscle', frontPath: 'bicep-l-front', backPath: 'bicep-l-back' },
  { key: 'bicep_r',   label: 'Bícep Der.',  type: 'muscle', frontPath: 'bicep-r-front', backPath: 'bicep-r-back' },
  { key: 'waist',     label: 'Cintura',     type: 'fat',    frontPath: 'waist-front',   backPath: 'waist-back' },
  { key: 'hips',      label: 'Cadera',      type: 'fat',    frontPath: 'hips-front',    backPath: 'hips-back' },
  { key: 'thigh_l',   label: 'Muslo Izq.',  type: 'muscle', frontPath: 'thigh-l-front', backPath: 'thigh-l-back' },
  { key: 'thigh_r',   label: 'Muslo Der.',  type: 'muscle', frontPath: 'thigh-r-front', backPath: 'thigh-r-back' },
  { key: 'calf_l',    label: 'Gemelo Izq.', type: 'muscle', frontPath: 'calf-l-front',  backPath: 'calf-l-back' },
  { key: 'calf_r',    label: 'Gemelo Der.', type: 'muscle', frontPath: 'calf-r-front',  backPath: 'calf-r-back' },
];

function getZoneColor(zone: ZoneConfig, current: BodyMeasurement | null, prev: BodyMeasurement | null, layer: Layer): string {
  if (layer === 'measurements') return '#334155';
  if (!current || !prev) return '#1e3a5f';
  const cur = current[zone.key as keyof BodyMeasurement] as number | null;
  const pre = prev[zone.key as keyof BodyMeasurement] as number | null;
  if (cur == null || pre == null) return '#1e3a5f';
  const delta = cur - pre;
  if (Math.abs(delta) < 0.5) return '#334155';
  if (zone.type === 'fat') {
    return delta < 0 ? '#ef4444' : '#f59e0b';
  } else {
    return delta > 0 ? '#10b981' : '#f59e0b';
  }
}

type TooltipState = { x: number; y: number; zone: ZoneConfig } | null;

interface Props {
  current: BodyMeasurement | null;
  prev: BodyMeasurement | null;
  layer: Layer;
  view: 'front' | 'back';
}

export function BodySvg({ current, prev, layer, view }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; zone: ZoneConfig } | null>(null);

  function getColor(key: BodyZone) {
    const zone = ZONES.find(z => z.key === key)!;
    return getZoneColor(zone, current, prev, layer);
  }

  function showTooltip(e: React.MouseEvent, key: BodyZone) {
    const zone = ZONES.find(z => z.key === key)!;
    setTooltip({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, zone });
  }

  const cur = (key: BodyZone) => current?.[key as keyof BodyMeasurement] as number | null;
  const pre = (key: BodyZone) => prev?.[key as keyof BodyMeasurement] as number | null;

  return (
    <div className="relative select-none" style={{ width: 120 }}>
      <svg viewBox="0 0 120 280" width="120" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        {/* Head */}
        <circle cx="60" cy="22" r="16" fill="#1e3a5f" stroke="#334155" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="55" y="36" width="10" height="12" rx="3"
          fill={getColor('neck')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'neck')} onMouseLeave={() => setTooltip(null)} />

        {/* Shoulders */}
        <rect x="20" y="46" width="22" height="14" rx="5"
          fill={getColor('shoulders')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'shoulders')} onMouseLeave={() => setTooltip(null)} />
        <rect x="78" y="46" width="22" height="14" rx="5"
          fill={getColor('shoulders')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'shoulders')} onMouseLeave={() => setTooltip(null)} />

        {/* Torso/Chest */}
        <rect x="36" y="46" width="48" height="26" rx="4"
          fill={view === 'front' ? getColor('chest') : '#1e3a5f'} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'chest')} onMouseLeave={() => setTooltip(null)} />

        {/* Waist */}
        <rect x="38" y="74" width="44" height="28" rx="4"
          fill={getColor('waist')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'waist')} onMouseLeave={() => setTooltip(null)} />

        {/* Hips */}
        <rect x="34" y="104" width="52" height="18" rx="5"
          fill={getColor('hips')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'hips')} onMouseLeave={() => setTooltip(null)} />

        {/* Left arm (bicep) */}
        <rect x="14" y="58" width="20" height="36" rx="6"
          fill={getColor('bicep_l')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'bicep_l')} onMouseLeave={() => setTooltip(null)} />

        {/* Right arm (bicep) */}
        <rect x="86" y="58" width="20" height="36" rx="6"
          fill={getColor('bicep_r')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'bicep_r')} onMouseLeave={() => setTooltip(null)} />

        {/* Forearms */}
        <rect x="12" y="96" width="18" height="28" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect x="90" y="96" width="18" height="28" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />

        {/* Left thigh */}
        <rect x="36" y="124" width="22" height="44" rx="6"
          fill={getColor('thigh_l')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'thigh_l')} onMouseLeave={() => setTooltip(null)} />

        {/* Right thigh */}
        <rect x="62" y="124" width="22" height="44" rx="6"
          fill={getColor('thigh_r')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'thigh_r')} onMouseLeave={() => setTooltip(null)} />

        {/* Left calf */}
        <rect x="37" y="170" width="18" height="38" rx="5"
          fill={getColor('calf_l')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'calf_l')} onMouseLeave={() => setTooltip(null)} />

        {/* Right calf */}
        <rect x="65" y="170" width="18" height="38" rx="5"
          fill={getColor('calf_r')} stroke="#334155" strokeWidth="1" style={{ cursor: 'pointer' }}
          onMouseEnter={e => showTooltip(e, 'calf_r')} onMouseLeave={() => setTooltip(null)} />

        {/* Feet */}
        <rect x="34" y="210" width="22" height="12" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <rect x="64" y="210" width="22" height="12" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const key = tooltip.zone.key;
        const c = cur(key);
        const p = pre(key);
        const d = c != null && p != null ? (c - p).toFixed(1) : null;
        return (
          <div className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-2 text-xs shadow-xl"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10, minWidth: 100 }}>
            <p className="font-semibold text-white mb-1">{tooltip.zone.label}</p>
            <p className="text-slate-300">{c != null ? `${c} cm` : 'Sin datos'}</p>
            {p != null && <p className="text-slate-500">Ant: {p} cm</p>}
            {d != null && (
              <p className={parseFloat(d) === 0 ? 'text-slate-400' : parseFloat(d) > 0 ? 'text-emerald-400' : 'text-red-400'}>
                Δ {parseFloat(d) > 0 ? '+' : ''}{d} cm
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
