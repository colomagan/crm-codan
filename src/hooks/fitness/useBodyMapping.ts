import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { BodyMeasurement } from '@/types/fitness';

export function useBodyMapping(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });
    setMeasurements((data as BodyMeasurement[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (entry: Omit<BodyMeasurement, 'id' | 'client_id' | 'user_id' | 'created_at'>) => {
    if (!userId) return;
    const { error } = await supabase
      .from('body_measurements')
      .insert({ ...entry, client_id: clientId, user_id: userId });
    if (error) { toast.error('No se pudo guardar las medidas.'); return; }
    toast.success('Medidas registradas.');
    fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('body_measurements').delete().eq('id', id);
    if (error) { toast.error('No se pudo eliminar.'); return; }
    fetch();
  };

  return { measurements, loading, refetch: fetch, save, remove };
}
