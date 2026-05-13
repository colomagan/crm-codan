import { useState } from 'react';
import { Plus, Trash2, Scale, Droplet, Dumbbell, CheckSquare, SlidersHorizontal, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, subMonths, subYears, subWeeks, differenceInDays } from 'date-fns';
import { useMetrics } from '@/hooks/fitness/useMetrics';
import type { FitnessMetric } from '@/types/fitness';

const T = {
  bg: '#0a0b0d',
  surface: '#111215',
  surface2: '#16181c',
  surface3: '#1c1f24',
  border: '#23262d',
  borderStrong: '#2e323a',
  text: '#f3f4f6',
  text2: '#b6b9c2',
  text3: '#7a7e88',
  text4: '#50545d',
  accent: '#c8ff3d',
  accentInk: '#0a0b0d',
  accentDim: 'rgba(200,255,61,0.12)',
  accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d',
  warning: '#ffb547',
  info: '#6ea8ff',
  good: '#51e2a8',
};

type Range = '1S' | '1M' | '3M' | '6M' | '1A';

const EMPTY = { date: '', weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', bmi: '', notes: '' };

interface Props { clientId: string; }

function sparkPoints(data: Array<number | null | undefined>, h = 24): string {
  const vals = data.filter((v): v is number => v != null);
  if (vals.length < 2) return '';
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 70 / (vals.length - 1);
  return vals.map((v, i) => `${(i * w).toFixed(1)},${(h - ((v - min) / range) * (h - 4) - 2).toFixed(1)}`).join(' ');
}

export function MetricsTab({ clientId }: Props) {
  const { metrics, loading, save, remove } = useMetrics(clientId);
  const [range, setRange] = useState<Range>('3M');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const cutoff = range === '1S' ? subWeeks(new Date(), 1)
    : range === '1M' ? subMonths(new Date(), 1)
    : range === '3M' ? subMonths(new Date(), 3)
    : range === '6M' ? subMonths(new Date(), 6)
    : subYears(new Date(), 1);

  const filtered = metrics.filter(m => parseISO(m.date) >= cutoff);
  const chartData = [...filtered].reverse().map(m => ({
    date: format(parseISO(m.date), 'dd MMM'),
    Peso: m.weight_kg,
    Grasa: m.body_fat_pct,
    Músculo: m.muscle_mass_kg,
  }));

  const handleSave = async () => {
    await save({
      date: form.date,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : null,
      bmi: form.bmi ? parseFloat(form.bmi) : null,
      notes: form.notes || null,
    });
    setOpen(false);
    setForm(EMPTY);
  };

  function delta(current: number | null, prev: number | null) {
    if (current == null || prev == null) return null;
    const d = current - prev;
    return d;
  }

  const latest = metrics[0] ?? null;
  const prev = metrics[1] ?? null;

  const dW = delta(latest?.weight_kg ?? null, prev?.weight_kg ?? null);
  const dF = delta(latest?.body_fat_pct ?? null, prev?.body_fat_pct ?? null);
  const dM = delta(latest?.muscle_mass_kg ?? null, prev?.muscle_mass_kg ?? null);

  const lastDateStr = latest ? format(parseISO(latest.date), 'dd MMM yyyy') : null;
  const daysSince = latest ? differenceInDays(new Date(), parseISO(latest.date)) : null;

  const sparkW = sparkPoints(chartData.slice(-8).map(d => d.Peso));
  const sparkF = sparkPoints(chartData.slice(-8).map(d => d.Grasa));
  const sparkM = sparkPoints(chartData.slice(-8).map(d => d.Músculo));

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: T.text3, fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 28, fontWeight: 400, color: T.text, letterSpacing: '-0.01em', margin: 0, lineHeight: 1.2 }}>
            Evolución física
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.text3 }}>
            {lastDateStr
              ? `Última medición · ${lastDateStr} · hace ${daysSince} día${daysSince === 1 ? '' : 's'}`
              : 'Sin mediciones'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Segmented range control */}
          <div style={{ display: 'inline-flex', padding: 3, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9 }}>
            {(['1S', '1M', '3M', '6M', '1A'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  fontFamily: '"JetBrains Mono", monospace',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: range === r ? T.surface3 : 'transparent',
                  color: range === r ? T.text : T.text3,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Comparar ghost button */}
          <button style={{ padding: '6px 14px', fontSize: 13, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            Comparar
          </button>

          {/* + Medición accent button */}
          <button
            onClick={() => setOpen(true)}
            style={{ padding: '6px 14px', fontSize: 13, fontWeight: 600, background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <Plus size={14} /> Medición
          </button>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: 16 }}>
          <p style={{ color: T.text3, fontSize: 14, margin: 0 }}>Sin mediciones aún.</p>
          <button
            onClick={() => setOpen(true)}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + Registrar primera medición
          </button>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {/* KPI: Peso */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.text3 }}>Peso</span>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12,7 12,12 15,14" />
                </svg>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 500, color: T.text }}>
                  {latest?.weight_kg ?? '—'}
                </span>
                {latest?.weight_kg != null && <span style={{ fontSize: 12, color: T.text3 }}>kg</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: dW == null ? T.text3 : dW < 0 ? T.good : T.danger }}>
                  {dW == null ? '—' : `${dW > 0 ? '+' : ''}${dW.toFixed(1)} kg`}
                </span>
                {sparkW && (
                  <svg width="70" height="24" viewBox="0 0 70 24">
                    <polyline points={sparkW} stroke={T.accent} strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </div>
            </div>

            {/* KPI: % Grasa */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.text3 }}>% Grasa</span>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5">
                  <path d="M12 2C8 8 5 13 5 16a7 7 0 0 0 14 0c0-3-3-8-7-14z" />
                </svg>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 500, color: T.text }}>
                  {latest?.body_fat_pct ?? '—'}
                </span>
                {latest?.body_fat_pct != null && <span style={{ fontSize: 12, color: T.text3 }}>%</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: dF == null ? T.text3 : dF < 0 ? T.good : T.danger }}>
                  {dF == null ? '—' : `${dF > 0 ? '+' : ''}${dF.toFixed(1)} %`}
                </span>
                {sparkF && (
                  <svg width="70" height="24" viewBox="0 0 70 24">
                    <polyline points={sparkF} stroke={T.accent} strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </div>
            </div>

            {/* KPI: Masa muscular */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.text3 }}>Músculo</span>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5">
                  <path d="M6 12h12M4 9c0-1.1.9-2 2-2h1l1-2h4l1 2h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z" />
                </svg>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 500, color: T.text }}>
                  {latest?.muscle_mass_kg ?? '—'}
                </span>
                {latest?.muscle_mass_kg != null && <span style={{ fontSize: 12, color: T.text3 }}>kg</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: dM == null ? T.text3 : dM > 0 ? T.good : T.danger }}>
                  {dM == null ? '—' : `${dM > 0 ? '+' : ''}${dM.toFixed(1)} kg`}
                </span>
                {sparkM && (
                  <svg width="70" height="24" viewBox="0 0 70 24">
                    <polyline points={sparkM} stroke={T.accent} strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </div>
            </div>

            {/* KPI: Adherencia */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.text3 }}>Adherencia</span>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 26, fontWeight: 500, color: T.text }}>—</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: T.text3 }}>0%</span>
              </div>
            </div>
          </div>

          {/* 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            {/* Left: chart card */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Evolución de composición</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: T.text3 }}>Peso vs % grasa · últimos 3 meses</p>
              </div>
              {/* Custom legend */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                {[{ label: 'Peso', color: '#c8ff3d' }, { label: 'Grasa', color: '#a78bff' }, { label: 'Músculo', color: '#6ea8ff' }].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 12, color: T.text2 }}>{l.label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: T.text3, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: T.text3, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: T.text3 }}
                    itemStyle={{ color: T.text2 }}
                  />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Line type="monotone" dataKey="Peso" stroke="#c8ff3d" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Grasa" stroke="#a78bff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Músculo" stroke="#6ea8ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Right: recent measurements card */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: T.text }}>Mediciones recientes</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {metrics.slice(0, 5).map((m, i) => {
                  const p2 = metrics[i + 1];
                  const dw = delta(m.weight_kg, p2?.weight_kg ?? null);
                  const df = delta(m.body_fat_pct, p2?.body_fat_pct ?? null);
                  const dm = delta(m.muscle_mass_kg, p2?.muscle_mass_kg ?? null);
                  return (
                    <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: T.text3, fontFamily: '"JetBrains Mono", monospace' }}>
                        {format(parseISO(m.date), 'dd MMM yyyy')}
                      </span>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {m.weight_kg != null && (
                          <span style={{ fontSize: 12, color: T.text2 }}>
                            {m.weight_kg} kg
                            {dw != null && <span style={{ marginLeft: 4, fontSize: 11, color: dw < 0 ? T.good : T.danger }}>{dw > 0 ? '▴' : '▾'}{Math.abs(dw).toFixed(1)}</span>}
                          </span>
                        )}
                        {m.body_fat_pct != null && (
                          <span style={{ fontSize: 12, color: T.text2 }}>
                            {m.body_fat_pct}%
                            {df != null && <span style={{ marginLeft: 4, fontSize: 11, color: df < 0 ? T.good : T.danger }}>{df > 0 ? '▴' : '▾'}{Math.abs(df).toFixed(1)}</span>}
                          </span>
                        )}
                        {m.muscle_mass_kg != null && (
                          <span style={{ fontSize: 12, color: T.text2 }}>
                            {m.muscle_mass_kg} kg M
                            {dm != null && <span style={{ marginLeft: 4, fontSize: 11, color: dm > 0 ? T.good : T.danger }}>{dm > 0 ? '▴' : '▾'}{Math.abs(dm).toFixed(1)}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Full-width measurements table */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Mediciones recientes</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: T.text3 }}>Tabla detallada con diferencias entre sesiones</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  <SlidersHorizontal size={13} /> Filtrar
                </button>
                <button style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  <Download size={13} /> Exportar CSV
                </button>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Fecha', 'Peso', '% Grasa', 'Músculo', 'Agua', 'IMC', 'Nota', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, textAlign: h === 'Fecha' || h === 'Nota' || h === '' ? 'left' : 'right', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.text3, fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const p2 = metrics[i + 1];
                  const dw = delta(m.weight_kg, p2?.weight_kg ?? null);
                  const df = delta(m.body_fat_pct, p2?.body_fat_pct ?? null);
                  const dm = delta(m.muscle_mass_kg, p2?.muscle_mass_kg ?? null);
                  const rowBg = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent';
                  return (
                    <tr key={m.id} style={{ background: rowBg }}>
                      <td style={{ padding: '10px 12px', color: T.text2, fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>
                        {format(parseISO(m.date), 'dd MMM yyyy')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.text }}>
                        {m.weight_kg ?? '—'}
                        {dw != null && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: dw < 0 ? T.good : T.danger }}>
                            {dw < 0 ? '▾' : '▴'}{Math.abs(dw).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.text }}>
                        {m.body_fat_pct != null ? `${m.body_fat_pct}%` : '—'}
                        {df != null && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: df < 0 ? T.good : T.danger }}>
                            {df < 0 ? '▾' : '▴'}{Math.abs(df).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.text }}>
                        {m.muscle_mass_kg ?? '—'}
                        {dm != null && (
                          <span style={{ marginLeft: 6, fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: dm > 0 ? T.good : T.danger }}>
                            {dm > 0 ? '▴' : '▾'}{Math.abs(dm).toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.text2 }}>
                        {(m as any).water_pct ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.text2 }}>
                        {m.bmi ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: T.text2, fontFamily: 'Inter, sans-serif', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.notes ?? ''}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => remove(m.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text4, padding: 2, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.text4)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 400 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Registrar medición</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, display: 'block', marginBottom: 4 }}>Fecha *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 32, borderRadius: 8, fontSize: 13 }}
              />
            </div>
            {[
              { key: 'weight_kg', label: 'Peso (kg)', placeholder: '78.4' },
              { key: 'body_fat_pct', label: '% Grasa', placeholder: '17.2' },
              { key: 'muscle_mass_kg', label: 'Músculo (kg)', placeholder: '64.9' },
              { key: 'bmi', label: 'IMC', placeholder: '23.1' },
            ].map(f => (
              <div key={f.key}>
                <Label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, display: 'block', marginBottom: 4 }}>{f.label}</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 32, borderRadius: 8, fontSize: 13 }}
                />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1' }}>
              <Label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, display: 'block', marginBottom: 4 }}>Notas</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional..."
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 32, borderRadius: 8, fontSize: 13 }}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              style={{ padding: '7px 16px', fontSize: 13, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.date}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, background: form.date ? T.accent : T.surface3, color: form.date ? T.accentInk : T.text4, border: 'none', borderRadius: 8, cursor: form.date ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
