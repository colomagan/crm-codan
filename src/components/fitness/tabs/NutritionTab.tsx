import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useNutrition } from '@/hooks/fitness/useNutrition';
import { useFitnessProfile } from '@/hooks/fitness/useFitnessProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
  purple: '#a78bff',
};

interface Props { clientId: string; }

function toEmbedPdfUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    const match = trimmed.match(/[-\w]{25,}/);
    if (match) return `https://drive.google.com/file/d/${match[0]}/preview`;
  }
  return trimmed;
}

// Donut chart for macros
function MacroDonut({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const circumference = 2 * Math.PI * 34;

  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;

  const pLen = total > 0 ? (pKcal / total) * circumference : 0;
  const cLen = total > 0 ? (cKcal / total) * circumference : 0;
  const fLen = total > 0 ? (fKcal / total) * circumference : 0;

  return (
    <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
      <svg viewBox="0 0 80 80" width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r="34" fill="none" stroke={T.surface3} strokeWidth="10" />
        {/* proteína */}
        <circle cx="40" cy="40" r="34" fill="none" stroke={T.purple} strokeWidth="10"
          strokeDasharray={`${pLen} ${circumference}`} strokeDashoffset="0" />
        {/* carbs */}
        <circle cx="40" cy="40" r="34" fill="none" stroke={T.warning} strokeWidth="10"
          strokeDasharray={`${cLen} ${circumference}`} strokeDashoffset={`${-pLen}`} />
        {/* grasa */}
        <circle cx="40" cy="40" r="34" fill="none" stroke={T.good} strokeWidth="10"
          strokeDasharray={`${fLen} ${circumference}`} strokeDashoffset={`${-(pLen + cLen)}`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(total / 1000 * 10) / 10 > 0 ? Math.round(total) : '—'}
        </span>
        <span style={{ fontSize: 9, color: T.text3 }}>kcal</span>
      </div>
    </div>
  );
}

function MacroBar({ label, color, value, max }: { label: string; color: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 54px', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <div style={{ height: 4, background: T.surface3, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{value} g</span>
    </div>
  );
}

// ── Allergy tag type ────────────────────────────────────────────────
type AllergyTag = { name: string; type: 'alergia' | 'preferencia' };

function parseAllergies(raw: string | null): AllergyTag[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as AllergyTag[];
  } catch {}
  // legacy plain-text fallback
  return raw.split(',').map(s => ({ name: s.trim(), type: 'preferencia' as const })).filter(t => t.name);
}

function serializeAllergies(tags: AllergyTag[]): string {
  return JSON.stringify(tags);
}

const TAG_COLORS = {
  alergia:     { bg: 'rgba(255,93,93,0.12)',  border: 'rgba(255,93,93,0.35)',  text: '#ff5d5d' },
  preferencia: { bg: 'rgba(110,168,255,0.12)', border: 'rgba(110,168,255,0.35)', text: '#6ea8ff' },
};

// ── Hydration card (persists to DB) ─────────────────────────────────
function HydrationCard({ clientId }: { clientId: string }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const TOTAL = 10;
  const LITERS_PER_GLASS = 0.35;
  const [filled, setFilled] = useState(0);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    supabase
      .from('client_hydration')
      .select('glasses')
      .eq('client_id', clientId)
      .eq('date', today)
      .maybeSingle()
      .then(({ data }) => { if (data) setFilled((data as { glasses: number }).glasses); });
  }, [clientId, today]);

  const setGlasses = async (count: number) => {
    if (!userId || saving) return;
    setFilled(count);
    setSaving(true);
    await supabase
      .from('client_hydration')
      .upsert({ client_id: clientId, user_id: userId, date: today, glasses: count },
               { onConflict: 'client_id,date' });
    setSaving(false);
  };

  const toggle = (idx: number) => setGlasses(idx < filled ? idx : idx + 1);
  const reset  = () => setGlasses(0);

  const liters = (filled * LITERS_PER_GLASS).toFixed(1);
  const target = (TOTAL * LITERS_PER_GLASS).toFixed(1);

  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 14px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Hidratación</div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            {liters} / {target} L{saving ? ' …' : ''}
          </div>
        </div>
        {filled > 0 && (
          <button onClick={reset} style={{ fontSize: 10, color: T.text4, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'JetBrains Mono', monospace" }}>
            reset
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            title={`${((i + 1) * LITERS_PER_GLASS).toFixed(1)} L`}
            style={{
              aspectRatio: '1', borderRadius: 7,
              background: i < filled ? T.info : T.surface3,
              border: `1px solid ${i < filled ? 'transparent' : T.border}`,
              cursor: 'pointer', padding: 0, transition: 'background 0.12s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {i < filled && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


const numInput: React.CSSProperties = {
  background: T.surface3, border: `1px solid ${T.border}`, color: T.text,
  borderRadius: 7, padding: '5px 10px', fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace", width: '100%',
  outline: 'none', boxSizing: 'border-box',
};

const fieldLabel: React.CSSProperties = {
  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
  color: T.text3, display: 'block', marginBottom: 5,
  fontFamily: "'JetBrains Mono', monospace",
};

function MacrosCard({
  plan,
  onEdit,
}: {
  plan: { id: string; kcal_target: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  onEdit: () => void;
}) {
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Macros objetivo</div>
          {plan && <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{plan.kcal_target.toLocaleString()} kcal / día</div>}
        </div>
        <button
          onClick={onEdit}
          title="Editar macros"
          style={{
            background: T.surface3, border: `1px solid ${T.border}`, color: T.text3,
            borderRadius: 6, width: 24, height: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      {plan ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <MacroDonut protein={plan.protein_g} carbs={plan.carbs_g} fat={plan.fat_g} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {[
                { label: 'Proteína', color: T.purple, val: plan.protein_g },
                { label: 'Carbos',   color: T.warning, val: plan.carbs_g },
                { label: 'Grasa',    color: T.good,    val: plan.fat_g },
              ].map(({ label, color, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: T.text3 }}>{label}</span>
                  <span style={{ fontSize: 10, color: T.text, marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{val}g</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <MacroBar label="Proteína" color={T.purple} value={plan.protein_g} max={plan.protein_g} />
            <MacroBar label="Carbos"   color={T.warning} value={plan.carbs_g}  max={plan.carbs_g}  />
            <MacroBar label="Grasa"    color={T.good}    value={plan.fat_g}    max={plan.fat_g}    />
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: T.text4 }}>Sin plan activo. Hacé click en ✎ para configurar.</div>
      )}
    </div>
  );
}

function AllergiesCard({ allergies, onEdit }: { allergies: string | null; onEdit: () => void }) {
  const tags = parseAllergies(allergies);

  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Alergias y preferencias</div>
          <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>Considerado en cada comida</div>
        </div>
        <button
          onClick={onEdit}
          title="Editar"
          style={{
            background: T.surface3, border: `1px solid ${T.border}`, color: T.text3,
            borderRadius: 6, width: 24, height: 24, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      {tags.length === 0 ? (
        <span style={{ fontSize: 12, color: T.text4 }}>Sin información registrada.</span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {tags.map((tag, i) => {
            const c = TAG_COLORS[tag.type];
            return (
              <span key={i} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.text, fontFamily: "'JetBrains Mono', monospace",
              }}>{tag.name}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RightSidebar({
  clientId,
  plan,
  onEditMacros,
}: {
  clientId: string;
  plan: { id: string; kcal_target: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  onEditMacros: () => void;
}) {
  const { profile, save: saveProfile } = useFitnessProfile(clientId);
  const [allergyOpen, setAllergyOpen] = useState(false);
  const [tags, setTags] = useState<AllergyTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<'alergia' | 'preferencia'>('preferencia');

  const openAllergyDialog = () => {
    setTags(parseAllergies(profile?.allergies ?? null));
    setNewTagName('');
    setNewTagType('preferencia');
    setAllergyOpen(true);
  };

  const addTag = () => {
    const name = newTagName.trim();
    if (name && !tags.find(t => t.name === name)) {
      setTags(prev => [...prev, { name, type: newTagType }]);
    }
    setNewTagName('');
  };

  const removeTag = (idx: number) => setTags(prev => prev.filter((_, i) => i !== idx));

  const toggleTagType = (idx: number) =>
    setTags(prev => prev.map((t, i) => i === idx ? { ...t, type: t.type === 'alergia' ? 'preferencia' : 'alergia' } : t));

  const saveAllergies = async () => {
    await saveProfile({ allergies: tags.length ? serializeAllergies(tags) : null } as never);
    setAllergyOpen(false);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 252, flexShrink: 0 }}>
        <MacrosCard plan={plan} onEdit={onEditMacros} />
        <HydrationCard clientId={clientId} />
        <AllergiesCard allergies={profile?.allergies ?? null} onEdit={openAllergyDialog} />
      </div>

      {/* Allergies dialog */}
      <Dialog open={allergyOpen} onOpenChange={setAllergyOpen}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 440 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Alergias y preferencias</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Add row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Ej: Sin lactosa, Vegetariana…"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                style={{ ...numInput, flex: 1 }}
              />
              {/* Type toggle */}
              <div style={{ display: 'inline-flex', background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 7, padding: 2, gap: 2 }}>
                {(['alergia', 'preferencia'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewTagType(t)}
                    style={{
                      padding: '3px 8px', fontSize: 10, border: 'none', borderRadius: 5, cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: newTagType === t ? TAG_COLORS[t].bg : 'transparent',
                      color: newTagType === t ? TAG_COLORS[t].text : T.text4,
                      transition: 'all 0.12s',
                    }}
                  >{t}</button>
                ))}
              </div>
              <button
                onClick={addTag}
                disabled={!newTagName.trim()}
                style={{
                  background: T.accent, color: T.accentInk, border: 'none',
                  borderRadius: 7, padding: '0 12px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: !newTagName.trim() ? 0.5 : 1,
                }}
              >+</button>
            </div>

            {/* Tags list */}
            {tags.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tags.map((tag, i) => {
                  const c = TAG_COLORS[tag.type];
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 9,
                      background: T.surface2, border: `1px solid ${T.border}`,
                    }}>
                      {/* Name */}
                      <span style={{ flex: 1, fontSize: 12, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>
                        {tag.name}
                      </span>
                      {/* Type toggle pill */}
                      <button
                        onClick={() => toggleTagType(i)}
                        title="Cambiar tipo"
                        style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 999, border: `1px solid ${c.border}`,
                          background: c.bg, color: c.text, cursor: 'pointer',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >{tag.type}</button>
                      {/* Delete */}
                      <button
                        onClick={() => removeTag(i)}
                        style={{
                          background: 'none', border: 'none', color: T.text4,
                          cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 16,
                          display: 'flex', alignItems: 'center',
                        }}
                        title="Eliminar"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: T.text4, textAlign: 'center', padding: '8px 0' }}>
                Sin etiquetas. Añadí una arriba.
              </div>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setAllergyOpen(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={saveAllergies} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NutritionTab({ clientId }: Props) {
  const { plan, loading, createPlan, updatePlanPdfUrl, updatePlanMacros } = useNutrition(clientId);

  const [linkDialog, setLinkDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Macros dialog
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [mKcal, setMKcal] = useState('');
  const [mProtein, setMProtein] = useState('');
  const [mCarbs, setMCarbs] = useState('');
  const [mFat, setMFat] = useState('');

  const openMacrosDialog = () => {
    setMKcal(String(plan?.kcal_target ?? 2000));
    setMProtein(String(plan?.protein_g ?? 150));
    setMCarbs(String(plan?.carbs_g ?? 200));
    setMFat(String(plan?.fat_g ?? 67));
    setMacrosOpen(true);
  };

  const saveMacros = async () => {
    const kcal = parseInt(mKcal) || 0;
    const protein = parseInt(mProtein) || 0;
    const carbs = parseInt(mCarbs) || 0;
    const fat = parseInt(mFat) || 0;
    if (plan) {
      await updatePlanMacros(plan.id, kcal, protein, carbs, fat);
    } else {
      await createPlan('Plan nutricional', kcal, protein, carbs, fat);
    }
    setMacrosOpen(false);
  };

  const handleSaveUrl = async () => {
    const url = pdfUrl.trim();
    if (!url) return;
    if (plan) {
      await updatePlanPdfUrl(plan.id, url);
    } else {
      await createPlan('Plan nutricional', 2000, 150, 200, 67, url);
    }
    setLinkDialog(false);
    setPdfUrl('');
  };

  const openEditDialog = () => {
    setPdfUrl(plan?.pdf_url ?? '');
    setLinkDialog(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: T.text3, fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  const embedUrl = plan?.pdf_url ? toEmbedPdfUrl(plan.pdf_url) : null;

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {embedUrl ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* PDF column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: T.text3 }}>Plan nutricional · PDF</span>
              <a
                href={plan!.pdf_url!}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.accent, textDecoration: 'none' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Abrir en pestaña
              </a>
              <button
                onClick={openEditDialog}
                style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
              >
                Cambiar link
              </button>
            </div>

            {/* PDF viewer */}
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.borderStrong}` }}>
              {!iframeLoaded && (
                <div style={{
                  position: 'absolute', inset: 0, minHeight: 640,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: T.surface, color: T.text3, fontSize: 13,
                }}>
                  Cargando PDF...
                </div>
              )}
              <iframe
                src={embedUrl}
                width="100%"
                height="640"
                style={{ display: 'block', border: 'none' }}
                onLoad={() => setIframeLoaded(true)}
                allow="autoplay"
              />
            </div>
          </div>

          {/* Right sidebar */}
          <RightSidebar clientId={clientId} plan={plan} onEditMacros={openMacrosDialog} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Empty state */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 360, gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>
                Sin plan nutricional
              </p>
              <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>
                Vinculá un PDF para previsualizarlo desde aquí.
              </p>
            </div>
            <button
              onClick={() => { setPdfUrl(''); setLinkDialog(true); }}
              style={{
                background: T.accent, color: T.accentInk, border: 'none',
                borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cargar link del PDF
            </button>
          </div>

          {/* Right sidebar — visible even without PDF */}
          <RightSidebar clientId={clientId} plan={plan} onEditMacros={openMacrosDialog} />
        </div>
      )}

      {/* Macros dialog */}
      <Dialog open={macrosOpen} onOpenChange={setMacrosOpen}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Macros objetivo</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Calorías (kcal)', val: mKcal, set: setMKcal, color: T.accent },
              { label: 'Proteína (g)',    val: mProtein, set: setMProtein, color: T.purple },
              { label: 'Carbohidratos (g)', val: mCarbs, set: setMCarbs, color: T.warning },
              { label: 'Grasa (g)',       val: mFat, set: setMFat, color: T.good },
            ].map(({ label, val, set, color }) => (
              <div key={label}>
                <label style={{ ...fieldLabel, color }}>{label}</label>
                <input
                  type="number"
                  min="0"
                  value={val}
                  onChange={e => set(e.target.value)}
                  style={numInput}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setMacrosOpen(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={saveMacros} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 460 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>
              {plan?.pdf_url ? 'Cambiar PDF' : 'Cargar plan nutricional'}
            </DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3, display: 'block', marginBottom: 6 }}>
                Link del PDF
              </label>
              <input
                placeholder="https://drive.google.com/file/d/... o link directo al PDF"
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                style={{
                  background: T.surface2, border: `1px solid ${T.border}`,
                  color: T.text, height: 36, borderRadius: 8, fontSize: 13,
                  padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const,
                }}
                autoFocus
              />
            </div>
            <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>
              Soporta Google Drive (se embebe automáticamente) y links directos a PDF.
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setLinkDialog(false)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveUrl}
              disabled={!pdfUrl.trim()}
              style={{
                background: T.accent, color: T.accentInk, border: 'none',
                borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: !pdfUrl.trim() ? 0.5 : 1,
              }}
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
