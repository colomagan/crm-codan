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

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['muscle','fat','measurements'] as Layer[]).map(l => (
            <button key={l} onClick={() => setLayer(l)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize"
              style={layer === l ? { background: '#6366f1', color: 'white' } : { background: '#1e293b', color: '#64748b' }}>
              {l === 'muscle' ? 'Músculo' : l === 'fat' ? 'Grasa' : 'Medidas'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['front','back'] as View[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={view === v ? { background: '#334155', color: 'white' } : { background: '#1e293b', color: '#64748b' }}>
                {v === 'front' ? 'Frontal' : 'Trasero'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setOpen(true)}
            className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-3 h-3" /> Registrar
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* SVG */}
        <div className="flex-shrink-0">
          {loading ? (
            <div className="w-[120px] h-[280px] bg-slate-800 rounded-xl animate-pulse" />
          ) : (
            <BodySvg current={current} prev={prev} layer={layer} view={view} />
          )}
          {/* Legend */}
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-red-400">
              <div className="w-3 h-3 rounded-sm bg-red-500 opacity-80" /> ↓ Grasa/Medida
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-80" /> ↑ Músculo/Medida
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <div className="w-3 h-3 rounded-sm bg-amber-500 opacity-80" /> Sin cambio sig.
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-w-0">
          {current ? (
            <>
              <p className="text-xs text-slate-400 mb-2">
                Medidas al {format(parseISO(current.date), 'dd MMM yyyy')}
                {prev && <span className="ml-2 text-slate-500">vs {format(parseISO(prev.date), 'dd MMM yyyy')}</span>}
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-slate-400">
                      <th className="text-left px-3 py-1.5 font-medium">Zona</th>
                      <th className="text-right px-3 py-1.5 font-medium">Actual</th>
                      <th className="text-right px-3 py-1.5 font-medium">Ant.</th>
                      <th className="text-right px-3 py-1.5 font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BODY_ZONES.map(z => {
                      const c = current[z.key as keyof BodyMeasurement] as number | null;
                      const p = prev ? prev[z.key as keyof BodyMeasurement] as number | null : null;
                      const d = c != null && p != null ? c - p : null;
                      return (
                        <tr key={z.key} className="border-t border-slate-800 hover:bg-slate-800/40">
                          <td className="px-3 py-1.5 text-slate-300">{z.label}</td>
                          <td className="px-3 py-1.5 text-right text-white font-medium">{c != null ? `${c} cm` : '—'}</td>
                          <td className="px-3 py-1.5 text-right text-slate-500">{p != null ? `${p} cm` : '—'}</td>
                          <td className="px-3 py-1.5 text-right">
                            {d != null ? (
                              <span className={Math.abs(d) < 0.5 ? 'text-slate-500' : d > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {d > 0 ? '+' : ''}{d.toFixed(1)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-slate-500 text-sm">Sin medidas registradas.</p>
              <Button size="sm" onClick={() => setOpen(true)} className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                + Registrar primeras medidas
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar medidas corporales</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="mb-3 space-y-1">
              <Label className="text-xs text-slate-400">Fecha *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {BODY_ZONES.map(z => (
                <div key={z.key} className="space-y-1">
                  <Label className="text-[10px] text-slate-400">{z.label} (cm)</Label>
                  <Input type="number" step="0.1" placeholder="0.0"
                    value={form[z.key] ?? ''}
                    onChange={e => setForm(p => ({ ...p, [z.key]: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white h-7 text-sm" />
                </div>
              ))}
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
