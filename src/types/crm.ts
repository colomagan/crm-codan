// ─── Shared ──────────────────────────────────────────────────────────────────
export type Channel = 'WhatsApp' | 'Email' | 'Instagram' | 'Phone';
export type Source = 'Instagram' | 'Web' | 'Referral' | 'Manual' | 'Lead Finder' | 'Other';

// ─── Leads (uncontacted prospects) ───────────────────────────────────────────
export interface Lead {
  id: string;
  user_id: string;
  business_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  job_title: string | null;
  industry: string | null;
  headline: string | null;
  seniority_level: string | null;
  company_linkedin: string | null;
  functional_area: string | null;
  company_domain: string | null;
  company_founded_year: string | null;
  company_city: string | null;
  company_country: string | null;
  // body
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  // measurements (cm)
  neck_cm: number | null;
  shoulders_cm: number | null;
  chest_cm: number | null;
  bicep_l_cm: number | null;
  bicep_r_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  thigh_l_cm: number | null;
  thigh_r_cm: number | null;
  calf_l_cm: number | null;
  calf_r_cm: number | null;
  // nutrition
  kcal_current: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_liters: number | null;
  supplements: string | null;
  source: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  category: string | null;
  notes: string | null;
  google_maps_url: string | null;
  score: number | null;
  reviews_count: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Contacts (leads we have contacted) ──────────────────────────────────────
export type ContactType = 'CLIENT' | 'LEAD_CONTACTED' | 'LEAD_NOT_CONTACTED';

export interface Contact {
  id: string;
  user_id: string;
  type: ContactType;
  business_name: string;
  first_name: string;
  last_name: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  job_title: string | null;
  industry: string | null;
  headline: string | null;
  seniority_level: string | null;
  company_linkedin: string | null;
  functional_area: string | null;
  company_domain: string | null;
  company_founded_year: string | null;
  company_city: string | null;
  company_country: string | null;
  // body
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  // measurements (cm)
  neck_cm: number | null;
  shoulders_cm: number | null;
  chest_cm: number | null;
  bicep_l_cm: number | null;
  bicep_r_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  thigh_l_cm: number | null;
  thigh_r_cm: number | null;
  calf_l_cm: number | null;
  calf_r_cm: number | null;
  // nutrition
  kcal_current: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_liters: number | null;
  supplements: string | null;
  labels: string[];
  last_contact_date: string | null;
  channel: Channel | null;
  notes: string | null;
  source: Source | null;
  country_code: string | null;
  country_name: string | null;
  province: string | null;
  city: string | null;
  category: string | null;
  google_maps_url: string | null;
  score: number | null;
  reviews_count: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Clients (confirmed customers) ───────────────────────────────────────────
export type ClientStatus = 'active' | 'inactive' | 'paused';

export interface CrmClient {
  id: string;
  user_id: string;
  business_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string | null;
  notes: string | null;
  status: ClientStatus;
  city: string | null;
  category: string | null;
  country_code: string | null;
  labels: string[];
  channel: string | null;
  google_maps_url: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export type TransactionKind = 'revenue' | 'expense';
export type TransactionStatus = 'paid' | 'pending';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  kind: TransactionKind;
  status: TransactionStatus;
  client_id?: string;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
}

// ─── Revenues ────────────────────────────────────────────────────────────────
export type RevenueStatus = 'paid' | 'pending' | 'cancelled';

export interface RevenueItem {
  id: string;
  revenue_id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Revenue {
  id: string;
  user_id: string;
  client_id: string;
  date: string;
  status: RevenueStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  client?: Pick<CrmClient, 'id' | 'business_name' | 'first_name' | 'last_name'>;
  items?: RevenueItem[];
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export type ExpenseStatus = 'paid' | 'pending' | 'cancelled';

export interface ExpenseItem {
  id: string;
  expense_id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  date: string;
  status: ExpenseStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items?: ExpenseItem[];
}

// ─── Sales Opportunities ──────────────────────────────────────────────────────
export type OpportunityValueType = 'one_time' | 'monthly';

export interface SalesOpportunity {
  id: string;
  user_id: string;
  lead_id: string | null;
  contact_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  color: string;
  value: number | null;
  value_type: OpportunityValueType | null;
  created_at: string;
  updated_at: string;
}
