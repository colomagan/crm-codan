import { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTraining } from '@/hooks/fitness/useTraining';
import type { WorkoutExercise } from '@/types/fitness';
import { format, parseISO } from 'date-fns';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

const BASE_EXERCISES = ['Sentadilla', 'Press Banca', 'Peso Muerto'];

interface Props { clientId: string; }

export function TrainingTab({ clientId }: Props) {
  const { records, exercises, activePlan, days, loading, saveRecord, createPlan, saveExercise, updateExercise, deleteExercise } = useTraining(clientId);

  const [activeDay, setActiveDay] = useState<string>('A');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [prDialog, setPrDialog] = useState(false);
  const [prForm, setPrForm] = useState({ exercise_name: '', weight_kg: '', reps: '1', recorded_at: '' });
  const [exDialog, setExDialog] = useState(false);
  const [exForm, setExForm] = useState<Partial<WorkoutExercise>>({ day: 'A', name: '', sets: 3, reps: '10', rpe_rir: '', rest_sec: 90, video_url: '' });
  const [planDialog, setPlanDialog] = useState(false);
  const [planName, setPlanName] = useState('');

  const allDays = days.length > 0 ? days : ['A'];
  const currentDay = allDays.includes(activeDay) ? activeDay : allDays[0];
  const dayExercises = exercises.filter(e => e.day === currentDay).sort((a, b) => a.order - b.order);

  const prExercises = [...new Set([...BASE_EXERCISES, ...records.map(r => r.exercise_name)])];
  const prByExercise = (name: string) => records.filter(r => r.exercise_name === name).sort((a, b) => parseISO(b.recorded_at).getTime() - parseISO(a.recorded_at).getTime());
  const maxPR = (name: string) => Math.max(0, ...prByExercise(name).map(r => r.estimated_1rm));
  const latestPR = (name: string) => prByExercise(name)[0];
  const prevPR = (name: string) => prByExercise(name)[1];

  const handleSavePR = async () => {
    const w = parseFloat(prForm.weight_kg);
    const r = parseInt(prForm.reps);
    const e1rm = parseFloat((w * (1 + r / 30)).toFixed(2));
    await saveRecord({
      exercise_name: prForm.exercise_name,
      weight_kg: w, reps: r, estimated_1rm: e1rm,
      recorded_at: prForm.recorded_at || format(new Date(), 'yyyy-MM-dd'),
    });
    setPrDialog(false);
    setPrForm({ exercise_name: '', weight_kg: '', reps: '1', recorded_at: '' });
  };

  const handleSaveExercise = async () => {
    if (!activePlan || !exForm.name) return;
    await saveExercise({
      plan_id: activePlan.id,
      day: exForm.day || currentDay,
      order: dayExercises.length,
      name: exForm.name,
      sets: exForm.sets ?? 3,
      reps: exForm.reps || '10',
      rpe_rir: exForm.rpe_rir || null,
      rest_sec: exForm.rest_sec ?? null,
      video_url: exForm.video_url || null,
    });
    setExDialog(false);
    setExForm({ day: currentDay, name: '', sets: 3, reps: '10', rpe_rir: '', rest_sec: 90, video_url: '' });
  };

  const prChartData = selectedExercise
    ? [...prByExercise(selectedExercise)].reverse().map(r => ({
        date: format(parseISO(r.recorded_at), 'dd MMM'),
        '1RM': r.estimated_1rm,
      }))
    : [];

  const maxDayCount = Math.max(1, ...allDays.map(d => exercises.filter(e => e.day === d).length));

  const cardStyle: React.CSSProperties = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    padding: 20,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    color: T.text3,
    letterSpacing: '0.06em',
    marginBottom: 4,
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    background: T.surface2,
    border: `1px solid ${T.border}`,
    color: T.text,
    height: 32,
    borderRadius: 8,
    fontSize: 13,
    padding: '0 10px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>
            Plan de entrenamiento
          </h2>
          <p style={{ fontSize: 13, color: T.text3, margin: '4px 0 0' }}>
            {activePlan?.name ?? 'Sin plan'}
            {activePlan ? ` · ${exercises.length} ejercicios` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activePlan && (
            <button style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              Duplicar plan
            </button>
          )}
          <button
            onClick={() => activePlan ? setExDialog(true) : setPlanDialog(true)}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
          >
            {activePlan ? 'Editar plan' : 'Crear plan'}
          </button>
          <button
            onClick={() => setPrDialog(true)}
            style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + PR
          </button>
        </div>
      </div>

      {/* No active plan: empty state */}
      {!activePlan && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 40px' }}>
            <p style={{ color: T.text3, fontSize: 14, marginBottom: 20 }}>No hay un plan activo para este cliente.</p>
            <button
              onClick={() => setPlanDialog(true)}
              style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Crear plan
            </button>
          </div>
        </div>
      )}

      {activePlan && (
        <>
          {/* Full-width: Semana en curso */}
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Semana en curso</span>
              <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
                {allDays.map(d => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(d)}
                    style={{
                      background: currentDay === d ? T.surface3 : 'transparent',
                      color: currentDay === d ? T.text : T.text3,
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: currentDay === d ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    Día {d}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const next = String.fromCharCode(65 + allDays.length);
                    setExForm(p => ({ ...p, day: next }));
                    setExDialog(true);
                  }}
                  style={{
                    background: 'transparent',
                    color: T.text3,
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  + Día
                </button>
              </div>
            </div>

            {dayExercises.length === 0 ? (
              <p style={{ fontSize: 13, color: T.text3, textAlign: 'center', padding: '20px 0' }}>Sin ejercicios en este día.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.surface2 }}>
                    {['Ejercicio', 'S', 'R', 'RPE', 'Desc.', ''].map((h, i) => (
                      <th key={i} style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        color: T.text3,
                        padding: '10px 12px',
                        borderBottom: `1px solid ${T.border}`,
                        textAlign: i === 0 ? 'left' : 'center',
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        width: i === 5 ? 48 : undefined,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayExercises.map(ex => (
                    <tr
                      key={ex.id}
                      style={{ borderTop: `1px solid ${T.border}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <input
                          defaultValue={ex.name}
                          onBlur={e => updateExercise(ex.id, { name: e.target.value })}
                          style={{ background: 'transparent', color: T.text2, fontSize: 12, border: 'none', outline: 'none', width: '100%' }}
                          onFocus={e => (e.target.style.color = T.text)}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          defaultValue={ex.sets}
                          onBlur={e => updateExercise(ex.id, { sets: parseInt(e.target.value) })}
                          style={{ background: 'transparent', color: T.text2, fontSize: 12, border: 'none', outline: 'none', width: 32, textAlign: 'center' }}
                          onFocus={e => (e.target.style.color = T.text)}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          defaultValue={ex.reps}
                          onBlur={e => updateExercise(ex.id, { reps: e.target.value })}
                          style={{ background: 'transparent', color: T.text2, fontSize: 12, border: 'none', outline: 'none', width: 40, textAlign: 'center' }}
                          onFocus={e => (e.target.style.color = T.text)}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          defaultValue={ex.rpe_rir ?? ''}
                          onBlur={e => updateExercise(ex.id, { rpe_rir: e.target.value || null })}
                          style={{ background: 'transparent', color: T.warning, fontSize: 12, border: 'none', outline: 'none', width: 40, textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: T.text3, fontSize: 12 }}>
                        {ex.rest_sec ? `${ex.rest_sec}s` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          {ex.video_url && (
                            <a href={ex.video_url} target="_blank" rel="noreferrer" style={{ color: T.info, display: 'flex' }}>
                              <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                          )}
                          <button
                            onClick={() => deleteExercise(ex.id)}
                            style={{ background: 'none', border: 'none', color: T.text4, cursor: 'pointer', display: 'flex', padding: 0 }}
                            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = T.danger)}
                            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = T.text4)}
                          >
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: PR Records */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Records de fuerza (1RM)</span>
                <button
                  onClick={() => setPrDialog(true)}
                  style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  + PR
                </button>
              </div>

              {loading ? (
                <p style={{ fontSize: 13, color: T.text3 }}>Cargando...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {prExercises.map(name => {
                    const latest = latestPR(name);
                    const prev = prevPR(name);
                    const max = maxPR(name);
                    const delta = latest && prev ? (latest.estimated_1rm - prev.estimated_1rm).toFixed(1) : null;
                    const pct = max > 0 && latest ? (latest.estimated_1rm / max) * 100 : 0;
                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedExercise(selectedExercise === name ? null : name)}
                        style={{
                          background: T.surface2,
                          border: `1px solid ${selectedExercise === name ? T.accentLine : T.border}`,
                          borderRadius: 10,
                          padding: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 12,
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 4 }}>{name}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.text3 }}>
                            1RM est. (Epley)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1 }}>
                            {latest ? latest.estimated_1rm.toFixed(1) : '—'}
                            <span style={{ fontSize: 11, color: T.text3, marginLeft: 4 }}>kg</span>
                          </div>
                          {delta !== null && (
                            <div style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 11,
                              color: parseFloat(delta) >= 0 ? T.good : T.danger,
                              marginTop: 2,
                            }}>
                              {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                            </div>
                          )}
                          {delta === null && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.text3, marginTop: 2 }}>—</div>}
                        </div>
                      </button>
                    );
                  })}

                  {/* Progress bars rendered outside button to avoid nesting issues */}
                  {prExercises.map(name => {
                    const latest = latestPR(name);
                    const max = maxPR(name);
                    const pct = max > 0 && latest ? (latest.estimated_1rm / max) * 100 : 0;
                    return (
                      <div key={`bar-${name}`} style={{ height: 3, background: T.surface3, borderRadius: 2, marginTop: -10 }}>
                        <div style={{ height: 3, background: T.accent, borderRadius: 2, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mini chart */}
              {selectedExercise && prChartData.length > 1 && (
                <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, height: 120, marginTop: 16 }}>
                  <p style={{ fontSize: 10, color: T.text3, marginBottom: 8 }}>Progresión — {selectedExercise}</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={prChartData}>
                      <defs>
                        <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.accent} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: T.text3, fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: T.text3, fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 11, color: T.text }} />
                      <Area type="monotone" dataKey="1RM" stroke={T.accent} fill="url(#prGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Right: Volumen semanal */}
            <div style={cardStyle}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Volumen + plan</span>
              </div>

              {activePlan && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: T.text3, marginBottom: 4 }}>{activePlan.name}</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.text2 }}>
                    {exercises.length} ejercicios en plan
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allDays.map(d => {
                  const count = exercises.filter(e => e.day === d).length;
                  const pct = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;
                  return (
                    <div key={d}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>Día {d}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.text2 }}>
                          {count} ejercicios · RPE —
                        </span>
                      </div>
                      <div style={{ height: 8, background: T.surface3, borderRadius: 4 }}>
                        <div style={{ height: 8, background: T.accent, borderRadius: 4, width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '14px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3 }}>Tonelaje total</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: T.text }}>—</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PR Dialog */}
      <Dialog open={prDialog} onOpenChange={setPrDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Registrar PR</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <div>
              <label style={labelStyle}>Ejercicio *</label>
              <select
                value={prForm.exercise_name}
                onChange={e => setPrForm(p => ({ ...p, exercise_name: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Seleccionar...</option>
                {prExercises.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Peso (kg) *</label>
                <input
                  type="number" step="0.5" placeholder="100"
                  value={prForm.weight_kg}
                  onChange={e => setPrForm(p => ({ ...p, weight_kg: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Reps *</label>
                <input
                  type="number" min="1" placeholder="1"
                  value={prForm.reps}
                  onChange={e => setPrForm(p => ({ ...p, reps: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>
            {prForm.weight_kg && prForm.reps && (
              <p style={{ fontSize: 12, color: T.good, fontFamily: 'JetBrains Mono, monospace' }}>
                1RM estimado (Epley): {(parseFloat(prForm.weight_kg) * (1 + parseInt(prForm.reps) / 30)).toFixed(1)} kg
              </p>
            )}
            <div>
              <label style={labelStyle}>Fecha</label>
              <input
                type="date" value={prForm.recorded_at}
                onChange={e => setPrForm(p => ({ ...p, recorded_at: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setPrDialog(false)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePR}
              disabled={!prForm.exercise_name || !prForm.weight_kg}
              style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!prForm.exercise_name || !prForm.weight_kg) ? 0.5 : 1 }}
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Dialog */}
      <Dialog open={exDialog} onOpenChange={setExDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Agregar ejercicio</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Nombre *</label>
              <input
                placeholder="Press Banca" value={exForm.name}
                onChange={e => setExForm(p => ({ ...p, name: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Día</label>
              <input
                value={exForm.day}
                onChange={e => setExForm(p => ({ ...p, day: e.target.value.toUpperCase() }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Series</label>
              <input
                type="number" value={exForm.sets}
                onChange={e => setExForm(p => ({ ...p, sets: parseInt(e.target.value) }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Reps</label>
              <input
                placeholder="8-10" value={exForm.reps}
                onChange={e => setExForm(p => ({ ...p, reps: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>RPE/RIR</label>
              <input
                placeholder="@8 o RIR2" value={exForm.rpe_rir ?? ''}
                onChange={e => setExForm(p => ({ ...p, rpe_rir: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Descanso (seg)</label>
              <input
                type="number" value={exForm.rest_sec ?? ''}
                onChange={e => setExForm(p => ({ ...p, rest_sec: parseInt(e.target.value) }))}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Video URL</label>
              <input
                placeholder="https://..." value={exForm.video_url ?? ''}
                onChange={e => setExForm(p => ({ ...p, video_url: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setExDialog(false)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveExercise}
              disabled={!exForm.name}
              style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !exForm.name ? 0.5 : 1 }}
            >
              Agregar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 340 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Crear plan de entrenamiento</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <label style={labelStyle}>Nombre del plan</label>
            <input
              placeholder="Plan Definición 2026" value={planName}
              onChange={e => setPlanName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setPlanDialog(false)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await createPlan(planName || 'Plan'); setPlanDialog(false); }}
              style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Crear
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
