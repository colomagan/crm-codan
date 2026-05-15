import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import type { CrmClient, ClientStatus } from '@/types/crm';
import { LeftPanel } from '@/components/fitness/LeftPanel';
import { MetricsTab } from '@/components/fitness/tabs/MetricsTab';
import { BodyMappingTab } from '@/components/fitness/tabs/BodyMappingTab';
import { CheckInsTab } from '@/components/fitness/tabs/CheckInsTab';
import { TrainingTab } from '@/components/fitness/tabs/TrainingTab';
import { NutritionTab } from '@/components/fitness/tabs/NutritionTab';
import { useFitnessProfile } from '@/hooks/fitness/useFitnessProfile';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

type Tab = 'metrics' | 'body' | 'checkins' | 'training' | 'nutrition';
type View = 'profile' | 'trainer';

const TABS: { id: Tab; label: string }[] = [
  { id: 'metrics',   label: 'Métricas' },
  { id: 'body',      label: 'Cuerpo' },
  { id: 'checkins',  label: 'Check-ins' },
  { id: 'training',  label: 'Entrenamiento' },
  { id: 'nutrition', label: 'Nutrición' },
];

const STATUS_COLORS: Record<ClientStatus, string> = {
  active:   '#10b981', inactive: '#64748b', paused: '#f59e0b',
};
const STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Activo', inactive: 'Inactivo', paused: 'Pausado',
};
const SOURCES = ['Instagram', 'Web', 'Referral', 'Manual', 'Other'];
const DEFAULT_LABELS = ['VIP', 'Nuevo', 'Seguimiento', 'Hot lead', 'Cold lead', 'En negociación', 'Cerrado', 'En riesgo'];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || '?').substring(0, 2).toUpperCase();
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 22px', borderTop: `3px solid ${T.accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: T.accent, marginBottom: 18 }}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function FieldInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 36, borderRadius: 8, fontSize: 13, padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}
    />
  );
}

// ── Client profile view ───────────────────────────────────────────────────────
function ClientProfileView({ client, onSave }: { client: CrmClient; onSave: (updates: Partial<CrmClient>) => void }) {
  const [form, setForm] = useState<Partial<CrmClient>>({
    business_name: client.business_name || '',
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
    website: client.website || '',
    city: client.city || '',
    category: client.category || '',
    source: client.source || '',
    notes: client.notes || '',
    labels: client.labels || [],
    status: client.status,
    channel: client.channel || '',
  });
  const [labelInput, setLabelInput] = useState('');
  const [labelOpen, setLabelOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (key: keyof CrmClient, val: any) => { setForm(p => ({ ...p, [key]: val })); setDirty(true); };

  const addLabel = (l: string) => {
    const n = l.trim();
    if (!n || form.labels?.includes(n)) return;
    set('labels', [...(form.labels || []), n]);
    setLabelInput('');
  };
  const removeLabel = (l: string) => set('labels', (form.labels || []).filter(x => x !== l));

  const displayName = (form.business_name || `${form.first_name} ${form.last_name}`.trim() || 'Sin nombre');
  const initials = getInitials(displayName);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px' }}>
      {dirty && (
        <div style={{ position: 'fixed', bottom: 24, right: 28, zIndex: 30, display: 'flex', gap: 8, background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 13, color: T.text2, alignSelf: 'center', marginRight: 4 }}>Cambios sin guardar</span>
          <button onClick={() => { setForm({ business_name: client.business_name || '', first_name: client.first_name || '', last_name: client.last_name || '', email: client.email || '', phone: client.phone || '', website: client.website || '', city: client.city || '', category: client.category || '', source: client.source || '', notes: client.notes || '', labels: client.labels || [], status: client.status, channel: client.channel || '' }); setDirty(false); }} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, borderRadius: 8, padding: '5px 14px', fontSize: 12, cursor: 'pointer' }}>Descartar</button>
          <button onClick={() => { onSave(form); setDirty(false); }} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '5px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Guardar cambios</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identification */}
          <SectionCard title="Identificación" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FieldRow label="Nombre / Empresa">
                <FieldInput value={String(form.business_name || '')} onChange={v => set('business_name', v)} placeholder="Nombre completo o empresa" />
              </FieldRow>
              <FieldRow label="Categoría">
                <FieldInput value={String(form.category || '')} onChange={v => set('category', v)} placeholder="Ej. Pérdida de peso" />
              </FieldRow>
              <FieldRow label="Fuente">
                <select value={String(form.source || '')} onChange={e => set('source', e.target.value)} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 36, borderRadius: 8, fontSize: 13, padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box' as const }}>
                  <option value="">Sin especificar</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Ciudad">
                <FieldInput value={String(form.city || '')} onChange={v => set('city', v)} placeholder="Buenos Aires" />
              </FieldRow>
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard title="Contacto" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14 19.79 19.79 0 0 1 1.61 5.44 2 2 0 0 1 3.6 3.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FieldRow label="Nombre">
                <FieldInput value={String(form.first_name || '')} onChange={v => set('first_name', v)} placeholder="Nombre" />
              </FieldRow>
              <FieldRow label="Apellido">
                <FieldInput value={String(form.last_name || '')} onChange={v => set('last_name', v)} placeholder="Apellido" />
              </FieldRow>
              <FieldRow label="Teléfono / WhatsApp">
                <div style={{ display: 'flex', gap: 6 }}>
                  <FieldInput value={String(form.phone || '')} onChange={v => set('phone', v)} placeholder="+54 9 11..." />
                  {form.phone && (
                    <a href={`https://wa.me/${String(form.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: T.surface3, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.good }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14 19.79 19.79 0 0 1 1.61 5.44 2 2 0 0 1 3.6 3.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Email">
                <div style={{ display: 'flex', gap: 6 }}>
                  <FieldInput value={String(form.email || '')} onChange={v => set('email', v)} placeholder="email@ejemplo.com" type="email" />
                  {form.email && (
                    <a href={`mailto:${form.email}`}
                      style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: T.surface3, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.info }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </a>
                  )}
                </div>
              </FieldRow>
              <div style={{ gridColumn: '1 / -1' }}>
                <FieldRow label="Sitio web">
                  <div style={{ display: 'flex', gap: 6 }}>
                    <FieldInput value={String(form.website || '')} onChange={v => set('website', v)} placeholder="https://ejemplo.com" />
                    {form.website && (
                      <a href={String(form.website)} target="_blank" rel="noreferrer"
                        style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: T.surface3, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                  </div>
                </FieldRow>
              </div>
            </div>
          </SectionCard>

          {/* Notes */}
          <SectionCard title="Notas" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>
            <textarea
              value={String(form.notes || '')}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notas internas sobre este cliente..."
              rows={4}
              style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, fontSize: 13, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, lineHeight: 1.6 }}
            />
          </SectionCard>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ height: 72, background: `linear-gradient(135deg, ${T.accentDim} 0%, ${T.accentLine} 100%)`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 12, width: 36, height: 36, borderRadius: '50%', background: T.accentDim }} />
              <div style={{ position: 'absolute', top: 20, right: 36, width: 18, height: 18, borderRadius: '50%', background: T.accentLine }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 20px', marginTop: -32, gap: 10 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(145deg, ${T.accent}cc, ${T.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${T.bg}`, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: T.accentInk, letterSpacing: '-0.02em' }}>{initials}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 2px' }}>{displayName}</p>
                {form.first_name && form.business_name && (
                  <p style={{ fontSize: 12, color: T.text3, margin: 0 }}>{form.first_name} {form.last_name}</p>
                )}
              </div>
              {/* Status selector */}
              <select
                value={form.status || 'active'}
                onChange={e => set('status', e.target.value as ClientStatus)}
                style={{ background: T.surface2, border: `1px solid ${T.border}`, color: STATUS_COLORS[form.status as ClientStatus] || T.text2, borderRadius: 8, padding: '4px 10px', fontSize: 12, outline: 'none', cursor: 'pointer', width: '100%', fontWeight: 600 }}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="paused">Pausado</option>
              </select>
            </div>
          </div>

          {/* Labels */}
          <SectionCard title="Etiquetas" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 10 }}>
              {(form.labels || []).length === 0 && <span style={{ fontSize: 12, color: T.text4 }}>Sin etiquetas</span>}
              {(form.labels || []).map(l => (
                <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.accentDim, border: `1px solid ${T.accentLine}`, color: T.accent, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                  {l}
                  <button onClick={() => removeLabel(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.accent, padding: 0, display: 'flex', lineHeight: 1 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </span>
              ))}
            </div>
            {/* Quick labels */}
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 8 }}>
              {DEFAULT_LABELS.filter(l => !(form.labels || []).includes(l)).map(l => (
                <button key={l} onClick={() => addLabel(l)} style={{ background: T.surface3, border: `1px solid ${T.border}`, color: T.text3, borderRadius: 5, padding: '2px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + {l}
                </button>
              ))}
            </div>
            {/* Custom label input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { addLabel(labelInput); } }}
                placeholder="Etiqueta personalizada..."
                style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, height: 32, borderRadius: 7, fontSize: 12, padding: '0 10px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={() => addLabel(labelInput)} style={{ background: T.accent, border: 'none', color: T.accentInk, borderRadius: 7, padding: '0 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+</button>
            </div>
          </SectionCard>

          {/* Info */}
          <SectionCard title="Info" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Creado', value: new Date(client.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Actualizado', value: new Date(client.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Fuente', value: client.source || '—' },
                { label: 'Canal', value: client.channel || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.text4 }}>{label}</span>
                  <span style={{ fontSize: 12, color: T.text2, fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [client, setClient] = useState<CrmClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('metrics');
  const [view, setView] = useState<View>('profile');

  const { profile, save: saveProfile } = useFitnessProfile(id ?? '');

  const fetchClient = () => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Cliente no encontrado'); navigate(-1); return; }
      setClient(data as CrmClient);
      setLoading(false);
    });
  };

  useEffect(() => { fetchClient(); }, [id]);

  const handleSaveProfile = async (updates: Partial<CrmClient>) => {
    if (!client) return;
    const { error } = await supabase.from('clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', client.id);
    if (error) { toast.error('No se pudo guardar.'); return; }
    toast.success('Cambios guardados.');
    fetchClient();
  };

  const handleDelete = async () => {
    if (!client) return;
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) toast.error('No se pudo eliminar.');
    else { toast.success('Cliente eliminado.'); navigate(-1); }
  };

  if (loading || !client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid transparent', borderTopColor: T.accent, borderRightColor: `${T.accent}40` }} />
      </div>
    );
  }

  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim() || 'Sin nombre';
  const statusColor = STATUS_COLORS[client.status];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: 16, background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text3, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.text3 }}>Clientes</span>
            <span style={{ fontSize: 13, color: T.text4 }}>/</span>
            <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{displayName}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: statusColor, border: `1px solid ${statusColor}40`, background: `${statusColor}15` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {STATUS_LABELS[client.status]}
            </span>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
            <button
              onClick={() => setView('profile')}
              style={{ padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, background: view === 'profile' ? T.surface3 : 'transparent', color: view === 'profile' ? T.text : T.text3 }}
            >
              Perfil
            </button>
            <button
              onClick={() => setView('trainer')}
              style={{ padding: '4px 14px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, background: view === 'trainer' ? T.accent : 'transparent', color: view === 'trainer' ? T.accentInk : T.text3 }}
            >
              Modo entrenador
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

          <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

          <button onClick={() => setDeleteOpen(true)} style={{ height: 32, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'transparent', border: '1px solid transparent', color: T.danger, cursor: 'pointer' }}>
            Eliminar
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'profile' ? (
          <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <ClientProfileView client={client} onSave={handleSaveProfile} />
            </motion.div>
          </div>
        ) : (
          <motion.div key="trainer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '320px 1fr' }}>
            {/* Sidebar */}
            <div style={{ borderRight: `1px solid ${T.border}`, padding: '24px 20px', overflowY: 'auto', background: T.bg }}>
              <LeftPanel client={client} profile={profile} onSaveProfile={saveProfile} />
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 4, padding: '0 28px', flexShrink: 0 }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ padding: '14px 14px', fontSize: 13, fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', color: activeTab === tab.id ? T.text : T.text3, borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : '2px solid transparent', transition: 'color 0.15s, border-color 0.15s' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
                <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                  {activeTab === 'metrics'   && <MetricsTab   clientId={client.id} />}
                  {activeTab === 'body'      && <BodyMappingTab clientId={client.id} />}
                  {activeTab === 'checkins'  && <CheckInsTab  clientId={client.id} />}
                  {activeTab === 'training'  && <TrainingTab  clientId={client.id} />}
                  {activeTab === 'nutrition' && <NutritionTab clientId={client.id} />}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{displayName}</strong> será eliminado permanentemente junto a todos sus datos fitness.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
