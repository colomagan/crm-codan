import { useState } from 'react';
import { Plus, Trash2, Copy, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNutrition } from '@/hooks/fitness/useNutrition';
import type { NutritionItem } from '@/types/fitness';
import { toast } from 'sonner';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MACRO_COLORS = { prot: '#a78bff', carbs: '#ffb547', fat: '#51e2a8' };

interface Props { clientId: string; }

export function NutritionTab({ clientId }: Props) {
  const { plan, meals, loading, createPlan, addMeal, deleteMeal, addItem, updateItem, deleteItem } = useNutrition(clientId);

  const [planDialog, setPlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [mealDialog, setMealDialog] = useState(false);
  const [mealForm, setMealForm] = useState({ name: '', time: '' });
  const [itemDialog, setItemDialog] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Partial<NutritionItem>>({ ingredient: '', qty: 100, unit: 'g', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [activeDay, setActiveDay] = useState(5); // Sáb default

  const totalKcal = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.kcal, 0);
  const totalP = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.protein_g, 0);
  const totalC = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.carbs_g, 0);
  const totalF = meals.flatMap(m => m.items ?? []).reduce((s, i) => s + i.fat_g, 0);

  const pieData = [
    { name: 'Proteína', value: Math.round(totalP * 4), color: MACRO_COLORS.prot },
    { name: 'Carbos', value: Math.round(totalC * 4), color: MACRO_COLORS.carbs },
    { name: 'Grasas', value: Math.round(totalF * 9), color: MACRO_COLORS.fat },
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

  if (loading) return (
    <div style={{ padding: '24px 28px', background: T.bg, color: T.text3, fontSize: 13 }}>Cargando...</div>
  );

  if (!plan) {
    return (
      <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 40, textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 14, color: T.text3, marginBottom: 16 }}>Sin plan nutricional activo.</p>
          <button onClick={() => setPlanDialog(true)}
            style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Crear plan nutricional
          </button>
        </div>
        <PlanDialog open={planDialog} onClose={() => setPlanDialog(false)} form={planForm} setForm={setPlanForm}
          onSave={async () => { await createPlan(planForm.name || 'Plan', parseInt(planForm.kcal) || 2000, parseInt(planForm.protein) || 150, parseInt(planForm.carbs) || 200, parseInt(planForm.fat) || 67); setPlanDialog(false); }} />
      </div>
    );
  }

  const completePct = plan.kcal_target ? Math.round(totalKcal / plan.kcal_target * 100) : 0;

  const shoppingMap = new Map<string, { qty: number; unit: string; kcal: number; protein: number }>();
  meals.flatMap(m => m.items ?? []).forEach(i => {
    const key = `${i.ingredient}__${i.unit}`;
    const ex = shoppingMap.get(key) ?? { qty: 0, unit: i.unit, kcal: 0, protein: 0 };
    shoppingMap.set(key, { qty: ex.qty + i.qty * 7, unit: i.unit, kcal: ex.kcal + i.kcal * 7, protein: ex.protein + i.protein_g * 7 });
  });
  const shoppingItems = [...shoppingMap.entries()].map(([key, v]) => ({ name: key.split('__')[0], ...v }));

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>
            Plan nutricional
          </h2>
          <p style={{ fontSize: 13, color: T.text3, margin: '2px 0 0' }}>
            {plan?.name ?? 'Sin plan'} · {plan?.kcal_target ?? '—'} kcal
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn>Plantilla</GhostBtn>
          <GhostBtn onClick={generateShoppingList}>Lista de la compra</GhostBtn>
          <GhostBtn onClick={() => setPlanDialog(true)}>Editar plan</GhostBtn>
        </div>
      </div>

      {/* Main 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

        {/* LEFT card — Plan del día */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Plan del día</p>
              <p style={{ fontSize: 12, color: T.text3, margin: '2px 0 0' }}>{plan.name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Day subtabs */}
              <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
                {DAYS.map((d, i) => (
                  <button key={d} onClick={() => setActiveDay(i)}
                    style={{
                      padding: '4px 7px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', border: 'none', borderRadius: 6, cursor: 'pointer',
                      background: activeDay === i ? T.accent : 'transparent',
                      color: activeDay === i ? T.accentInk : T.text3,
                      fontWeight: activeDay === i ? 700 : 400,
                    }}>{d}</button>
                ))}
              </div>
              <button onClick={() => setMealDialog(true)}
                style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Comida
              </button>
            </div>
          </div>

          {/* Meals list */}
          {meals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 13, color: T.text3, marginBottom: 12 }}>Sin comidas en el plan.</p>
              <button onClick={() => setMealDialog(true)}
                style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Comida
              </button>
            </div>
          ) : (
            meals.map(meal => {
              const mKcal = (meal.items ?? []).reduce((s, i) => s + i.kcal, 0);
              const mP = (meal.items ?? []).reduce((s, i) => s + i.protein_g, 0).toFixed(0);
              const mC = (meal.items ?? []).reduce((s, i) => s + i.carbs_g, 0).toFixed(0);
              const mF = (meal.items ?? []).reduce((s, i) => s + i.fat_g, 0).toFixed(0);
              return (
                <div key={meal.id} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 10 }}>
                  {/* Meal header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {meal.time && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.text3 }}>{meal.time}</span>}
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{meal.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.text2 }}>
                        {mKcal} kcal · P {mP} · C {mC} · G {mF}
                      </span>
                      <button onClick={() => deleteMeal(meal.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text4, padding: 2, display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.text4)}>
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => setItemDialog(meal.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text3, padding: 2, display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.accent)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  {/* Items */}
                  <div style={{ padding: '0 16px 8px' }}>
                    {(meal.items ?? []).length === 0 && (
                      <p style={{ fontSize: 11, color: T.text4, padding: '8px 0' }}>Sin ingredientes.</p>
                    )}
                    {(meal.items ?? []).map(item => (
                      <div key={item.id}
                        style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '6px 0', borderTop: `1px dashed ${T.border}`, fontSize: 12, color: T.text2, fontFamily: 'JetBrains Mono, monospace', alignItems: 'center' }}>
                        <input defaultValue={item.ingredient}
                          onBlur={e => updateItem(item.id, { ingredient: e.target.value })}
                          style={{ background: 'transparent', border: 'none', outline: 'none', color: T.text2, fontSize: 12, fontFamily: 'inherit', width: '100%' }}
                          onFocus={e => (e.currentTarget.style.color = T.text)}
                          onBlurCapture={e => (e.currentTarget.style.color = T.text2)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="number" defaultValue={item.qty}
                            onBlur={e => updateItem(item.id, { qty: parseFloat(e.target.value) })}
                            style={{ background: 'transparent', border: 'none', outline: 'none', color: T.text3, fontSize: 12, fontFamily: 'inherit', width: 40, textAlign: 'right' }} />
                          <span style={{ color: T.text3 }}>{item.unit}</span>
                          <span style={{ color: T.text3 }}>{item.kcal}kcal</span>
                        </div>
                        <button onClick={() => deleteItem(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text4, padding: 2, display: 'flex' }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.danger)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.text4)}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Macro card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Macros del día</p>
                <p style={{ fontSize: 12, color: T.text3, margin: '2px 0 0' }}>Objetivo {plan.kcal_target} kcal</p>
              </div>
              {plan.kcal_target && (
                <span style={{ background: 'rgba(81,226,168,0.12)', color: T.good, border: `1px solid rgba(81,226,168,0.3)`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                  {completePct}% completado
                </span>
              )}
            </div>

            {/* Donut */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData.length > 0 ? pieData : [{ name: 'Sin datos', value: 1, color: T.surface3 }]}
                      cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {(pieData.length > 0 ? pieData : [{ color: T.surface3 }]).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: T.surface2, border: `1px solid ${T.border}`, fontSize: 11, borderRadius: 6, color: T.text }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 24, fontWeight: 700, color: T.text, lineHeight: 1 }}>{totalKcal}</div>
                  <div style={{ fontSize: 11, color: T.text3, textTransform: 'uppercase', letterSpacing: 1 }}>KCAL</div>
                </div>
              </div>
            </div>

            {/* Macro rows */}
            {[
              { label: 'Proteína', total: totalP, target: plan.protein_target ?? 150, color: MACRO_COLORS.prot },
              { label: 'Carbos', total: totalC, target: plan.carbs_target ?? 200, color: MACRO_COLORS.carbs },
              { label: 'Grasas', total: totalF, target: plan.fat_target ?? 67, color: MACRO_COLORS.fat },
            ].map((macro, idx) => (
              <div key={macro.label} style={{
                display: 'grid', gridTemplateColumns: '90px 1fr 110px', gap: 12, alignItems: 'center',
                padding: '10px 0', borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 12, color: T.text }}>{macro.label}</span>
                <div style={{ height: 6, background: T.surface3, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((macro.total / macro.target) * 100, 100)}%`, background: macro.color, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: T.text2, textAlign: 'right' }}>
                  {macro.total.toFixed(0)}g / {macro.target}g
                </span>
              </div>
            ))}
          </div>

          {/* Shopping list card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>🛒 Lista de compra</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={generateShoppingList}
                  style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accentLine}`, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} /> Auto-generar
                </button>
                <button onClick={generateShoppingList}
                  style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={11} /> Copiar
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shoppingItems.length === 0 ? (
                <p style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '16px 0' }}>
                  Agrega ingredientes al plan para ver la lista.
                </p>
              ) : shoppingItems.map(item => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: T.text2 }}>{item.name}</span>
                  <span style={{ color: T.text3 }}>{item.qty.toFixed(0)} {item.unit}<span style={{ color: T.text4 }}>/sem</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Plan dialog */}
      <PlanDialog open={planDialog} onClose={() => setPlanDialog(false)} form={planForm} setForm={setPlanForm}
        onSave={async () => { await createPlan(planForm.name || 'Plan', parseInt(planForm.kcal) || 2000, parseInt(planForm.protein) || 150, parseInt(planForm.carbs) || 200, parseInt(planForm.fat) || 67); setPlanDialog(false); }} />

      {/* Meal dialog */}
      <Dialog open={mealDialog} onOpenChange={setMealDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 320 }}>
          <DialogHeader><DialogTitle style={{ color: T.text }}>Agregar comida</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
            <DialogField label="Nombre *">
              <DialogInput placeholder="Desayuno" value={mealForm.name} onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))} />
            </DialogField>
            <DialogField label="Hora">
              <DialogInput placeholder="07:00" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))} />
            </DialogField>
          </div>
          <DialogFooter>
            <GhostBtn onClick={() => setMealDialog(false)}>Cancelar</GhostBtn>
            <AccentBtn onClick={async () => { await addMeal(mealForm.name, mealForm.time); setMealDialog(false); setMealForm({ name: '', time: '' }); }} disabled={!mealForm.name}>Agregar</AccentBtn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={!!itemDialog} onOpenChange={o => { if (!o) setItemDialog(null); }}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 360 }}>
          <DialogHeader><DialogTitle style={{ color: T.text }}>Agregar ingrediente</DialogTitle></DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <DialogField label="Ingrediente *">
                <DialogInput placeholder="Pollo pechuga" value={itemForm.ingredient} onChange={e => setItemForm(p => ({ ...p, ingredient: e.target.value }))} />
              </DialogField>
            </div>
            {[
              { key: 'qty', label: 'Cantidad' },
              { key: 'unit', label: 'Unidad (g/u/ml)', type: 'text' },
              { key: 'kcal', label: 'Kcal' },
              { key: 'protein_g', label: 'Proteína (g)' },
              { key: 'carbs_g', label: 'Carbos (g)' },
              { key: 'fat_g', label: 'Grasa (g)' },
            ].map(f => (
              <DialogField key={f.key} label={f.label}>
                <DialogInput type={f.type ?? 'number'} step="0.1" value={String(itemForm[f.key as keyof typeof itemForm] ?? '')}
                  onChange={e => setItemForm(p => ({ ...p, [f.key]: f.type === 'text' ? e.target.value : parseFloat(e.target.value) || 0 }))} />
              </DialogField>
            ))}
          </div>
          <DialogFooter>
            <GhostBtn onClick={() => setItemDialog(null)}>Cancelar</GhostBtn>
            <AccentBtn onClick={async () => {
              if (!itemDialog || !itemForm.ingredient) return;
              await addItem(itemDialog, {
                ingredient: itemForm.ingredient!, qty: itemForm.qty ?? 100, unit: itemForm.unit ?? 'g',
                kcal: itemForm.kcal ?? 0, protein_g: itemForm.protein_g ?? 0, carbs_g: itemForm.carbs_g ?? 0, fat_g: itemForm.fat_g ?? 0,
              });
              setItemDialog(null);
              setItemForm({ ingredient: '', qty: 100, unit: 'g', kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
            }} disabled={!itemForm.ingredient}>Agregar</AccentBtn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Internal helpers ── */

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ background: 'transparent', color: T.text2, border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.color = T.text; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text2; }}>
      {children}
    </button>
  );
}

function AccentBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function DialogField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, textTransform: 'uppercase', color: T.text3, letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );
}

function DialogInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 32, borderRadius: 8, fontSize: 13, padding: '0 10px', outline: 'none', width: '100%', boxSizing: 'border-box', ...props.style }} />
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
      <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 360 }}>
        <DialogHeader><DialogTitle style={{ color: T.text }}>Crear plan nutricional</DialogTitle></DialogHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <DialogField label="Nombre">
              <DialogInput placeholder="Plan Definición 2026" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </DialogField>
          </div>
          {[
            { key: 'kcal', label: 'Kcal objetivo', placeholder: '2400' },
            { key: 'protein', label: 'Proteína (g)', placeholder: '180' },
            { key: 'carbs', label: 'Carbos (g)', placeholder: '240' },
            { key: 'fat', label: 'Grasa (g)', placeholder: '67' },
          ].map(f => (
            <DialogField key={f.key} label={f.label}>
              <DialogInput type="number" placeholder={f.placeholder} value={(form as any)[f.key]}
                onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
            </DialogField>
          ))}
        </div>
        <DialogFooter>
          <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
          <AccentBtn onClick={onSave}>Crear</AccentBtn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
