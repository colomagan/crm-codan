export interface ScraperMeta {
  title: string;
  description: string;
  highlights: { label: string; variant?: 'default' | 'warning' | 'info' }[];
}

export interface Lead2Result {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  jobTitle?: string;
  title?: string;
  companyName?: string;
  company?: string;
  location?: string;
  city?: string;
  country?: string;
  linkedinUrl?: string;
  linkedInUrl?: string;
  phone?: string;
  companySize?: string;
  industry?: string;
  website?: string;
  emailStatus?: string;
  seniority?: string;
  seniorityLevel?: string;
  revenue?: string;
}

export interface LeadResult {
  title?: string;
  totalScore?: number;
  reviewsCount?: number;
  street?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  website?: string;
  phone?: string;
  categories?: string[];
  categoryName?: string;
  url?: string;
  name?: string;
  email?: string;
  address?: string;
}

export type SearchStatus = 'pending' | 'success' | 'error';

export interface Scraper2Filters {
  label: string;
  totalLeads: number;
  jobTitles: string[];
  notJobTitles: string[];
  seniority: string[];
  functional: string[];
  locations: string[];
  cities: string[];
  notLocations: string[];
  notCities: string[];
  emailStatus: string[];
  domains: string[];
  companySizes: string[];
  industries: string[];
  notIndustries: string[];
  keywords: string[];
  notKeywords: string[];
  minRevenue: string;
  maxRevenue: string;
  funding: string[];
}

export interface Scraper2Meta {
  __meta: true;
  scraper_type: 'scraper2';
  apify_run_id: string | null;
  started_at: string;
  estimated_seconds: number;
  estimated_ready_at: string;
  filters: Scraper2Filters;
}

export interface SearchEntry {
  id: string;
  keyword: string;
  location: string | null;
  max_results: number;
  status: SearchStatus;
  result_count: number;
  results: (LeadResult | Lead2Result | Scraper2Meta)[];
  error_message: string | null;
  created_at: string;
  imported_indices: number[];
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_credits: number;
  features: string[];
}

export interface UserCredits {
  credits_used: number;
  credits_total: number;
  reset_date: string | null;
  plan: Plan | null;
}
