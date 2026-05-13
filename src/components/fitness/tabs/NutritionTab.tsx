import { useState } from 'react';
import { Plus, Trash2, Copy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNutrition } from '@/hooks/fitness/useNutrition';
import type { NutritionItem } from '@/types/fitness';
import { toast } from 'sonner';

interface Props { clientId: string; }

export function NutritionTab({ clientId }: Props) {
  const { plan, meals, loading, createPlan, addMeal, deleteMeal, addItem, updateItem, deleteItem } = useNutrition(clientId);

  const [planDialog, setPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [mealDialog, setMealDialog] = useState(false);
  const [mealForm, setMealForm] = useState({ name: '', time: '' });
  const [itemDialog, setItemDialog] = useState<string | null>(null); // mealId
  const [itemForm, setItemForm] = useState<Partial<NutritionItem>>({ ingredient: '', qty: 100, unit: 'g', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const totalKcal = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.kcal, 0);
  const totalP = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.protein_g, 0);
  const totalC = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.carbs_g, 0);
  const totalF = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.fat_g, 0);

  const pieData = [
    { name: 'Proteína', value: Math.round(totalP * 4), color: '#6366f1' },
    { name: 'Carbos', value: Math.round(totalC * 4), color: '#f59e0b' },
    { name: 'Grasas', value: Math.round(totalF * 9), color: '#10b981' },
  ].filter(d => d.value > 0);

  const generateShoppingList = () => {
    const map = new Map<string, { qty: number; unit: string }>();
    meals.flatMap(m => m.items ?? []).forEach(i => {
      const key = `${i.ingredient}__${i.unit}`;
      const existing = map.get(key);
      map.set(key, { qty: (existing?.qty ?? 0) + i.qty * 7, unit: i.unit });
    });
    const lines = [...map.entries()].map(([key, v]) => {
      const name = key.split('__')[0];
      return `• ${name}: ${v.qty.toFixed(0)} ${v.unit}/sem`;
    });
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Lista copiada al portapapeles.');
  };

  if (loading) return <div className="p-5 text-sm text-slate-500">Cargando...</div>;

  if (!plan) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full text-center py-20">
        <p className="text-slate-400 text-sm mb-4">Sin plan nutricional activo.</p>
        <Button onClick={() => setPlanDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
          Crear plan nutricional
        </Button>
        <PlanDialog open={planDialog} onClose={() => setPlanDialog(false)} form={planForm} setForm={setPlanForm}
          onSave={async () => { await createPlan(planForm.name || 'Plan', parseInt(planForm.kcal) || 2000, parseInt(planForm.protein) || 150, parseInt(planForm.carbs) || 200, parseInt(planForm.fat) || 67); setPlanDialog(false); }} />
      </div>
    );
  }

  return (
    <div className="p-5 grid grid-cols-2 gap-6">
      {/* LEFT: Plan */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">{plan.name}</p>
          <Button size="sm" onClick={() => setMealDialog(true)}
            className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
            <Plus className="w-3 h-3" /> Comida
          </Button>
        </div>

        {/* Macro donut */}
        <div className="rounded-xl bg-slate-800 p-4 flex items-center gap-4">
          <div style={{ width: 70, height: 70 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1, color: '#334155' }]}
                  cx="50%" cy="50%" innerRadius={20} outerRadius={32} dataKey="value" strokeWidth={0}>
                  {(pieData.length > 0 ? pieData : [{ color: '#334155' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 11, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-base font-bold text-white">{totalKcal} <span className="text-xs text-slate-400">/ {plan.kcal_target} kcal</span></p>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">P {totalP.toFixed(0)}g</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">C {totalC.toFixed(0)}g</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">G {totalF.toFixed(0)}g</span>
            </div>
          </div>
        </div>

        {/* Meals */}
        <div className="flex flex-col gap-2">
          {meals.length === 0 && <p className="text-xs text-slate-500">Sin comidas en el plan.</p>}
          {meals.map(meal => {
            const mKcal = (meal.items ?? []).reduce((s, i) => s + i.kcal, 0);
            return (
              <div key={meal.id} className="rounded-xl bg-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                  <div>
                    <span className="text-xs font-semibold text-slate-200">{meal.name}</span>
                    {meal.time && <span className="ml-2 text-[10px] text-slate-500">{meal.time}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{mKcal} kcal</span>
                    <button onClick={() => setItemDialog(meal.id)} className="text-slate-500 hover:text-amber-400 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMeal(meal.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2 flex flex-col gap-1">
                  {(meal.items ?? []).length === 0 && <p className="text-[10px] text-slate-600">Sin ingredientes.</p>}
                  {(meal.items ?? []).map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-2 group">
                      <input defaultValue={item.ingredient}
                        onBlur={e => updateItem(item.id, { ingredient: e.target.value })}
                        className="bg-transparent text-xs text-slate-300 flex-1 focus:outline-none focus:text-white" />
                      <input type="number" defaultValue={item.qty}
                        onBlur={e => updateItem(item.id, { qty: parseFloat(e.target.value) })}
                        className="bg-transparent text-xs text-slate-400 w-10 text-right focus:outline-none" />
                      <span className="text-[10px] text-slate-500">{item.unit}</span>
                      <span className="text-[10px] text-slate-500">{item.kcal}kcal</span>
                      <button onClick={() => deleteItem(item.id)} className="text-transparent group-hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Shopping list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">🛒 Lista de compra</p>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={generateShoppingList}
              className="h-7 text-xs gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30">
              <Zap className="w-3 h-3" /> Auto-generar
            </Button>
            <Button size="sm" onClick={generateShoppingList}
              className="h-7 text-xs gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              <Copy className="w-3 h-3" /> Copiar
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800 p-4 flex flex-col gap-3">
          {(() => {
            const map = new Map<string, { qty: number; unit: string; kcal: number; protein: number }>();
            meals.flatMap(m => m.items ?? []).forEach(i => {
              const key = `${i.ingredient}__${i.unit}`;
              const ex = map.get(key) ?? { qty: 0, unit: i.unit, kcal: 0, protein: 0 };
              map.set(key, { qty: ex.qty + i.qty * 7, unit: i.unit, kcal: ex.kcal + i.kcal * 7, protein: ex.protein + i.protein_g * 7 });
            });
            if (map.size === 0) return <p className="text-xs text-slate-500 text-center py-4">Agrega ingredientes al plan para ver la lista.</p>;
            const items = [...map.entries()].map(([key, v]) => ({ name: key.split('__')[0], ...v }));
            return items.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-200">{item.name}</span>
                <span className="text-slate-400">{item.qty.toFixed(0)} {item.unit}<span className="text-slate-600">/sem</span></span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Plan dialog */}
      <PlanDialog open={planDialog} onClose={() => setPlanDialog(false)} form={planForm} setForm={setPlanForm}
        onSave={async () => { await createPlan(planForm.name || 'Plan', parseInt(planForm.kcal) || 2000, parseInt(planForm.protein) || 150, parseInt(planForm.carbs) || 200, parseInt(planForm.fat) || 67); setPlanDialog(false); }} />

      {/* Meal dialog */}
      <Dialog open={mealDialog} onOpenChange={setMealDialog}>
        <DialogContent className="max-w-xs bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Agregar comida</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Nombre *</Label>
              <Input placeholder="Desayuno" value={mealForm.name} onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Hora</Label>
              <Input placeholder="07:00" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMealDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={async () => { await addMeal(mealForm.name, mealForm.time); setMealDialog(false); setMealForm({ name: '', time: '' }); }}
              disabled={!mealForm.name} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={!!itemDialog} onOpenChange={o => { if (!o) setItemDialog(null); }}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Agregar ingrediente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-slate-400">Ingrediente *</Label>
              <Input placeholder="Pollo pechuga" value={itemForm.ingredient} onChange={e => setItemForm(p => ({ ...p, ingredient: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            {[
              { key: 'qty', label: 'Cantidad' },
              { key: 'unit', label: 'Unidad (g/u/ml)', type: 'text' },
              { key: 'kcal', label: 'Kcal' },
              { key: 'protein_g', label: 'Proteína (g)' },
              { key: 'carbs_g', label: 'Carbos (g)' },
              { key: 'fat_g', label: 'Grasa (g)' },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-slate-400">{f.label}</Label>
                <Input type={f.type ?? 'number'} step="0.1" value={String(itemForm[f.key as keyof typeof itemForm] ?? '')}
                  onChange={e => setItemForm(p => ({ ...p, [f.key]: f.type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(null)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={async () => {
              if (!itemDialog || !itemForm.ingredient) return;
              await addItem(itemDialog, {
                ingredient: itemForm.ingredient!, qty: itemForm.qty ?? 100, unit: itemForm.unit ?? 'g',
                kcal: itemForm.kcal ?? 0, protein_g: itemForm.protein_g ?? 0, carbs_g: itemForm.carbs_g ?? 0, fat_g: itemForm.fat_g ?? 0,
              });
              setItemDialog(null);
              setItemForm({ ingredient: '', qty: 100, unit: 'g', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
            }} disabled={!itemForm.ingredient} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanDialog({ open, onClose, form, setForm, onSave }: {
  open: boolean; onClose: () => void;
  form: { name: string; kcal: string; protein: string; carbs: string; fat: string };
  setForm: (f: any) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
        <DialogHeader><DialogTitle className="text-white">Crear plan nutricional</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-400">Nombre</Label>
            <Input placeholder="Plan Definición 2026" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))}
              className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
          </div>
          {[
            { key: 'kcal', label: 'Kcal objetivo', placeholder: '2400' },
            { key: 'protein', label: 'Proteína (g)', placeholder: '180' },
            { key: 'carbs', label: 'Carbos (g)', placeholder: '240' },
            { key: 'fat', label: 'Grasa (g)', placeholder: '67' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs text-slate-400">{f.label}</Label>
              <Input type="number" placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">Cancelar</Button>
          <Button onClick={onSave} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
