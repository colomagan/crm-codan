import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, subMonths, subYears } from 'date-fns';
import { useMetrics } from '@/hooks/fitness/useMetrics';
import type { FitnessMetric } from '@/types/fitness';

type Range = '1M' | '3M' | '6M' | '1A';

const EMPTY = { date: '', weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', bmi: '', notes: '' };

interface Props { clientId: string; }

export function MetricsTab({ clientId }: Props) {
  const { metrics, loading, save, remove } = useMetrics(clientId);
  const [range, setRange] = useState<Range>('3M');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const cutoff = range === '1M' ? subMonths(new Date(), 1)
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

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Evolución física</p>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['1M','3M','6M','1A'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={range === r ? { background:'#6366f1', color:'white' } : { background:'#1e293b', color:'#64748b' }}>
                {r}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setOpen(true)}
            className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-3 h-3" /> Registrar
          </Button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="rounded-xl bg-slate-800 p-4" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line yAxisId="left" type="monotone" dataKey="Peso" stroke="#f59e0b" dot={false} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="Grasa" stroke="#10b981" dot={false} strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="Músculo" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500 text-center py-8">Cargando...</p>
      ) : metrics.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">Sin mediciones aún.</p>
          <Button size="sm" onClick={() => setOpen(true)} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            + Registrar primera medición
          </Button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-slate-400">
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-3 py-2 font-medium">Peso</th>
                <th className="text-right px-3 py-2 font-medium">% Grasa</th>
                <th className="text-right px-3 py-2 font-medium">Músculo</th>
                <th className="text-right px-3 py-2 font-medium">IMC</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => {
                const prev = metrics[i + 1];
                const dW = delta(m.weight_kg, prev?.weight_kg ?? null);
                const dF = delta(m.body_fat_pct, prev?.body_fat_pct ?? null);
                const dM = delta(m.muscle_mass_kg, prev?.muscle_mass_kg ?? null);
                return (
                  <tr key={m.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-slate-300">{format(parseISO(m.date), 'dd MMM yyyy')}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-amber-400 font-medium">{m.weight_kg ?? '—'}</span>
                      {dW !== null && <span className={`ml-1 text-[10px] ${dW < 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dW > 0 ? '+' : ''}{dW.toFixed(1)}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-emerald-400 font-medium">{m.body_fat_pct != null ? `${m.body_fat_pct}%` : '—'}</span>
                      {dF !== null && <span className={`ml-1 text-[10px] ${dF < 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dF > 0 ? '+' : ''}{dF.toFixed(1)}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-indigo-400 font-medium">{m.muscle_mass_kg ?? '—'}</span>
                      {dM !== null && <span className={`ml-1 text-[10px] ${dM > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dM > 0 ? '+' : ''}{dM.toFixed(1)}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-400">{m.bmi ?? '—'}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => remove(m.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar medición</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            {[
              { key: 'weight_kg', label: 'Peso (kg)', placeholder: '78.4' },
              { key: 'body_fat_pct', label: '% Grasa', placeholder: '17.2' },
              { key: 'muscle_mass_kg', label: 'Músculo (kg)', placeholder: '64.9' },
              { key: 'bmi', label: 'IMC', placeholder: '23.1' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-slate-400">{f.label}</Label>
                <Input type="number" step="0.1" placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Notas</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional..." className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.date} className="bg-indigo-600 hover:bg-indigo-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
