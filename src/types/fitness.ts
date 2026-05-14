export type GoalCycle = 'definition' | 'bulk' | 'recomp';

export interface ClientFitnessProfile {
  id: string;
  client_id: string;
  user_id: string;
  goal_cycle: GoalCycle;
  kcal_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  allergies: string | null;
  injuries: string | null;
  subscription_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface FitnessMetric {
  id: string;
  client_id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  client_id: string;
  user_id: string;
  date: string;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  bicep_l: number | null;
  bicep_r: number | null;
  waist: number | null;
  hips: number | null;
  thigh_l: number | null;
  thigh_r: number | null;
  calf_l: number | null;
  calf_r: number | null;
  created_at: string;
}

export type BodyZone = keyof Omit<BodyMeasurement, 'id' | 'client_id' | 'user_id' | 'date' | 'created_at'>;

export const BODY_ZONES: { key: BodyZone; label: string; type: 'fat' | 'muscle' | 'neutral' }[] = [
  { key: 'neck',      label: 'Cuello',        type: 'fat' },
  { key: 'shoulders', label: 'Hombros',       type: 'muscle' },
  { key: 'chest',     label: 'Pecho',         type: 'muscle' },
  { key: 'bicep_l',   label: 'Bícep Izq.',    type: 'muscle' },
  { key: 'bicep_r',   label: 'Bícep Der.',    type: 'muscle' },
  { key: 'waist',     label: 'Cintura',       type: 'fat' },
  { key: 'hips',      label: 'Cadera',        type: 'fat' },
  { key: 'thigh_l',   label: 'Muslo Izq.',    type: 'muscle' },
  { key: 'thigh_r',   label: 'Muslo Der.',    type: 'muscle' },
  { key: 'calf_l',    label: 'Gemelo Izq.',   type: 'muscle' },
  { key: 'calf_r',    label: 'Gemelo Der.',   type: 'muscle' },
];

export interface CheckInPhoto {
  id: string;
  client_id: string;
  user_id: string;
  folder_date: string;
  photo_url: string;
  storage_path: string | null;
  label: string | null;
  notes: string | null;
  created_at: string;
}

export interface CheckInFolder {
  id: string;
  client_id: string;
  user_id: string;
  folder_date: string;
  notes: string | null;
  created_at: string;
}

export interface WeeklyCheckin {
  id: string;
  client_id: string;
  user_id: string;
  week_date: string;
  sleep_score: number;
  hunger_score: number;
  stress_score: number;
  adherence_score: number;
  notes: string | null;
  created_at: string;
}

export interface StrengthRecord {
  id: string;
  client_id: string;
  user_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  estimated_1rm: number;
  recorded_at: string;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  active: boolean;
  google_sheet_url: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  plan_id: string;
  day: string;
  order: number;
  name: string;
  sets: number;
  reps: string;
  rpe_rir: string | null;
  rest_sec: number | null;
  video_url: string | null;
  created_at: string;
}

export interface NutritionPlan {
  id: string;
  client_id: string;
  user_id: string;
  name: string;
  kcal_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  active: boolean;
  created_at: string;
  pdf_url: string | null;
}

export interface NutritionMeal {
  id: string;
  plan_id: string;
  name: string;
  time: string | null;
  order: number;
  created_at: string;
  items?: NutritionItem[];
}

export interface NutritionItem {
  id: string;
  meal_id: string;
  ingredient: string;
  qty: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}
