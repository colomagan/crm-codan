import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { CrmClient } from '@/types/crm';
import type { ClientFitnessProfile, GoalCycle } from '@/types/fitness';
import { format, differenceInDays, parseISO } from 'date-fns';

const CYCLE_LABELS: Record<GoalCycle, string> = {
  definition: '🔥 Definición',
  bulk: '💪 Volumen',
  recomp: '⚖️ Recomposición',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

interface Props {
  client: CrmClient;
  profile: ClientFitnessProfile | null;
  onSaveProfile: (updates: Partial<ClientFitnessProfile>) => void;
}

export function LeftPanel({ client, profile, onSaveProfile }: Props) {
  const [contactOpen, setContactOpen] = useState(false);
  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim();
  const initials = getInitials(displayName);

  const daysLeft = profile?.subscription_end
    ? differenceInDays(parseISO(profile.subscription_end), new Date())
    : null;

  const subColor = daysLeft === null ? '#64748b' : daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#10b981';
  const subPct = daysLeft === null ? 0 : Math.min(100, Math.max(0, (daysLeft / 30) * 100));

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pb-4" style={{ minWidth: 200 }}>
      {/* Avatar */}
      <div className="text-center pt-2">
        <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl mx-auto mb-2"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          {initials}
        </div>
        <p className="text-sm font-semibold text-white leading-tight">{displayName}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Desde {format(new Date(client.created_at), 'MMM yyyy')}
        </p>
      </div>

      {/* Alergias */}
      {profile?.allergies && (
        <div className="rounded-lg border border-red-500 bg-red-500/10 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Alergias</span>
          </div>
          <p className="text-xs text-red-300 leading-snug">{profile.allergies}</p>
        </div>
      )}

      {/* Ciclo */}
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Ciclo actual</p>
        <Select
          value={profile?.goal_cycle ?? 'definition'}
          onValueChange={v => onSaveProfile({ goal_cycle: v as GoalCycle })}
        >
          <SelectTrigger className="h-7 border-0 bg-transparent p-0 text-amber-400 font-bold text-sm focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="definition">🔥 Definición</SelectItem>
            <SelectItem value="bulk">💪 Volumen</SelectItem>
            <SelectItem value="recomp">⚖️ Recomposición</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas clave (last recorded — read only, from fitness_metrics) */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'Peso', value: null, color: '#f59e0b', unit: 'kg', field: 'weight' },
          { label: '% Grasa', value: null, color: '#10b981', unit: '%', field: 'fat' },
          { label: 'Músculo', value: null, color: '#6366f1', unit: 'kg', field: 'muscle' },
          { label: 'IMC', value: null, color: '#94a3b8', unit: '', field: 'bmi' },
        ].map(m => (
          <div key={m.field} className="rounded-md bg-slate-900 px-2 py-1.5 text-center">
            <p className="text-xs font-bold" style={{ color: m.color }}>—</p>
            <p className="text-[9px] text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Macros objetivo */}
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Objetivo diario</p>
        <p className="text-sm font-bold text-white">{profile?.kcal_target ?? '—'} kcal</p>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">P {profile?.protein_g ?? '—'}g</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">C {profile?.carbs_g ?? '—'}g</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">G {profile?.fat_g ?? '—'}g</span>
        </div>
      </div>

      {/* Suscripción */}
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Suscripción</p>
        {daysLeft !== null ? (
          <>
            <p className="text-xs font-semibold" style={{ color: subColor }}>
              {daysLeft <= 0 ? '⚠ Vencida' : `✓ ${daysLeft} días restantes`}
            </p>
            <div className="h-1 rounded-full bg-slate-700 mt-1.5">
              <div className="h-1 rounded-full transition-all" style={{ width: `${subPct}%`, backgroundColor: subColor }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              Vence {format(parseISO(profile!.subscription_end!), 'dd MMM yyyy')}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Sin fecha configurada</p>
        )}
      </div>

      {/* Configurar perfil rápido */}
      <div className="rounded-lg bg-slate-800 px-3 py-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Config. perfil</p>
        <div className="flex flex-col gap-2">
          <Input
            type="number" placeholder="Kcal objetivo"
            defaultValue={profile?.kcal_target ?? ''}
            className="h-7 text-xs bg-slate-900 border-slate-700 text-white"
            onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v)) onSaveProfile({ kcal_target: v }); }}
          />
          <Input
            type="date" placeholder="Fin suscripción"
            defaultValue={profile?.subscription_end ?? ''}
            className="h-7 text-xs bg-slate-900 border-slate-700 text-white"
            onBlur={e => { if (e.target.value) onSaveProfile({ subscription_end: e.target.value }); }}
          />
          <Textarea
            placeholder="Alergias / intolerancias..."
            defaultValue={profile?.allergies ?? ''}
            className="text-xs bg-slate-900 border-slate-700 text-white resize-none"
            rows={2}
            onBlur={e => onSaveProfile({ allergies: e.target.value || null })}
          />
        </div>
      </div>

      {/* Info de contacto colapsable */}
      <button
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors px-1"
        onClick={() => setContactOpen(v => !v)}
      >
        {contactOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Info de contacto
      </button>
      {contactOpen && (
        <div className="rounded-lg bg-slate-800 px-3 py-2 flex flex-col gap-1 text-xs">
          {client.email && <p className="text-slate-300 truncate">📧 {client.email}</p>}
          {client.phone && <p className="text-slate-300">📞 {client.phone}</p>}
          {client.website && <p className="text-slate-400 truncate">🌐 {client.website.replace(/^https?:\/\//, '')}</p>}
          {!client.email && !client.phone && !client.website && (
            <p className="text-slate-500">Sin datos de contacto</p>
          )}
        </div>
      )}
    </div>
  );
}
