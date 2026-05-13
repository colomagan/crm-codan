import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CrmClient, ClientStatus } from '@/types/crm';
import { LeftPanel } from '@/components/fitness/LeftPanel';
import { MetricsTab } from '@/components/fitness/tabs/MetricsTab';
import { BodyMappingTab } from '@/components/fitness/tabs/BodyMappingTab';
import { CheckInsTab } from '@/components/fitness/tabs/CheckInsTab';
import { TrainingTab } from '@/components/fitness/tabs/TrainingTab';
import { NutritionTab } from '@/components/fitness/tabs/NutritionTab';
import { useFitnessProfile } from '@/hooks/fitness/useFitnessProfile';

type Tab = 'metrics' | 'body' | 'checkins' | 'training' | 'nutrition';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'metrics',   label: 'Métricas',       icon: '📊' },
  { id: 'body',      label: 'Cuerpo',          icon: '🫀' },
  { id: 'checkins',  label: 'Check-ins',       icon: '📸' },
  { id: 'training',  label: 'Entrenamiento',   icon: '💪' },
  { id: 'nutrition', label: 'Nutrición',       icon: '🥗' },
];

const STATUS_COLORS: Record<ClientStatus, string> = {
  active:   '#10b981',
  inactive: '#64748b',
  paused:   '#f59e0b',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-transparent border-t-indigo-500 border-r-indigo-500/40" />
      </div>
    );
  }

  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim() || 'Sin nombre';
  const statusColor = STATUS_COLORS[client.status];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020617' }}>
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white leading-tight">{displayName}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}15` }}>
                ● {client.status === 'active' ? 'Activo' : client.status === 'paused' ? 'Pausado' : 'Inactivo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-52 flex-shrink-0 border-r border-slate-800 bg-slate-950 px-3 py-4 overflow-y-auto">
          <LeftPanel client={client} profile={profile} onSaveProfile={saveProfile} />
        </div>

        {/* RIGHT: TABS + CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-slate-800 bg-slate-950 px-4 flex gap-0.5 flex-shrink-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3 text-xs font-medium transition-colors relative flex items-center gap-1.5"
                style={activeTab === tab.id
                  ? { color: '#6366f1' }
                  : { color: '#475569' }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto bg-slate-950">
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
