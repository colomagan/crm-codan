import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BodySvg } from '@/components/fitness/body/BodySvg';
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

type Layer = 'muscle' | 'fat' | 'measurements';
type View = 'front' | 'back';

interface Props { clientId: string; }

export function BodyMappingTab({ clientId }: Props) {
  const { measurements, loading, save } = useBodyMapping(clientId);
  const [layer, setLayer] = useState<Layer>('muscle');
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

  const layerLabels: Record<Layer, string> = { measurements: 'Medidas', fat: 'Grasa', muscle: 'Músculo' };
  const layerOrder: Layer[] = ['measurements', 'fat', 'muscle'];

  const segStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    background: active ? T.surface3 : 'transparent',
    color: active ? T.text : T.text3,
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    lineHeight: 1,
  });

  const segWrap: React.CSSProperties = {
    display: 'inline-flex',
    background: T.surface2,
    border: `1px solid ${T.border}`,
    borderRadius: 9,
    padding: 3,
    gap: 2,
  };

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Page header */}
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
          {/* Layer subtabs */}
          <div style={segWrap}>
            {layerOrder.map(l => (
              <button key={l} onClick={() => setLayer(l)} style={segStyle(layer === l)}>
                {layerLabels[l]}
              </button>
            ))}
          </div>
          {/* View seg control */}
          <div style={segWrap}>
            <button onClick={() => setView('front')} style={segStyle(view === 'front')}>Frontal</button>
            {/* Lateral is visual only — no state change */}
            <button style={segStyle(false)}>Lateral</button>
            <button onClick={() => setView('back')} style={segStyle(view === 'back')}>Trasera</button>
          </div>
          {/* Register button */}
          <button
            onClick={() => setOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              background: T.accent, color: T.accentInk,
              border: 'none', borderRadius: 9, cursor: 'pointer',
              fontWeight: 600, lineHeight: 1,
            }}
          >
            <Plus size={13} strokeWidth={2.5} /> Registrar
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
          {/* Left — body figure */}
          <div>
            <div style={{ display: 'grid', placeItems: 'center', padding: 12 }}>
              {loading ? (
                <div style={{ width: 120, height: 280, background: T.surface3, borderRadius: 12 }} />
              ) : (
                <BodySvg current={current} prev={prev} layer={layer} view={view} />
              )}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.danger }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.danger, flexShrink: 0 }} />
                ↓ Grasa/Medida
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.good }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.good, flexShrink: 0 }} />
                ↑ Músculo/Medida
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: T.warning }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: T.warning, flexShrink: 0 }} />
                Sin cambio sig.
              </div>
            </div>
          </div>

          {/* Right — measurements list */}
          <div>
            {/* Row header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Medidas perimetrales</span>
                <span style={{ fontSize: 12, color: T.text3, marginLeft: 8 }}>cm · cambio vs sesión anterior</span>
              </div>
              {current && (
                <span style={{
                  background: T.accentDim, color: T.accent,
                  border: `1px solid ${T.accentLine}`,
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: 999, padding: '3px 8px',
                  marginLeft: 'auto',
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
                    border: 'none', borderRadius: 9, cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} /> Registrar primeras medidas
                </button>
              </div>
            ) : (
              <div>
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
                        display: 'grid',
                        gridTemplateColumns: '140px 1fr 80px 60px',
                        gap: 10,
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, color: T.text }}>{z.label}</span>
                      <div style={{ height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <i style={{
                          display: 'block', height: '100%',
                          width: `${barWidth}%`,
                          background: 'linear-gradient(90deg, #c8ff3d, #9eff3d)',
                          borderRadius: 3,
                        }} />
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
