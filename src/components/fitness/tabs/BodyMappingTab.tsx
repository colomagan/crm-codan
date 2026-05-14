import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useBodyMapping } from '@/hooks/fitness/useBodyMapping';
import { BODY_ZONES } from '@/types/fitness';
import type { BodyMeasurement } from '@/types/fitness';
import { format, parseISO } from 'date-fns';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

type View = 'front' | 'back';

interface Props { clientId: string; }

// Hotspot definitions: body zone key → SVG position + label position
const HOTSPOTS: Array<{
  key: keyof BodyMeasurement;
  label: string;
  cx: number; cy: number;
  r: number; pr: number;  // dot radius, pulse radius
  leaderSide: 'right' | 'left';
  lx1: number; lx2: number;
  labelX: number; labelY: number;
  deltaX?: number; deltaY?: number;
}> = [
  { key: 'neck',    label: 'CUELLO',  cx: 130, cy: 46,  r: 5,   pr: 8,  leaderSide: 'right', lx1: 134, lx2: 206, labelX: 208, labelY: 44,  deltaX: 48, deltaY: 48 },
  { key: 'chest',   label: 'PECHO',   cx: 172, cy: 120, r: 6.5, pr: 9,  leaderSide: 'right', lx1: 174, lx2: 218, labelX: 220, labelY: 118 },
  { key: 'bicep_r', label: 'BRAZO',   cx: 202, cy: 152, r: 5,   pr: 8,  leaderSide: 'right', lx1: 202, lx2: 226, labelX: 228, labelY: 150 },
  { key: 'waist',   label: 'CINTURA', cx: 172, cy: 188, r: 6,   pr: 9,  leaderSide: 'right', lx1: 174, lx2: 218, labelX: 220, labelY: 186, deltaX: 48, deltaY: 190 },
  { key: 'hips',    label: 'CADERA',  cx: 160, cy: 246, r: 5.5, pr: 8,  leaderSide: 'right', lx1: 160, lx2: 218, labelX: 220, labelY: 244, deltaX: 48, deltaY: 248 },
  { key: 'thigh_r', label: 'MUSLO',   cx: 160, cy: 340, r: 5.5, pr: 8,  leaderSide: 'right', lx1: 160, lx2: 218, labelX: 220, labelY: 338 },
  { key: 'calf_r',  label: 'GEMELO',  cx: 156, cy: 430, r: 4.5, pr: 7,  leaderSide: 'right', lx1: 156, lx2: 218, labelX: 220, labelY: 428 },
  { key: 'bicep_l', label: 'BRAZO I', cx: 86,  cy: 120, r: 5,   pr: 8,  leaderSide: 'left',  lx1: 86,  lx2: 50,  labelX: 4,   labelY: 118 },
  { key: 'shoulders',label:'HOMBROS', cx: 86,  cy: 188, r: 5,   pr: 8,  leaderSide: 'left',  lx1: 86,  lx2: 50,  labelX: 4,   labelY: 186 },
];

function inBody(x: number, y: number): boolean {
  if (((x - 130) / 30) ** 2 + ((y - 46) / 34) ** 2 < 1) return true;
  if (x >= 118 && x <= 142 && y >= 72 && y <= 92) return true;
  if (y >= 88 && y <= 262) {
    const t = (y - 88) / 174;
    let halfW: number;
    if (t < 0.28) halfW = 50 + t * 18;
    else if (t < 0.62) halfW = 55 - (t - 0.28) * 50;
    else halfW = 38 + (t - 0.62) * 42;
    if (Math.abs(x - 130) <= halfW) return true;
  }
  if (y >= 96 && y <= 256) {
    const t = (y - 96) / 160;
    const out = Math.sin(t * Math.PI) * 5;
    const armW = 13 - t * 4 + out * 0.3;
    const leftCx = 78 - t * 38 - out * 0.4;
    const rightCx = 182 + t * 38 + out * 0.4;
    if (Math.abs(x - leftCx) <= armW) return true;
    if (Math.abs(x - rightCx) <= armW) return true;
  }
  if (y >= 252 && y <= 278) {
    if (((x - 38) / 10) ** 2 + ((y - 266) / 12) ** 2 < 1) return true;
    if (((x - 222) / 10) ** 2 + ((y - 266) / 12) ** 2 < 1) return true;
  }
  if (y >= 260 && y <= 496) {
    const t = (y - 260) / 236;
    const taper = 24 - t * 13;
    const leftCx = 112 - t * 4;
    const rightCx = 148 + t * 4;
    if (Math.abs(x - leftCx) <= taper) return true;
    if (Math.abs(x - rightCx) <= taper) return true;
  }
  if (y >= 492 && y <= 512) {
    if (((x - 108) / 14) ** 2 + ((y - 502) / 9) ** 2 < 1) return true;
    if (((x - 152) / 14) ** 2 + ((y - 502) / 9) ** 2 < 1) return true;
  }
  return false;
}

function ParticleBody({ current, prev }: { current: BodyMeasurement | null; prev: BodyMeasurement | null }) {
  const dotsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const g = dotsRef.current;
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);

    const hot = HOTSPOTS.map(h => [h.cx, h.cy] as [number, number]);
    function nearHot(x: number, y: number): number {
      for (const [hx, hy] of hot) {
        const d = Math.hypot(x - hx, y - hy);
        if (d < 20) return 1 - d / 20;
      }
      return 0;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const TOTAL = 2400;
    const frag = document.createDocumentFragment();
    let placed = 0;

    for (let i = 0; i < TOTAL && placed < 1100; i++) {
      const x = Math.random() * 260;
      const y = Math.random() * 520;
      const inside = inBody(x, y);
      const hotProx = nearHot(x, y);
      const p = inside ? 0.92 : 0.05;
      if (Math.random() > p) continue;

      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));

      const r = inside
        ? 1.0 + Math.random() * 1.8 + hotProx * 1.0
        : 0.6 + Math.random() * 0.9;
      c.setAttribute('r', r.toFixed(2));

      const isLime = inside ? Math.random() < 0.82 : Math.random() < 0.4;
      if (isLime) {
        const op = inside
          ? 0.55 + Math.random() * 0.45 + hotProx * 0.25
          : 0.25 + Math.random() * 0.3;
        c.setAttribute('fill', '#c8ff3d');
        c.setAttribute('opacity', Math.min(1, op).toFixed(2));
      } else {
        c.setAttribute('fill', inside ? '#6b7280' : '#3a3e46');
        c.setAttribute('opacity', (0.3 + Math.random() * 0.4).toFixed(2));
      }
      frag.appendChild(c);
      placed++;
    }
    g.appendChild(frag);
  }, []);

  const pulseStyle: React.CSSProperties = {
    transformOrigin: 'center',
    animation: 'hsPluse 2.4s ease-out infinite',
  };

  return (
    <>
      <style>{`
        @keyframes hsPluse {
          0%   { transform: scale(0.85); opacity: 0.55; }
          70%  { transform: scale(1.6);  opacity: 0; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
      `}</style>
      <svg viewBox="0 0 380 520" style={{ width: '100%', height: 'auto', maxHeight: 560 }}>
        <defs>
          <radialGradient id="hsGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#c8ff3d" stopOpacity="0.55"/>
            <stop offset="60%"  stopColor="#c8ff3d" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#c8ff3d" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Particle dots */}
        <g ref={dotsRef} />

        {/* Leader lines */}
        <g stroke="#2e323a" strokeWidth="0.8" strokeDasharray="2 2">
          {HOTSPOTS.map(h => (
            <line key={h.key + '-line'} x1={h.lx1} y1={h.cy} x2={h.lx2} y2={h.cy} />
          ))}
        </g>

        {/* Hotspots */}
        <g>
          {HOTSPOTS.map(h => {
            const val = current ? (current[h.key] as number | null) : null;
            if (val == null) return null;
            return (
              <g key={h.key + '-hs'} transform={`translate(${h.cx} ${h.cy})`}>
                <circle r={h.r + 8} fill="url(#hsGlow)" />
                <circle r={h.pr} fill="none" stroke="#c8ff3d" strokeWidth="1" opacity="0.6" style={pulseStyle} />
                <circle r={h.r} fill="#c8ff3d" />
                <circle r={h.r * 0.4} fill="#0a0b0d" />
                <circle r={h.r * 0.18} fill="#ffffff" />
              </g>
            );
          })}
        </g>

        {/* Right-side labels */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="9">
          {HOTSPOTS.filter(h => h.leaderSide === 'right').map(h => {
            const val = current ? (current[h.key] as number | null) : null;
            if (val == null) return null;
            return (
              <g key={h.key + '-lbl'} transform={`translate(${h.labelX} ${h.labelY})`}>
                <text fill="#7a7e88" letterSpacing="0.05em">{h.label}</text>
                <text y="11" fill="#c8ff3d" fontSize="10" fontWeight="600">{val.toFixed(1)} cm</text>
              </g>
            );
          })}
        </g>

        {/* Left-side labels */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" textAnchor="end">
          {HOTSPOTS.filter(h => h.leaderSide === 'left').map(h => {
            const val = current ? (current[h.key] as number | null) : null;
            if (val == null) return null;
            const pVal = prev ? (prev[h.key] as number | null) : null;
            const d = val != null && pVal != null ? val - pVal : null;
            const deltaColor = d == null ? T.text4 : Math.abs(d) < 0.5 ? T.text4 : d > 0 ? T.good : T.danger;
            const deltaText = d == null ? '' : Math.abs(d) < 0.5 ? '—' : `${d > 0 ? '▴' : '▾'} ${Math.abs(d).toFixed(1)}`;
            return (
              <g key={h.key + '-llbl'} transform={`translate(${h.labelX} ${h.labelY})`}>
                <text fill="#7a7e88" letterSpacing="0.05em">{h.label}</text>
                <text y="11" fill="#c8ff3d" fontSize="10" fontWeight="600">{val.toFixed(1)} cm</text>
                {deltaText && <text y="22" fill={deltaColor} fontSize="8">{deltaText}</text>}
              </g>
            );
          })}
        </g>

        {/* Right-side delta values */}
        <g fontFamily="JetBrains Mono, monospace" fontSize="9" textAnchor="end" fill={T.text4}>
          {HOTSPOTS.filter(h => h.deltaX != null).map(h => {
            const val = current ? (current[h.key] as number | null) : null;
            const pVal = prev ? (prev[h.key] as number | null) : null;
            if (val == null || pVal == null) return null;
            const d = val - pVal;
            if (Math.abs(d) < 0.5) return null;
            const color = d > 0 ? T.good : T.danger;
            return (
              <text key={h.key + '-delta'} x={h.deltaX} y={(h.deltaY ?? h.cy) + 2} fill={color}>
                {d > 0 ? '▴' : '▾'} {Math.abs(d).toFixed(1)}
              </text>
            );
          })}
        </g>
      </svg>
    </>
  );
}

export function BodyMappingTab({ clientId }: Props) {
  const { measurements, loading, save } = useBodyMapping(clientId);
  const [view, setView] = useState<View>('front');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ date: '' });

  const current = measurements[0] ?? null;
  const prev = measurements[1] ?? null;

  const handleSave = async () => {
    const entry: Omit<BodyMeasurement, 'id' | 'client_id' | 'user_id' | 'created_at'> = {
      date: form.date,
      neck: form.neck ? parseFloat(form.neck) : null,
      shoulders: form.shoulders ? parseFloat(form.shoulders) : null,
      chest: form.chest ? parseFloat(form.chest) : null,
      bicep_l: form.bicep_l ? parseFloat(form.bicep_l) : null,
      bicep_r: form.bicep_r ? parseFloat(form.bicep_r) : null,
      waist: form.waist ? parseFloat(form.waist) : null,
      hips: form.hips ? parseFloat(form.hips) : null,
      thigh_l: form.thigh_l ? parseFloat(form.thigh_l) : null,
      thigh_r: form.thigh_r ? parseFloat(form.thigh_r) : null,
      calf_l: form.calf_l ? parseFloat(form.calf_l) : null,
      calf_r: form.calf_r ? parseFloat(form.calf_r) : null,
    };
    await save(entry);
    setOpen(false);
    setForm({ date: '' });
  };

  const segStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    background: active ? T.surface3 : 'transparent',
    color: active ? T.text : T.text3,
    border: 'none', borderRadius: 7, cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s', lineHeight: 1,
  });

  const segWrap: React.CSSProperties = {
    display: 'inline-flex', background: T.surface2,
    border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2,
  };

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.1 }}>
            Composición corporal
          </h2>
          <p style={{ fontSize: 13, color: T.text3, margin: '4px 0 0' }}>
            Medidas perimetrales · última toma{' '}
            {current ? format(parseISO(current.date), 'dd MMM yyyy') : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={segWrap}>
            <button onClick={() => setView('front')} style={segStyle(view === 'front')}>Frontal</button>
            <button style={segStyle(false)}>Lateral</button>
            <button onClick={() => setView('back')} style={segStyle(view === 'back')}>Trasera</button>
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              background: T.accent, color: T.accentInk,
              border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, lineHeight: 1,
            }}
          >
            <Plus size={13} strokeWidth={2.5} /> Registrar
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

          {/* Left — particle body */}
          <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0' }}>
            {loading ? (
              <div style={{ width: 260, height: 520, background: T.surface3, borderRadius: 12 }} />
            ) : (
              <ParticleBody current={current} prev={prev} />
            )}
          </div>

          {/* Right — measurements list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Medidas perimetrales</span>
                <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>cm · cambio vs sesión anterior</div>
              </div>
              {current && (
                <span style={{
                  background: T.accentDim, color: T.accent,
                  border: `1px solid ${T.accentLine}`,
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: 999, padding: '3px 8px',
                }}>
                  {BODY_ZONES.filter(z => current[z.key as keyof BodyMeasurement] != null).length} puntos · {format(parseISO(current.date), 'dd MMM yyyy')}
                </span>
              )}
            </div>

            {!current ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: T.text3, margin: '0 0 16px' }}>Sin medidas registradas.</p>
                <button
                  onClick={() => setOpen(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 16px', fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: T.accent, color: T.accentInk,
                    border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} /> Registrar primeras medidas
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {BODY_ZONES.map(z => {
                  const c = current[z.key as keyof BodyMeasurement] as number | null;
                  const p = prev ? prev[z.key as keyof BodyMeasurement] as number | null : null;
                  const d = c != null && p != null ? c - p : null;
                  const barWidth = c != null ? Math.min(100, (c / 120) * 100) : 0;

                  let deltaEl: React.ReactNode = <span style={{ color: T.text3 }}>—</span>;
                  if (d != null) {
                    if (Math.abs(d) < 0.5) {
                      deltaEl = <span style={{ color: T.text3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>—</span>;
                    } else if (d > 0) {
                      deltaEl = <span style={{ color: T.good, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>▴ {d.toFixed(1)}</span>;
                    } else {
                      deltaEl = <span style={{ color: T.danger, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>▾ {Math.abs(d).toFixed(1)}</span>;
                    }
                  }

                  return (
                    <div
                      key={z.key}
                      style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 80px 60px',
                        gap: 10, alignItems: 'center', padding: '12px 14px',
                        background: T.surface2, border: `1px solid ${T.border}`,
                        borderRadius: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.text }}>{z.label}</span>
                      <div style={{ height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <i style={{ display: 'block', height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg, #c8ff3d, #9eff3d)', borderRadius: 3 }} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {c != null ? (
                          <>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: T.text }}>{c}</span>
                            <span style={{ fontSize: 11, color: T.text3, marginLeft: 2 }}>cm</span>
                          </>
                        ) : (
                          <span style={{ color: T.text4, fontSize: 13 }}>—</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>{deltaEl}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Registrar medidas corporales</DialogTitle>
          </DialogHeader>
          <div style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <Label style={{ fontSize: 10, textTransform: 'uppercase', color: T.text3, letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                Fecha *
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 28, fontSize: 13, borderRadius: 8 }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {BODY_ZONES.map(z => (
                <div key={z.key}>
                  <Label style={{ fontSize: 10, textTransform: 'uppercase', color: T.text3, letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                    {z.label} (cm)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form[z.key] ?? ''}
                    onChange={e => setForm(p => ({ ...p, [z.key]: e.target.value }))}
                    style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 28, fontSize: 13, borderRadius: 8 }}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              style={{ color: T.text3, border: `1px solid ${T.border}` }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.date}
              style={{ background: T.accent, color: T.accentInk, border: 'none', fontWeight: 600 }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
