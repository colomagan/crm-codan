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

type Tab = 'metrics' | 'body' | 'checkins' | 'training' | 'nutrition';

const TABS: { id: Tab; label: string }[] = [
  { id: 'metrics',   label: 'Métricas' },
  { id: 'body',      label: 'Cuerpo' },
  { id: 'checkins',  label: 'Check-ins' },
  { id: 'training',  label: 'Entrenamiento' },
  { id: 'nutrition', label: 'Nutrición' },
];

const STATUS_COLORS: Record<ClientStatus, string> = {
  active:   '#10b981',
  inactive: '#64748b',
  paused:   '#f59e0b',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  active:   'Activo',
  inactive: 'Inactivo',
  paused:   'Pausado',
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [client, setClient] = useState<CrmClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('metrics');

  const { profile, save: saveProfile } = useFitnessProfile(id ?? '');

  useEffect(() => {
    if (!id) return;
    supabase.from('clients').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast.error('Cliente no encontrado'); navigate(-1); return; }
      setClient(data as CrmClient);
      setLoading(false);
    });
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!client) return;
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) toast.error('No se pudo eliminar.');
    else { toast.success('Cliente eliminado.'); navigate(-1); }
  };

  if (loading || !client) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `4px solid transparent`,
            borderTopColor: T.accent,
            borderRightColor: `${T.accent}40`,
          }}
        />
      </div>
    );
  }

  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim() || 'Sin nombre';
  const statusColor = STATUS_COLORS[client.status];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* TOP BAR */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', gap: 16,
        background: T.bg, borderBottom: `1px solid ${T.border}`,
      }}>
        {/* Left: back + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.text3, flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: T.text3 }}>Clientes</span>
            <span style={{ fontSize: 13, color: T.text4 }}>/</span>
            <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{displayName}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
              background: `${statusColor}15`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
              {STATUS_LABELS[client.status]}
            </span>
          </div>
        </div>

        {/* Right: icon buttons + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Message icon */}
          <button style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text3 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {/* Phone icon */}
          <button style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text3 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14 19.79 19.79 0 0 1 1.61 5.44 2 2 0 0 1 3.6 3.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>
          {/* More icon */}
          <button style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text3 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>

          <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

          <button style={{
            height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, cursor: 'pointer',
          }}>
            Exportar informe
          </button>

          <button style={{
            height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: T.accent, border: 'none', color: T.accentInk, cursor: 'pointer',
          }}>
            Nuevo registro
          </button>

          <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

          {/* Delete — danger ghost */}
          <button
            onClick={() => setDeleteOpen(true)}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: `1px solid transparent`, color: T.danger, cursor: 'pointer',
            }}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, overflow: 'hidden' }}>

        {/* SIDEBAR */}
        <div style={{
          borderRight: `1px solid ${T.border}`,
          padding: '24px 20px',
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          background: T.bg,
        }}>
          <LeftPanel client={client} profile={profile} onSaveProfile={saveProfile} />
        </div>

        {/* MAIN: tab bar + content */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            position: 'sticky', top: 64, zIndex: 4,
            background: T.bg, borderBottom: `1px solid ${T.border}`,
            display: 'flex', gap: 4, padding: '0 28px', flexShrink: 0,
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 14px',
                  fontSize: 13, fontWeight: 500,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: activeTab === tab.id ? T.text : T.text3,
                  borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
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
