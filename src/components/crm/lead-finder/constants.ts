import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import React from 'react';
import type { SearchStatus } from './types';

export const BRAND = 'hsl(38, 60%, 50%)';

export const PLAN_PRICES: Record<string, number> = {
  'Plan 1': 49, 'Starter': 49,
  'Plan 2': 99, 'Growth': 99,
  'Plan 3': 179,
  'Plan 4': 199, 'Enterprise': 199,
};

export const PLANS_CARDS = [
  { tag: 'Starter',      name: 'Plan 1', price: '€49',     leads: '500 leads · ~€0.10/lead',       popular: false, enterprise: false },
  { tag: 'Growth',       name: 'Plan 2', price: '€99',     leads: '1,500 leads · ~€0.07/lead',     popular: false, enterprise: false },
  { tag: 'Most popular', name: 'Plan 3', price: '€179',    leads: '4,000 leads · ~€0.045/lead',    popular: true,  enterprise: false },
  { tag: 'Enterprise',   name: 'Plan 4', price: '€199/mo', leads: '3,000 leads/mo · +€249 setup',  popular: false, enterprise: true  },
];

export const ENRICHMENT_TABLE = [
  { plan: 'Plan 1', popular: false, basic: { price: '€49',     tpl: '1 token/lead'   }, email: { price: '€79',     tpl: '1.6 tokens/lead' }, phone: { price: '€119',    tpl: '2.4 tokens/lead' } },
  { plan: 'Plan 2', popular: false, basic: { price: '€99',     tpl: '1 token/lead'   }, email: { price: '€159',    tpl: '1.6 tokens/lead' }, phone: { price: '€239',    tpl: '2.4 tokens/lead' } },
  { plan: 'Plan 3', popular: true,  basic: { price: '€179',    tpl: '1 token/lead'   }, email: { price: '€289',    tpl: '1.6 tokens/lead' }, phone: { price: '€429',    tpl: '2.4 tokens/lead' } },
  { plan: 'Plan 4', popular: false, basic: { price: '€199/mo', tpl: '1 token/lead'   }, email: { price: '€319/mo', tpl: '1.6 tokens/lead' }, phone: { price: '€479/mo', tpl: '2.4 tokens/lead' } },
];

export const TOKEN  = import.meta.env.VITE_AIRES_FINDER_TOKEN as string;
export const ACTOR  = (import.meta.env.VITE_AIRES_FINDER_ACTOR as string) || 'compass/crawler-google-places';
export const ACTOR2 = (import.meta.env.VITE_AIRES_FINDER_ACTOR2 as string) || 'danube-home/linkedin-scraper-light';

export const REVENUE_OPTIONS = ['100K', '500K', '1M', '5M', '10M', '25M', '50M', '100M', '500M', '1B', '5B', '10B'];
export const SENIORITY_OPTIONS = ['Owner', 'Founder', 'C-Suite', 'Partner', 'VP', 'Head', 'Director', 'Manager', 'Senior', 'Entry', 'Training'];
export const FUNCTIONAL_OPTIONS = ['Sales', 'Marketing', 'Finance', 'Human Resources', 'Information Technology', 'Operations', 'Engineering', 'Business Development', 'Legal', 'Education', 'Customer Success', 'Product Management', 'Design', 'Consulting', 'Administrative'];
export const EMAIL_STATUS_OPTIONS = ['validated', 'not_validated', 'unknown'];
export const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
export const FUNDING_OPTIONS = ['Seed', 'Angel', 'Series A', 'Series B', 'Series C', 'Series D', 'Venture', 'Private Equity', 'Debt Financing', 'Post-IPO', 'Grant'];

export const COLUMNS = [
  { key: 'title',        label: 'Place Name' },
  { key: 'totalScore',   label: 'Score' },
  { key: 'reviewsCount', label: 'Reviews' },
  { key: 'street',       label: 'Street' },
  { key: 'city',         label: 'City' },
  { key: 'state',        label: 'State' },
  { key: 'countryCode',  label: 'Country' },
  { key: 'website',      label: 'Website' },
  { key: 'phone',        label: 'Phone' },
  { key: 'categoryName', label: 'Category' },
  { key: 'categories',   label: 'Categories' },
  { key: 'url',          label: 'URL' },
] as const;

export const COLUMNS2 = [
  { key: 'fullName',    label: 'Name' },
  { key: 'jobTitle',    label: 'Job Title' },
  { key: 'companyName', label: 'Company' },
  { key: 'location',    label: 'Location' },
  { key: 'email',       label: 'Email' },
  { key: 'emailStatus', label: 'Email Status' },
  { key: 'phone',       label: 'Phone' },
  { key: 'industry',    label: 'Industry' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
] as const;

export const STATUS_CONFIG: Record<SearchStatus, { icon: React.ReactNode; badge: string }> = {
  success: {
    icon: React.createElement(CheckCircle2, { className: 'w-4 h-4 text-emerald-500' }),
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  error: {
    icon: React.createElement(XCircle, { className: 'w-4 h-4 text-red-500' }),
    badge: 'bg-red-50 text-red-700 border border-red-200',
  },
  pending: {
    icon: React.createElement(Clock, { className: 'w-4 h-4 text-amber-500' }),
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
};
