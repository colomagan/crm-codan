import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { NutritionPlan, NutritionMeal, NutritionItem } from '@/types/fitness';

export function useNutrition(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [meals, setMeals] = useState<NutritionMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data: plans } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .maybeSingle();
    const activePlan = plans as NutritionPlan | null;
    setPlan(activePlan);
    if (activePlan) {
      const { data: mealData } = await supabase
        .from('nutrition_meals')
        .select('*, items:nutrition_items(*)')
        .eq('plan_id', activePlan.id)
        .order('order');
      setMeals((mealData as NutritionMeal[]) ?? []);
    } else {
      setMeals([]);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const createPlan = async (name: string, kcal: number, protein: number, carbs: number, fat: number) => {
    if (!userId) return;
    await supabase.from('nutrition_plans').update({ active: false }).eq('client_id', clientId);
    const { error } = await supabase.from('nutrition_plans').insert({
      client_id: clientId, user_id: userId, name,
      kcal_target: kcal, protein_g: protein, carbs_g: carbs, fat_g: fat, active: true,
    });
    if (error) { toast.error('No se pudo crear el plan.'); return; }
    toast.success('Plan nutricional creado.');
    fetch();
  };

  const addMeal = async (name: string, time: string) => {
    if (!plan) return;
    const order = meals.length;
    const { error } = await supabase.from('nutrition_meals').insert({ plan_id: plan.id, name, time, order });
    if (error) { toast.error('No se pudo agregar la comida.'); return; }
    fetch();
  };

  const deleteMeal = async (id: string) => {
    await supabase.from('nutrition_meals').delete().eq('id', id);
    fetch();
  };

  const addItem = async (mealId: string, item: Omit<NutritionItem, 'id' | 'meal_id' | 'created_at'>) => {
    const { error } = await supabase.from('nutrition_items').insert({ ...item, meal_id: mealId });
    if (error) { toast.error('No se pudo agregar el ingrediente.'); return; }
    fetch();
  };

  const updateItem = async (id: string, updates: Partial<NutritionItem>) => {
    const { error } = await supabase.from('nutrition_items').update(updates).eq('id', id);
    if (error) { toast.error('No se pudo actualizar.'); }
    else { fetch(); }
  };

  const deleteItem = async (id: string) => {
    await supabase.from('nutrition_items').delete().eq('id', id);
    fetch();
  };

  return { plan, meals, loading, refetch: fetch, createPlan, addMeal, deleteMeal, addItem, updateItem, deleteItem };
}
