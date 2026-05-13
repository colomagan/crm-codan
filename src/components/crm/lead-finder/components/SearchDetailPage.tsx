import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, MapPin, Briefcase, Building2, Globe,
  Mail, TrendingUp, Tag, Search, CalendarClock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BRAND } from '../constants';
import { normalizeLinkedInItem } from '../utils';
import { LinkedInPendingTimer } from './LinkedInPendingTimer';
import { ResultsTable } from './ResultsTable';
import { Results2Table } from './Results2Table';
import type { SearchEntry, LeadResult, Lead2Result, Scraper2Meta, Scraper2Filters } from '../types';

// ── Filter pills ────────────────────────────────────────────────────────────
function FilterPills({ icon, label, values, color = BRAND }: {
  icon: React.ReactNode; label: string; values: string[]; color?: string;
}) {
  if (!values.length) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span style={{ color }} className="opacity-60">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="text-xs px-2.5 py-1 rounded-full border font-medium"
            style={{ backgroundColor: `${color}10`, borderColor: `${color}30`, color }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExcludePills({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="text-xs px-2.5 py-1 rounded-full border font-medium bg-red-50 border-red-200 text-red-500 line-through opacity-70">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function LinkedInFilters({ f }: { f: Scraper2Filters }) {
  const hasContact = !!(
    f.jobTitles.length || f.notJobTitles.length || f.seniority.length ||
    f.functional.length || f.locations.length || f.cities.length ||
    f.notLocations.length || f.notCities.length || f.emailStatus.length
  );
  const hasCompany = !!(
    f.domains.length || f.companySizes.length || f.industries.length ||
    f.notIndustries.length || f.keywords.length || f.notKeywords.length ||
    f.minRevenue || f.maxRevenue || f.funding.length
  );

  if (!hasContact && !hasCompany) {
    return (
      <div className="px-5 py-6 text-center text-sm text-muted-foreground">
        No filters applied — broad LinkedIn search.
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-6">
      {hasContact && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-2" style={{ borderColor: `${BRAND}10` }}>
            Contact Filters
          </p>
          <FilterPills icon={<Briefcase className="w-3.5 h-3.5" />} label="Include job titles" values={f.jobTitles} />
          <ExcludePills label="Exclude job titles" values={f.notJobTitles} />
          <FilterPills icon={<TrendingUp className="w-3.5 h-3.5" />} label="Seniority" values={f.seniority} />
          <FilterPills icon={<Tag className="w-3.5 h-3.5" />} label="Functional area" values={f.functional} />
          <FilterPills icon={<MapPin className="w-3.5 h-3.5" />} label="Include locations" values={f.locations} />
          <FilterPills icon={<MapPin className="w-3.5 h-3.5" />} label="Include cities" values={f.cities} />
          <ExcludePills label="Exclude locations" values={f.notLocations} />
          <ExcludePills label="Exclude cities" values={f.notCities} />
          <FilterPills icon={<Mail className="w-3.5 h-3.5" />} label="Email status" values={f.emailStatus} />
        </div>
      )}
      {hasCompany && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b pb-2" style={{ borderColor: `${BRAND}10` }}>
            Company Filters
          </p>
          <FilterPills icon={<Globe className="w-3.5 h-3.5" />} label="Domains" values={f.domains} />
          <FilterPills icon={<Building2 className="w-3.5 h-3.5" />} label="Company size" values={f.companySizes} />
          <FilterPills icon={<Tag className="w-3.5 h-3.5" />} label="Include industries" values={f.industries} />
          <ExcludePills label="Exclude industries" values={f.notIndustries} />
          <FilterPills icon={<Tag className="w-3.5 h-3.5" />} label="Include keywords" values={f.keywords} />
          <ExcludePills label="Exclude keywords" values={f.notKeywords} />
          <FilterPills icon={<TrendingUp className="w-3.5 h-3.5" />} label="Funding round" values={f.funding} />
          {(f.minRevenue || f.maxRevenue) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Revenue range</p>
              <span className="inline-block text-xs px-2.5 py-1 rounded-full border font-medium"
                style={{ backgroundColor: `${BRAND}10`, borderColor: `${BRAND}30`, color: BRAND }}>
                {f.minRevenue || '—'} → {f.maxRevenue || '—'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Props ───────────────────────────────────────────────────────────────────
interface SearchDetailPageProps {
  entry: SearchEntry;
  userId: string;
  onBack: () => void;
  // Persistence helpers passed from parent
  persistImportIndex: (searchId: string, index: number) => Promise<void>;
  setHistory: React.Dispatch<React.SetStateAction<SearchEntry[]>>;
  buildLeadPayload: (lead: LeadResult) => Record<string, unknown>;
  buildLead2Payload: (lead: Lead2Result) => Record<string, unknown>;
}

// ── Main component ──────────────────────────────────────────────────────────
export function SearchDetailPage({
  entry,
  userId,
  onBack,
  persistImportIndex,
  setHistory,
  buildLeadPayload,
  buildLead2Payload,
}: SearchDetailPageProps) {
  const [importedIds, setImportedIds]     = useState<Set<number>>(new Set(entry.imported_indices ?? []));
  const [importingAll, setImportingAll]   = useState(false);

  const isLinkedIn = entry.keyword.startsWith('[LinkedIn]');
  const isPending  = entry.status === 'pending';
  const label      = isLinkedIn ? entry.keyword.replace('[LinkedIn] ', '') : entry.keyword;
  const createdAt  = format(new Date(entry.created_at), "dd MMM yyyy 'at' HH:mm");

  // Extract meta for LinkedIn entries
  const meta = isLinkedIn && entry.results.length > 0
    ? (entry.results[0] as unknown as Scraper2Meta)
    : null;
  const hasValidMeta = meta?.__meta === true && !!meta.estimated_ready_at;
  const filters: Scraper2Filters | null = hasValidMeta && meta.filters ? meta.filters : null;

  // Normalize LinkedIn results: strip meta sentinel, convert snake_case → Lead2Result
  const linkedInLeads: Lead2Result[] = isLinkedIn
    ? entry.results
        .filter((r) => !(r as unknown as Record<string, unknown>).__meta)
        .map((r) => normalizeLinkedInItem(r as unknown as Record<string, unknown>))
    : [];

  // ── Import handlers ──
  const handleImportGP = async (lead: LeadResult, index: number) => {
    const { error } = await supabase.from('leads').insert(buildLeadPayload(lead));
    if (error) { toast.error('Import failed.'); return; }
    toast.success(`${lead.title || lead.name || 'Lead'} imported.`);
    await persistImportIndex(entry.id, index);
    setImportedIds((prev) => new Set(prev).add(index));
    setHistory(prev => prev.map(e => e.id === entry.id
      ? { ...e, imported_indices: [...(e.imported_indices ?? []), index] } : e));
  };

  const handleImportAllGP = async () => {
    const leads = entry.results as LeadResult[];
    const pending = leads.map((l, i) => ({ l, i })).filter(({ i }) => !importedIds.has(i));
    if (!pending.length) { toast.info('All leads already imported.'); return; }
    setImportingAll(true);
    try {
      const { error } = await supabase.from('leads').insert(pending.map(({ l }) => buildLeadPayload(l)));
      if (error) throw error;
      const ids = new Set(importedIds);
      const allIdx = leads.map((_, i) => i);
      pending.forEach(({ i }) => ids.add(i));
      setImportedIds(ids);
      await supabase.from('lead_finder_searches').update({ imported_indices: allIdx }).eq('id', entry.id);
      setHistory(prev => prev.map(e => e.id === entry.id ? { ...e, imported_indices: allIdx } : e));
      toast.success(`${pending.length} leads imported.`);
    } catch { toast.error('Bulk import failed.'); }
    finally { setImportingAll(false); }
  };

  const handleImportLI = async (lead: Lead2Result, index: number) => {
    const { error } = await supabase.from('leads').insert(buildLead2Payload(lead));
    if (error) { toast.error('Import failed.'); return; }
    toast.success(`${lead.fullName || lead.name || 'Lead'} imported.`);
    await persistImportIndex(entry.id, index);
    setImportedIds((prev) => new Set(prev).add(index));
    setHistory(prev => prev.map(e => e.id === entry.id
      ? { ...e, imported_indices: [...(e.imported_indices ?? []), index] } : e));
  };

  const handleImportAllLI = async () => {
    const pending = linkedInLeads.map((l, i) => ({ l, i })).filter(({ i }) => !importedIds.has(i));
    if (!pending.length) { toast.info('All leads already imported.'); return; }
    setImportingAll(true);
    try {
      const { error } = await supabase.from('leads').insert(pending.map(({ l }) => buildLead2Payload(l)));
      if (error) throw error;
      const ids = new Set(importedIds);
      const allIdx = linkedInLeads.map((_, i) => i);
      pending.forEach(({ i }) => ids.add(i));
      setImportedIds(ids);
      await supabase.from('lead_finder_searches').update({ imported_indices: allIdx }).eq('id', entry.id);
      setHistory(prev => prev.map(e => e.id === entry.id ? { ...e, imported_indices: allIdx } : e));
      toast.success(`${pending.length} leads imported.`);
    } catch { toast.error('Bulk import failed.'); }
    finally { setImportingAll(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-1 text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-5 border-l" style={{ borderColor: `${BRAND}20` }} />
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: BRAND }}>
              {isLinkedIn ? '🔗' : '🗺️'} {label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <CalendarClock className="w-3 h-3" /> Submitted {createdAt}
              {entry.location && <><span className="opacity-40">·</span><MapPin className="w-3 h-3" />{entry.location}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isPending && entry.status === 'success' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{ color: BRAND, borderColor: `${BRAND}30`, backgroundColor: `${BRAND}08` }}>
              <Search className="w-3 h-3" />
              {entry.result_count} leads found
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: BRAND }}>
            <Users className="w-3 h-3" />
            {entry.max_results.toLocaleString()} requested
          </div>
        </div>
      </div>

      {/* ── LinkedIn pending: timer + filters ── */}
      {isLinkedIn && isPending && hasValidMeta && (
        <>
          <LinkedInPendingTimer
            startedAt={meta!.started_at}
            estimatedReadyAt={meta!.estimated_ready_at}
            hoursNeeded={meta!.estimated_seconds / 3600}
          />
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${BRAND}15` }}>
            <div className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: `${BRAND}10`, background: `${BRAND}05` }}>
              <p className="text-sm font-semibold" style={{ color: BRAND }}>Search Filters</p>
              {!filters && (
                <Badge variant="outline" className="text-xs text-muted-foreground">No filter data</Badge>
              )}
            </div>
            {filters ? <LinkedInFilters f={filters} /> : (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                Filter details not available for this entry.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Google Places success: search summary + results ── */}
      {!isLinkedIn && entry.status === 'success' && (
        <>
          {/* Search params summary */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${BRAND}15` }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: `${BRAND}10`, background: `${BRAND}05` }}>
              <p className="text-sm font-semibold" style={{ color: BRAND }}>Search Parameters</p>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Keyword</p>
                <p className="text-sm font-medium">{entry.keyword}</p>
              </div>
              {entry.location && (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Location</p>
                  <p className="text-sm font-medium">{entry.location}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Results</p>
                <p className="text-sm font-medium">{entry.result_count} / {entry.max_results}</p>
              </div>
            </div>
          </div>

          {entry.results.length > 0 && (
            <ResultsTable
              results={entry.results as LeadResult[]}
              importedIds={importedIds}
              filename={`leads-${entry.keyword.replace(/\s+/g, '-')}-${entry.id}`}
              importingAll={importingAll}
              onImport={handleImportGP}
              onImportAll={handleImportAllGP}
            />
          )}
        </>
      )}

      {/* ── LinkedIn success: filters + results ── */}
      {isLinkedIn && entry.status === 'success' && (
        <>
          {filters && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${BRAND}15` }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: `${BRAND}10`, background: `${BRAND}05` }}>
                <p className="text-sm font-semibold" style={{ color: BRAND }}>Search Filters Applied</p>
              </div>
              <LinkedInFilters f={filters} />
            </div>
          )}
          {linkedInLeads.length > 0 && (
            <Results2Table
              results={linkedInLeads}
              importedIds={importedIds}
              filename={`linkedin-${label.replace(/\s+/g, '-')}-${entry.id}`}
              importingAll={importingAll}
              onImport={handleImportLI}
              onImportAll={handleImportAllLI}
            />
          )}
        </>
      )}

      {/* ── Error state ── */}
      {entry.status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 space-y-1">
          <p className="text-sm font-semibold text-red-700">Search failed</p>
          <p className="text-xs text-red-600">{entry.error_message || 'Unknown error'}</p>
        </div>
      )}
    </motion.div>
  );
}
