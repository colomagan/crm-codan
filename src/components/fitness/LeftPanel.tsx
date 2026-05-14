import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CrmClient } from '@/types/crm';
import type { ClientFitnessProfile, GoalCycle } from '@/types/fitness';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useMetrics } from '@/hooks/fitness/useMetrics';
import { useNutrition } from '@/hooks/fitness/useNutrition';

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

const CYCLE_LABELS: Record<GoalCycle, string> = {
  definition: 'Definición',
  bulk: 'Volumen',
  recomp: 'Recomposición',
};

const CYCLE_DESC: Record<GoalCycle, string> = {
  definition: 'Reducción de grasa corporal',
  bulk: 'Aumento de masa muscular',
  recomp: 'Mejora de composición corporal',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

const SectionHeader = ({ label, micro }: { label: string; micro?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3 }}>
      {label}
    </span>
    {micro && <span style={{ fontSize: 11, color: T.text4, fontFamily: "'JetBrains Mono', monospace" }}>{micro}</span>}
  </div>
);

const Section = ({ children, noBorder }: { children: React.ReactNode; noBorder?: boolean }) => (
  <div style={{ padding: '18px 0', borderBottom: noBorder ? 'none' : `1px solid ${T.border}` }}>
    {children}
  </div>
);

interface Props {
  client: CrmClient;
  profile: ClientFitnessProfile | null;
  onSaveProfile: (updates: Partial<ClientFitnessProfile>) => void;
}

export function LeftPanel({ client, profile, onSaveProfile }: Props) {
  const [contactOpen, setContactOpen] = useState(false);
  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim();
  const initials = getInitials(displayName);

  // Live data from other tabs
  const { metrics } = useMetrics(client.id);
  const { plan: nutritionPlan } = useNutrition(client.id);

  const latest  = metrics[0] ?? null;
  const prev    = metrics[1] ?? null;

  const daysLeft = profile?.subscription_end
    ? differenceInDays(parseISO(profile.subscription_end), new Date())
    : null;

  const subColor = daysLeft === null ? T.text3 : daysLeft <= 3 ? T.danger : daysLeft <= 7 ? T.warning : T.good;

  const statusDotColor = client.status === 'active' ? T.good : client.status === 'paused' ? T.warning : T.text3;

  const goalCycle: GoalCycle = profile?.goal_cycle ?? 'definition';

  // Macro data from active nutrition plan
  const kcal    = nutritionPlan?.kcal_target ?? null;
  const protein = nutritionPlan?.protein_g   ?? null;
  const carbs   = nutritionPlan?.carbs_g     ?? null;
  const fat     = nutritionPlan?.fat_g       ?? null;
  const macroMax = { protein: 200, carbs: 300, fat: 100 };

  function delta(curr: number | null, old: number | null) {
    if (curr == null || old == null) return null;
    return curr - old;
  }
  function deltaEl(d: number | null, unit: string) {
    if (d == null) return <span style={{ fontSize: 10, color: T.text4 }}>—</span>;
    if (Math.abs(d) < 0.05) return <span style={{ fontSize: 10, color: T.text4 }}>—</span>;
    const color = d < 0 ? T.good : T.danger;
    return <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color }}>{d > 0 ? '▴' : '▾'} {Math.abs(d).toFixed(1)}{unit}</span>;
  }

  const inputStyle: React.CSSProperties = {
    background: T.surface2,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    fontSize: 12,
    height: 32,
    padding: '0 10px',
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ── Identity card ── */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 14, alignItems: 'center' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #2a2d34, #1a1c20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.text, fontSize: 18, fontWeight: 600,
            }}>
              {initials}
            </div>
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 14, height: 14, borderRadius: '50%',
              background: statusDotColor,
              border: `3px solid ${T.bg}`,
            }} />
          </div>
          {/* Meta */}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 2 }}>
              {displayName}
            </div>
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 6 }}>
              Desde {format(new Date(client.created_at), 'MMM yyyy')}
            </div>
            {profile?.goal_cycle && (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: T.accentDim, color: T.accent,
              }}>
                {CYCLE_LABELS[profile.goal_cycle]}
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* ── Métricas clave ── */}
      <Section>
        <SectionHeader label="Métricas clave" micro={latest ? format(parseISO(latest.date), 'dd MMM') : undefined} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { lbl: 'Peso',     val: latest?.weight_kg,      prevVal: prev?.weight_kg,      unit: 'kg', dec: 1 },
            { lbl: '% Grasa',  val: latest?.body_fat_pct,   prevVal: prev?.body_fat_pct,   unit: '%',  dec: 1 },
            { lbl: 'Músculo',  val: latest?.muscle_mass_kg, prevVal: prev?.muscle_mass_kg, unit: 'kg', dec: 1 },
            { lbl: 'IMC',      val: latest?.bmi,            prevVal: prev?.bmi,            unit: '',   dec: 1 },
          ].map(m => (
            <div key={m.lbl} style={{
              background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: 12,
            }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, marginBottom: 4 }}>
                {m.lbl}
              </div>
              <div style={{ fontSize: 18, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: T.text, lineHeight: 1 }}>
                {m.val != null ? m.val.toFixed(m.dec) : '—'}
                {m.val != null && m.unit && <span style={{ fontSize: 11, color: T.text3, marginLeft: 3 }}>{m.unit}</span>}
              </div>
              <div style={{ marginTop: 4 }}>
                {deltaEl(delta(m.val ?? null, m.prevVal ?? null), m.unit)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Ciclo actual ── */}
      <Section>
        <SectionHeader label="Ciclo actual" />
        <div style={{ position: 'relative' }}>
          <Select
            value={goalCycle}
            onValueChange={v => onSaveProfile({ goal_cycle: v as GoalCycle })}
          >
            <SelectTrigger style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: T.surface2, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: '12px', cursor: 'pointer',
              height: 'auto', width: '100%',
            }}>
              {/* Fire icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: T.accentDim, color: T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.993 1.036C12.695.338 11.9.014 11.22.372 8.108 2.03 6.05 5.23 6.05 8.942c0 1.082.196 2.12.553 3.078a5.89 5.89 0 0 1-1.013-3.265c0-.595.073-1.174.211-1.727C4.255 8.69 3 11.03 3 13.624 3 18.29 7.03 22 12 22s9-3.71 9-8.376c0-4.14-2.962-7.587-6.935-8.44-.028-.006-.049-.1-.072-.148Z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{CYCLE_LABELS[goalCycle]}</div>
                <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{CYCLE_DESC[goalCycle]}</div>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="definition">Definición</SelectItem>
              <SelectItem value="bulk">Volumen</SelectItem>
              <SelectItem value="recomp">Recomposición</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* ── Objetivo diario ── */}
      <Section>
        <SectionHeader label="Objetivo diario" micro={kcal ? `${kcal.toLocaleString()} kcal` : undefined} />
        {kcal == null ? (
          <div style={{ fontSize: 12, color: T.text4 }}>
            Sin plan activo. Configurá los macros en la pestaña Nutrición.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 22, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: T.text }}>
                {kcal.toLocaleString()}
              </span>
              <span style={{ fontSize: 13, color: T.text3 }}>kcal</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { label: 'Proteína', value: protein, max: macroMax.protein, color: '#a78bff' },
                { label: 'Carbs',    value: carbs,   max: macroMax.carbs,   color: T.warning },
                { label: 'Grasa',    value: fat,     max: macroMax.fat,     color: T.good },
              ].map(m => (
                <div key={m.label} style={{
                  background: T.surface2, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: 10,
                }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, marginBottom: 4 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: T.text, marginBottom: 6 }}>
                    {m.value != null ? `${m.value}g` : '—'}
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: T.surface3 }}>
                    <div style={{ height: 3, borderRadius: 2, width: `${m.value ? Math.min(100, (m.value / m.max) * 100) : 0}%`, background: m.color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Suscripción ── */}
      <Section>
        <SectionHeader label="Suscripción" micro="Plan Pro" />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '10px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: subColor, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: T.text2 }}>
              {profile?.subscription_end
                ? `Renueva ${format(parseISO(profile.subscription_end), 'dd MMM yy')}`
                : 'Sin fecha'}
            </span>
          </div>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: T.text2 }}>
            {daysLeft !== null ? `${daysLeft}d` : '—'}
          </span>
        </div>
      </Section>

      {/* ── Configurar perfil ── */}
      <Section>
        <SectionHeader label="Config. perfil" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, marginBottom: 4 }}>
              Fin suscripción
            </div>
            <input
              type="date"
              defaultValue={profile?.subscription_end ?? ''}
              style={inputStyle}
              onBlur={e => { if (e.target.value) onSaveProfile({ subscription_end: e.target.value }); }}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, marginBottom: 4 }}>
              Lesiones / limitaciones
            </div>
            <Textarea
              placeholder="Ej: Rodilla derecha, lumbar..."
              defaultValue={profile?.injuries ?? ''}
              style={{
                background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.text, fontSize: 12,
                padding: '8px 10px', resize: 'none', fontFamily: 'inherit',
                outline: 'none',
              }}
              rows={2}
              onBlur={e => onSaveProfile({ injuries: e.target.value || null })}
            />
          </div>
        </div>
      </Section>

      {/* ── Contacto ── */}
      <Section>
        <button
          onClick={() => setContactOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            marginBottom: contactOpen ? 12 : 0,
          }}
        >
          <SectionHeader label="Contacto" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: contactOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {contactOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>, text: client.email || '—' },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14 19.79 19.79 0 0 1 1.61 5.44 2 2 0 0 1 3.6 3.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>, text: client.phone || '—' },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>, text: client.website ? client.website.replace(/^https?:\/\//, '') : '—' },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, text: 'Zona horaria · —' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', color: T.text2, fontSize: 12 }}>
                <span style={{ color: T.text3, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Bottom: Archivar ── */}
      <Section noBorder>
        <button
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
            padding: '9px 14px', cursor: 'pointer', color: T.text3, fontSize: 13, fontWeight: 500,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.danger; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,93,93,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,93,93,0.3)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text3; (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.borderColor = T.border; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          Archivar cliente
        </button>
      </Section>

    </div>
  );
}
