import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { StrengthRecord, WorkoutPlan, WorkoutExercise } from '@/types/fitness';

export function useTraining(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [records, setRecords] = useState<StrengthRecord[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [r, p] = await Promise.all([
      supabase.from('strength_records').select('*').eq('client_id', clientId).order('recorded_at', { ascending: false }),
      supabase.from('workout_plans').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    ]);
    const planList = (p.data as WorkoutPlan[]) ?? [];
    setRecords((r.data as StrengthRecord[]) ?? []);
    setPlans(planList);
    const activePlan = planList.find(pl => pl.active);
    if (activePlan) {
      const { data: ex } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('plan_id', activePlan.id)
        .order('day').order('order');
      setExercises((ex as WorkoutExercise[]) ?? []);
    } else {
      setExercises([]);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const saveRecord = async (entry: Omit<StrengthRecord, 'id' | 'client_id' | 'user_id' | 'created_at'>) => {
    if (!userId) return;
    const { error } = await supabase.from('strength_records').insert({ ...entry, client_id: clientId, user_id: userId });
    if (error) { toast.error('No se pudo guardar el PR.'); return; }
    toast.success('PR registrado.');
    fetch();
  };

  const createPlan = async (name: string) => {
    if (!userId) return;
    await supabase.from('workout_plans').update({ active: false }).eq('client_id', clientId);
    const { error } = await supabase.from('workout_plans').insert({ client_id: clientId, user_id: userId, name, active: true });
    if (error) { toast.error('No se pudo crear el plan.'); return; }
    toast.success('Plan creado.');
    fetch();
  };

  const saveExercise = async (ex: Omit<WorkoutExercise, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('workout_exercises').insert(ex);
    if (error) { toast.error('No se pudo guardar el ejercicio.'); return; }
    fetch();
  };

  const updateExercise = async (id: string, updates: Partial<WorkoutExercise>) => {
    const { error } = await supabase.from('workout_exercises').update(updates).eq('id', id);
    if (error) { toast.error('No se pudo actualizar.'); }
    else { fetch(); }
  };

  const deleteExercise = async (id: string) => {
    await supabase.from('workout_exercises').delete().eq('id', id);
    fetch();
  };

  const activePlan = plans.find(p => p.active) ?? null;
  const days = [...new Set(exercises.map(e => e.day))].sort();

  return { records, plans, exercises, activePlan, days, loading, refetch: fetch, saveRecord, createPlan, saveExercise, updateExercise, deleteExercise };
}
