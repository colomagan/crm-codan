import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { LeadResult, Lead2Result } from './types';

export function getPortugalHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10
  );
}

export function formatPortugalTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function computeEstimatedReadyAt(): { estimatedReadyAt: string; hoursNeeded: number } {
  const hour = getPortugalHour();
  const inBusinessHours = hour >= 9 && hour < 23;
  const hoursNeeded = inBusinessHours ? 2 : 5;
  const readyAt = new Date(Date.now() + hoursNeeded * 60 * 60 * 1000);
  return { estimatedReadyAt: readyAt.toISOString(), hoursNeeded };
}

export function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return 'Ready soon…';
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  const s = Math.floor((remainingMs % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatHistDate(dateStr: string): string {
  const d    = new Date(dateStr);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return `Today, ${format(d, 'HH:mm')}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${format(d, 'HH:mm')}`;
  return format(d, 'dd MMM · HH:mm');
}

export function toRows(results: LeadResult[]) {
  return results.map((r) => ({
    'Place Name':    r.title || r.name || '',
    'Total Score':   r.totalScore ?? '',
    'Reviews Count': r.reviewsCount ?? '',
    'Street':        r.street || '',
    'City':          r.city || '',
    'State':         r.state || '',
    'Country Code':  r.countryCode || '',
    'Website':       r.website || '',
    'Phone':         r.phone || '',
    'Category Name': r.categoryName || '',
    'Categories':    Array.isArray(r.categories) ? r.categories.join(', ') : '',
    'URL':           r.url || '',
  }));
}

export function toRows2(list: Lead2Result[]) {
  return list.map((r) => ({
    'Name':         r.fullName || r.name || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || '',
    'Job Title':    r.jobTitle || r.title || '',
    'Company':      r.companyName || r.company || '',
    'Location':     r.location || [r.city, r.country].filter(Boolean).join(', ') || '',
    'Email':        r.email || '',
    'Email Status': r.emailStatus || '',
    'Phone':        r.phone || '',
    'Industry':     r.industry || '',
    'LinkedIn URL': r.linkedinUrl || r.linkedInUrl || '',
    'Seniority':    r.seniority || r.seniorityLevel || '',
    'Company Size': r.companySize || '',
    'Website':      r.website || '',
  }));
}

export function exportCSV(results: LeadResult[], filename: string) {
  const rows = toRows(results);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = String(r[h as keyof typeof r] ?? '');
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV2(results: Lead2Result[], filename: string) {
  const rows = toRows2(results);
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = String(r[h as keyof typeof r] ?? '');
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function exportExcel(results: LeadResult[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(toRows(results));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportExcel2(results: Lead2Result[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(toRows2(results));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function normalizeLinkedInItem(item: Record<string, unknown>): Lead2Result {
  const s = (k: string) => String(item[k] ?? '') || '';
  return {
    firstName:      s('firstName') || s('first_name') || (s('name') || s('profile_name')).split(' ')[0] || '',
    lastName:       s('lastName')  || s('last_name')  || (s('name') || s('profile_name')).split(' ').slice(1).join(' ') || '',
    fullName:       s('fullName')  || s('full_name')  || s('name') || s('profile_name'),
    name:           s('name')      || s('profile_name') || s('fullName'),
    email:          s('email')     || s('emailAddress') || s('email_address'),
    emailStatus:    s('emailStatus') || s('email_status'),
    phone:          s('phone')     || s('mobile_number') || s('phoneNumber') || s('phone_number'),
    jobTitle:       s('jobTitle')  || s('job_title') || s('headline') || s('position'),
    title:          s('title')     || s('jobTitle')  || s('headline'),
    companyName:    s('companyName') || s('company_name') || s('company') || s('current_company'),
    company:        s('company')   || s('current_company') || s('companyName'),
    location:       s('location')  || [s('city'), s('country')].filter(Boolean).join(', '),
    city:           s('city'),
    country:        s('country')   || s('countryCode') || s('country_code'),
    linkedinUrl:    s('linkedinUrl') || s('linkedin') || s('linkedin_url') || s('linkedInUrl') || s('profile_url'),
    linkedInUrl:    s('linkedinUrl') || s('linkedin') || s('linkedin_url') || s('profile_url'),
    industry:       s('industry')  || s('industryName') || s('industry_name'),
    companySize:    s('companySize') || s('company_size') || s('size'),
    website:        s('website')   || s('companyWebsite') || s('company_website'),
    seniority:      s('seniority') || s('seniorityLevel') || s('seniority_level'),
    seniorityLevel: s('seniority') || s('seniorityLevel') || s('seniority_level'),
    revenue:        s('revenue')   || s('annual_revenue') || s('company_annual_revenue') || s('company_revenue'),
  };
}
