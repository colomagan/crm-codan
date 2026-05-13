import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { FitnessMetric } from '@/types/fitness';

export function useMetrics(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [metrics, setMetrics] = useState<FitnessMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('fitness_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
    setMetrics((data as FitnessMetric[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (entry: Omit<FitnessMetric, 'id' | 'client_id' | 'user_id' | 'created_at'>) => {
    if (!userId) return;
    const { error } = await supabase
      .from('fitness_metrics')
      .insert({ ...entry, client_id: clientId, user_id: userId });
    if (error) { toast.error('No se pudo guardar la medición.'); return; }
    toast.success('Medición registrada.');
    fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('fitness_metrics').delete().eq('id', id);
    if (error) { toast.error('No se pudo eliminar.'); return; }
    fetch();
  };

  return { metrics, loading, refetch: fetch, save, remove };
}
