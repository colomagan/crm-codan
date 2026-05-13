import { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTraining } from '@/hooks/fitness/useTraining';
import type { WorkoutExercise } from '@/types/fitness';
import { format, parseISO } from 'date-fns';

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

  return (
    <div className="p-5 grid grid-cols-2 gap-6">
      {/* LEFT: PRs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">Records de Fuerza (1RM)</p>
          <Button size="sm" onClick={() => setPrDialog(true)}
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-3 h-3" /> PR
          </Button>
        </div>

        {loading ? <p className="text-xs text-slate-500">Cargando...</p>
          : prExercises.map(name => {
            const latest = latestPR(name);
            const prev = prevPR(name);
            const max = maxPR(name);
            const delta = latest && prev ? (latest.estimated_1rm - prev.estimated_1rm).toFixed(1) : null;
            const pct = max > 0 && latest ? (latest.estimated_1rm / max) * 100 : 0;
            const color = name === 'Sentadilla' ? '#10b981' : name === 'Press Banca' ? '#6366f1' : '#f59e0b';
            return (
              <button key={name} onClick={() => setSelectedExercise(selectedExercise === name ? null : name)}
                className={`rounded-xl p-3 text-left transition-all ${selectedExercise === name ? 'bg-slate-700' : 'bg-slate-800 hover:bg-slate-750'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">{name}</span>
                  <span className="text-sm font-bold" style={{ color }}>
                    {latest ? `${latest.estimated_1rm.toFixed(1)} kg` : '—'}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full mb-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-slate-500">1RM est. (Epley)</span>
                  {delta !== null && (
                    <span className={`text-[10px] font-medium ${parseFloat(delta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parseFloat(delta) > 0 ? '+' : ''}{delta} kg
                    </span>
                  )}
                </div>
              </button>
            );
          })}

        {/* Mini chart */}
        {selectedExercise && prChartData.length > 1 && (
          <div className="rounded-xl bg-slate-800 p-3" style={{ height: 120 }}>
            <p className="text-[10px] text-slate-400 mb-2">Progresión — {selectedExercise}</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={prChartData}>
                <defs>
                  <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, fontSize: 11 }} />
                <Area type="monotone" dataKey="1RM" stroke="#10b981" fill="url(#prGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* RIGHT: Routine */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">
            {activePlan ? activePlan.name : 'Sin plan activo'}
          </p>
          {activePlan ? (
            <Button size="sm" onClick={() => setExDialog(true)}
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-3 h-3" /> Ejercicio
            </Button>
          ) : (
            <Button size="sm" onClick={() => setPlanDialog(true)}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              Crear plan
            </Button>
          )}
        </div>

        {activePlan && (
          <>
            {/* Day tabs */}
            <div className="flex gap-1 flex-wrap">
              {allDays.map(d => (
                <button key={d} onClick={() => setActiveDay(d)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={currentDay === d ? { background: '#10b981', color: 'white' } : { background: '#1e293b', color: '#64748b' }}>
                  Día {d}
                </button>
              ))}
              <button onClick={() => {
                const next = String.fromCharCode(65 + allDays.length);
                setExForm(p => ({ ...p, day: next }));
                setExDialog(true);
              }} className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-300 border border-slate-700 transition-colors">
                + Día
              </button>
            </div>

            {/* Exercise table */}
            {dayExercises.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Sin ejercicios en este día.</p>
            ) : (
              <div className="rounded-xl overflow-hidden border border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400">
                      <th className="text-left px-3 py-2 font-medium">Ejercicio</th>
                      <th className="text-center px-2 py-2 font-medium">S</th>
                      <th className="text-center px-2 py-2 font-medium">R</th>
                      <th className="text-center px-2 py-2 font-medium">RPE</th>
                      <th className="text-center px-2 py-2 font-medium">Desc.</th>
                      <th className="w-12 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {dayExercises.map(ex => (
                      <tr key={ex.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                        <td className="px-3 py-2">
                          <input
                            defaultValue={ex.name}
                            onBlur={e => updateExercise(ex.id, { name: e.target.value })}
                            className="bg-transparent text-slate-200 text-xs w-full focus:outline-none focus:text-white"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="number" defaultValue={ex.sets}
                            onBlur={e => updateExercise(ex.id, { sets: parseInt(e.target.value) })}
                            className="bg-transparent text-slate-400 text-xs w-8 text-center focus:outline-none focus:text-white" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input defaultValue={ex.reps}
                            onBlur={e => updateExercise(ex.id, { reps: e.target.value })}
                            className="bg-transparent text-slate-400 text-xs w-10 text-center focus:outline-none focus:text-white" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input defaultValue={ex.rpe_rir ?? ''}
                            onBlur={e => updateExercise(ex.id, { rpe_rir: e.target.value || null })}
                            className="bg-transparent text-amber-400 text-xs w-10 text-center focus:outline-none" />
                        </td>
                        <td className="px-2 py-2 text-center text-slate-400">{ex.rest_sec ? `${ex.rest_sec}s` : '—'}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            {ex.video_url && (
                              <a href={ex.video_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button onClick={() => deleteExercise(ex.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* PR Dialog */}
      <Dialog open={prDialog} onOpenChange={setPrDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Registrar PR</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Ejercicio *</Label>
              <select value={prForm.exercise_name} onChange={e => setPrForm(p => ({ ...p, exercise_name: e.target.value }))}
                className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-3 h-8 text-white">
                <option value="">Seleccionar...</option>
                {prExercises.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Peso (kg) *</Label>
                <Input type="number" step="0.5" placeholder="100" value={prForm.weight_kg}
                  onChange={e => setPrForm(p => ({ ...p, weight_kg: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Reps *</Label>
                <Input type="number" min="1" placeholder="1" value={prForm.reps}
                  onChange={e => setPrForm(p => ({ ...p, reps: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
            </div>
            {prForm.weight_kg && prForm.reps && (
              <p className="text-xs text-emerald-400">
                1RM estimado (Epley): {(parseFloat(prForm.weight_kg) * (1 + parseInt(prForm.reps) / 30)).toFixed(1)} kg
              </p>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Fecha</Label>
              <Input type="date" value={prForm.recorded_at}
                onChange={e => setPrForm(p => ({ ...p, recorded_at: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={handleSavePR} disabled={!prForm.exercise_name || !prForm.weight_kg}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Dialog */}
      <Dialog open={exDialog} onOpenChange={setExDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Agregar ejercicio</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-slate-400">Nombre *</Label>
                <Input placeholder="Press Banca" value={exForm.name}
                  onChange={e => setExForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Día</Label>
                <Input value={exForm.day} onChange={e => setExForm(p => ({ ...p, day: e.target.value.toUpperCase() }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Series</Label>
                <Input type="number" value={exForm.sets} onChange={e => setExForm(p => ({ ...p, sets: parseInt(e.target.value) }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Reps</Label>
                <Input placeholder="8-10" value={exForm.reps} onChange={e => setExForm(p => ({ ...p, reps: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">RPE/RIR</Label>
                <Input placeholder="@8 o RIR2" value={exForm.rpe_rir ?? ''} onChange={e => setExForm(p => ({ ...p, rpe_rir: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Descanso (seg)</Label>
                <Input type="number" value={exForm.rest_sec ?? ''} onChange={e => setExForm(p => ({ ...p, rest_sec: parseInt(e.target.value) }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Video URL</Label>
                <Input placeholder="https://..." value={exForm.video_url ?? ''} onChange={e => setExForm(p => ({ ...p, video_url: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={handleSaveExercise} disabled={!exForm.name} className="bg-emerald-600 hover:bg-emerald-700 text-white">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-xs bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Crear plan de entrenamiento</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1">
            <Label className="text-xs text-slate-400">Nombre del plan</Label>
            <Input placeholder="Plan Definición 2026" value={planName} onChange={e => setPlanName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={async () => { await createPlan(planName || 'Plan'); setPlanDialog(false); }} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
