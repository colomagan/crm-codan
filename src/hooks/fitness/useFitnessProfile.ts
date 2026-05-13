import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ClientFitnessProfile, GoalCycle } from '@/types/fitness';

export function useFitnessProfile(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [profile, setProfile] = useState<ClientFitnessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('client_fitness_profile')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    setProfile(data as ClientFitnessProfile | null);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (updates: Partial<Omit<ClientFitnessProfile, 'id' | 'client_id' | 'user_id' | 'created_at'>>) => {
    if (!userId) return;
    if (profile) {
      const { error } = await supabase
        .from('client_fitness_profile')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) { toast.error('No se pudo guardar el perfil.'); return; }
    } else {
      const { error } = await supabase
        .from('client_fitness_profile')
        .insert({ client_id: clientId, user_id: userId, ...updates });
      if (error) { toast.error('No se pudo crear el perfil.'); return; }
    }
    toast.success('Perfil actualizado.');
    fetch();
  };

  return { profile, loading, refetch: fetch, save };
}
