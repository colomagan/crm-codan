import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Target, FileSpreadsheet, FileText,
  History, ChevronRight, Trash2, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

import {
  BRAND, TOKEN, ACTOR, STATUS_CONFIG,
  REVENUE_OPTIONS, SENIORITY_OPTIONS, FUNCTIONAL_OPTIONS,
  EMAIL_STATUS_OPTIONS, COMPANY_SIZE_OPTIONS, FUNDING_OPTIONS,
} from './constants';
import {
  exportCSV, exportExcel,
  computeEstimatedReadyAt, formatPortugalTime, formatCountdown,
  normalizeLinkedInItem,
} from './utils';
import { ScraperInfo } from './components/ScraperInfo';
import { TagInput } from './components/TagInput';
import { MultiSelect } from './components/MultiSelect';
import { ResultsTable } from './components/ResultsTable';
import { Results2Table } from './components/Results2Table';
import { CreditsBar } from './components/CreditsBar';
import { LinkedInPendingTimer } from './components/LinkedInPendingTimer';
import { SearchDetailPage } from './components/SearchDetailPage';
import type { LeadResult, Lead2Result, SearchEntry, Scraper2Meta } from './types';

// Inline countdown badge for history rows
function HistoryCountdown({ estimatedReadyAt }: { estimatedReadyAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const remaining = Math.max(new Date(estimatedReadyAt).getTime() - now, 0);
  const exceeded  = now > new Date(estimatedReadyAt).getTime();
  const readyTime = formatPortugalTime(new Date(estimatedReadyAt));
  if (exceeded) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
        Almost ready · a few minutes
      </span>
    );
  }
  return (
    <span className="text-xs font-medium tabular-nums" style={{ color: BRAND }}>
      {readyTime} PT · {formatCountdown(remaining)}
    </span>
  );
}

export function LeadFinderSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Google Places state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('20');
  const [loading, setLoading] = useState(false);
  const [creditsRefresh, setCreditsRefresh] = useState(0);
  const [results, setResults] = useState<LeadResult[]>([]);
  const [activeFilename, setActiveFilename] = useState('leads');
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [importingAll, setImportingAll] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // History + detail page state
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailPageEntry, setDetailPageEntry] = useState<SearchEntry | null>(null);

  // LinkedIn (Scraper 2) filter state
  const [s2FetchCount, setS2FetchCount]       = useState('100');
  const [s2FileName, setS2FileName]           = useState('');
  const [s2JobTitles, setS2JobTitles]         = useState<string[]>([]);
  const [s2NotJobTitles, setS2NotJobTitles]   = useState<string[]>([]);
  const [s2Seniority, setS2Seniority]         = useState<string[]>([]);
  const [s2Functional, setS2Functional]       = useState<string[]>([]);
  const [s2Location, setS2Location]           = useState<string[]>([]);
  const [s2City, setS2City]                   = useState<string[]>([]);
  const [s2NotLocation, setS2NotLocation]     = useState<string[]>([]);
  const [s2NotCity, setS2NotCity]             = useState<string[]>([]);
  const [s2EmailStatus, setS2EmailStatus]     = useState<string[]>([]);
  const [s2Domain, setS2Domain]               = useState<string[]>([]);
  const [s2CompanySize, setS2CompanySize]     = useState<string[]>([]);
  const [s2Industry, setS2Industry]           = useState<string[]>([]);
  const [s2NotIndustry, setS2NotIndustry]     = useState<string[]>([]);
  const [s2Keywords, setS2Keywords]           = useState<string[]>([]);
  const [s2NotKeywords, setS2NotKeywords]     = useState<string[]>([]);
  const [s2MinRevenue, setS2MinRevenue]       = useState('');
  const [s2MaxRevenue, setS2MaxRevenue]       = useState('');
  const [s2Funding, setS2Funding]             = useState<string[]>([]);

  // LinkedIn job timer state
  const [s2Loading, setS2Loading]             = useState(false);
  const [s2Results, setS2Results]             = useState<Lead2Result[]>([]);
  const [s2ImportedIds, setS2ImportedIds]     = useState<Set<number>>(new Set());
  const [s2ImportingAll, setS2ImportingAll]   = useState(false);
  const [s2Filename, setS2Filename]           = useState('leads-finder');
  const [s2StartedAt, setS2StartedAt]         = useState<string | null>(null);
  const [s2EstimatedReadyAt, setS2EstimatedReadyAt] = useState<string | null>(null);
  const [s2HoursNeeded, setS2HoursNeeded]     = useState(2);
  const [s2ActiveEntry, setS2ActiveEntry]     = useState<SearchEntry | null>(null);

  const [activeTab, setActiveTab] = useState<'google-places' | 'scraper-2'>('google-places');

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('lead_finder_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setHistory(data as SearchEntry[]);
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const persistImportIndex = async (searchId: string, index: number) => {
    const entry = history.find(e => e.id === searchId);
    const current: number[] = entry?.imported_indices ?? [];
    if (current.includes(index)) return;
    await supabase
      .from('lead_finder_searches')
      .update({ imported_indices: [...current, index] })
      .eq('id', searchId);
    setHistory(prev => prev.map(e =>
      e.id === searchId
        ? { ...e, imported_indices: [...(e.imported_indices ?? []), index] }
        : e
    ));
  };

  const buildLeadPayload = (lead: LeadResult) => ({
    user_id: userId!,
    business_name: lead.title || lead.name || 'Unknown',
    first_name: '',
    last_name: '',
    email: lead.email || null,
    phone: lead.phone || null,
    website: lead.website || null,
    source: 'Lead Finder',
    city: lead.city || null,
    state: lead.state || null,
    country_code: lead.countryCode || null,
    category: lead.categoryName || null,
    notes: null,
    google_maps_url: lead.url || null,
    score: lead.totalScore ?? null,
    reviews_count: lead.reviewsCount ?? null,
  });

  const buildLead2Payload = (lead: Lead2Result) => {
    const n = normalizeLinkedInItem(lead as unknown as Record<string, unknown>);
    return {
      user_id: userId!,
      business_name: n.companyName || n.company || 'Unknown',
      first_name: n.firstName || (n.fullName || n.name || '').split(' ')[0] || '',
      last_name:  n.lastName  || (n.fullName || n.name || '').split(' ').slice(1).join(' ') || '',
      email:      n.email || null,
      phone:      n.phone || null,
      website:    n.website || null,
      source:     'Leads Finder',
      city:       n.city || null,
      state:      null,
      country_code: n.country || null,
      category:   n.industry || null,
      notes:      [n.jobTitle || n.title, n.seniority || n.seniorityLevel].filter(Boolean).join(' · ') || null,
      google_maps_url: null,
      score:      null,
      reviews_count: null,
    };
  };

  const importLead = async (
    lead: LeadResult,
    index: number,
    searchId: string | null,
    onDone?: () => void,
  ) => {
    if (!userId) return;
    const { error } = await supabase.from('leads').insert(buildLeadPayload(lead));
    if (error) { toast.error('Import failed.'); return; }
    toast.success(`${lead.title || lead.name || 'Lead'} imported.`);
    if (searchId) await persistImportIndex(searchId, index);
    onDone?.();
  };

  const importAll = async (
    leadList: LeadResult[],
    alreadyImported: Set<number>,
    searchId: string | null,
    setIds: React.Dispatch<React.SetStateAction<Set<number>>>,
    setLoadingFn: (v: boolean) => void,
  ) => {
    if (!userId) return;
    const pending = leadList.map((lead, i) => ({ lead, i })).filter(({ i }) => !alreadyImported.has(i));
    if (pending.length === 0) { toast.info('All leads already imported.'); return; }
    setLoadingFn(true);
    try {
      const rows = pending.map(({ lead }) => buildLeadPayload(lead));
      const { error } = await supabase.from('leads').insert(rows);
      if (error) throw error;
      const newIds = new Set(alreadyImported);
      pending.forEach(({ i }) => newIds.add(i));
      setIds(newIds);
      if (searchId) {
        const allIndices = leadList.map((_, i) => i);
        await supabase.from('lead_finder_searches').update({ imported_indices: allIndices }).eq('id', searchId);
        setHistory(prev => prev.map(e => e.id === searchId ? { ...e, imported_indices: allIndices } : e));
      }
      toast.success(`${pending.length} leads imported successfully.`);
    } catch {
      toast.error('Bulk import failed.');
    } finally {
      setLoadingFn(false);
    }
  };

  // ── Google Places search ──
  const runSearch = async () => {
    if (!TOKEN) { toast.error('Lead engine not configured.'); return; }
    if (!keyword.trim()) { toast.error('Enter a keyword.'); return; }
    if (!userId) return;

    const total = Math.min(parseInt(maxResults) || 20, 100);
    const filename = `leads-${keyword.trim().replace(/\s+/g, '-')}-${Date.now()}`;

    const { data: inserted, error: insertErr } = await supabase
      .from('lead_finder_searches')
      .insert({ user_id: userId, keyword: keyword.trim(), location: location.trim() || null, max_results: total, status: 'pending', result_count: 0, results: [], imported_indices: [] })
      .select().single();

    if (insertErr || !inserted) { toast.error('Could not start search.'); return; }
    const searchId: string = inserted.id;
    setActiveSearchId(searchId);
    setLoading(true);
    setResults([]);
    setImportedIds(new Set());
    setActiveFilename(filename);
    setProgress({ current: 0, total });
    await fetchHistory();

    try {
      const query = location.trim() ? `${keyword.trim()} in ${location.trim()}` : keyword.trim();
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR)}/runs`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ searchStringsArray: [query], maxCrawledPlaces: total, language: 'en' }) }
      );
      if (!runRes.ok) {
        const err = await runRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Request failed (${runRes.status})`);
      }
      const runData = await runRes.json();
      const runId: string = runData.data.id;
      let datasetId: string = runData.data.defaultDatasetId || '';
      let status: string = runData.data.status;
      let polls = 0;

      while ((status === 'RUNNING' || status === 'READY') && polls < 60) {
        await new Promise((r) => setTimeout(r, 3000));
        polls++;
        const [statusRes, datasetRes] = await Promise.all([
          fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR)}/runs/${runId}`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
          datasetId ? fetch(`https://api.apify.com/v2/datasets/${datasetId}`, { headers: { Authorization: `Bearer ${TOKEN}` } }) : Promise.resolve(null),
        ]);
        const statusData = await statusRes.json();
        status = statusData.data.status;
        datasetId = statusData.data.defaultDatasetId || datasetId;
        if (datasetRes) {
          const dd = await datasetRes.json();
          setProgress({ current: dd?.data?.itemCount ?? 0, total });
        }
      }

      if (status !== 'SUCCEEDED') throw new Error(`Search ended with status: ${status}`);

      const dsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const dsData = await dsRes.json();
      const finalCount: number = dsData?.data?.itemCount ?? total;
      setProgress({ current: finalCount, total: finalCount });

      const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?limit=${total}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const items: LeadResult[] = await itemsRes.json();
      const list = Array.isArray(items) ? items : [];

      setResults(list);
      toast.success(`${list.length} leads found.`);
      await supabase.from('lead_finder_searches').update({ status: 'success', result_count: list.length, results: list }).eq('id', searchId);

      if (list.length > 0) {
        await supabase.rpc('increment_credits_used', { p_user_id: userId, p_amount: list.length });
        setCreditsRefresh(n => n + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed.';
      toast.error(msg);
      await supabase.from('lead_finder_searches').update({ status: 'error', error_message: msg }).eq('id', searchId);
    } finally {
      setLoading(false);
      fetchHistory();
    }
  };

  // ── LinkedIn simulated search — saves to DB with all filters, shows countdown timer ──
  const runSearch2 = async () => {
    if (!userId) return;

    const total      = Math.min(parseInt(s2FetchCount) || 100, 100000);
    const label      = s2FileName.trim() || `leads-finder-${Date.now()}`;
    const startedAt  = new Date().toISOString();
    const { estimatedReadyAt, hoursNeeded } = computeEstimatedReadyAt();

    const filterSummary = [
      s2JobTitles.length ? s2JobTitles[0] : null,
      s2Location.length  ? s2Location[0]  : null,
      s2Industry.length  ? s2Industry[0]  : null,
    ].filter(Boolean).join(' · ') || null;

    const meta: Scraper2Meta = {
      __meta: true,
      scraper_type: 'scraper2',
      apify_run_id: null,
      started_at: startedAt,
      estimated_seconds: hoursNeeded * 3600,
      estimated_ready_at: estimatedReadyAt,
      filters: {
        label,
        totalLeads: total,
        jobTitles: s2JobTitles,
        notJobTitles: s2NotJobTitles,
        seniority: s2Seniority,
        functional: s2Functional,
        locations: s2Location,
        cities: s2City,
        notLocations: s2NotLocation,
        notCities: s2NotCity,
        emailStatus: s2EmailStatus,
        domains: s2Domain,
        companySizes: s2CompanySize,
        industries: s2Industry,
        notIndustries: s2NotIndustry,
        keywords: s2Keywords,
        notKeywords: s2NotKeywords,
        minRevenue: s2MinRevenue,
        maxRevenue: s2MaxRevenue,
        funding: s2Funding,
      },
    };

    setS2Loading(true);
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('lead_finder_searches')
        .insert({
          user_id: userId,
          keyword: `[LinkedIn] ${label}`,
          location: filterSummary,
          max_results: total,
          status: 'pending',
          result_count: 0,
          results: [meta],
          imported_indices: [],
        })
        .select().single();

      if (insertErr || !inserted) { toast.error('Could not schedule job.'); return; }

      const entry = inserted as SearchEntry;
      setS2StartedAt(startedAt);
      setS2EstimatedReadyAt(estimatedReadyAt);
      setS2HoursNeeded(hoursNeeded);
      setS2Filename(label);
      setS2Results([]);
      setS2ImportedIds(new Set());
      setS2ActiveEntry(entry);

      const readyStr = formatPortugalTime(new Date(estimatedReadyAt));
      toast.success(`LinkedIn search scheduled! Ready at ${readyStr} Portugal time.`);
      await fetchHistory();
    } finally {
      setS2Loading(false);
    }
  };

  // ── Restore timer state from a history entry ──
  const restoreS2Timer = (entry: SearchEntry) => {
    const meta = entry.results[0] as unknown as Scraper2Meta;
    if (!meta?.__meta || !meta.estimated_ready_at) return;
    setActiveTab('scraper-2');
    setS2StartedAt(meta.started_at);
    setS2EstimatedReadyAt(meta.estimated_ready_at);
    setS2HoursNeeded(meta.estimated_seconds / 3600);
    setS2Filename(entry.keyword.replace('[LinkedIn] ', ''));
    setS2Results([]);
    setS2ImportedIds(new Set());
    setS2ActiveEntry(entry);
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('lead_finder_searches').delete().eq('id', id);
    setHistory((prev) => prev.filter((e) => e.id !== id));
  };

  const openDetailPage = (entry: SearchEntry) => {
    setDetailPageEntry(entry);
    setHistoryOpen(false);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Lead Finder</h1>
          <p className="text-muted-foreground mt-1">Powered by Aires-Soft Systems</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setHistoryOpen(true)}>
          <History className="w-4 h-4" />
          History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{history.length}</Badge>
          )}
        </Button>
      </motion.div>

      {userId && !detailPageEntry && <CreditsBar userId={userId} refreshKey={creditsRefresh} recentHistory={history.slice(0, 5)} />}

      {/* ── Detail page view (replaces tab content) ── */}
      {detailPageEntry && userId && (
        <SearchDetailPage
          entry={detailPageEntry}
          userId={userId}
          onBack={() => setDetailPageEntry(null)}
          persistImportIndex={persistImportIndex}
          setHistory={setHistory}
          buildLeadPayload={buildLeadPayload}
          buildLead2Payload={buildLead2Payload}
        />
      )}

      {/* Tabs + tab content — hidden when detail page is open */}
      {!detailPageEntry && <>
      <div className="flex gap-1 border-b" style={{ borderColor: `${BRAND}20` }}>
        {([
          { id: 'google-places', label: 'Google Places' },
          { id: 'scraper-2',     label: 'LinkedIn Finder' },
        ] as const).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-sm font-medium transition-colors relative"
              style={{ color: active ? BRAND : undefined }}
            >
              {tab.label}
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: BRAND }} />}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Google Places ── */}
      {activeTab === 'google-places' && (
        <>
          <ScraperInfo id="google-places" />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" /> Search Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Industry / Keyword</Label>
                  <Input placeholder="e.g. dental clinic" value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input placeholder="e.g. Miami, FL" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Results</Label>
                  <Input type="number" min="1" max="100" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} />
                </div>
              </div>
              <Button onClick={runSearch} disabled={loading} style={{ backgroundColor: BRAND }} className="text-white mt-4 gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</> : <><Search className="w-4 h-4" /> Find Leads</>}
              </Button>
              {loading && progress && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Scraping leads...</span>
                    <span className="font-semibold tabular-nums" style={{ color: BRAND }}>{progress.current}/{progress.total}</span>
                  </div>
                  <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : '0%'}
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <ResultsTable
                results={results}
                importedIds={importedIds}
                filename={activeFilename}
                importingAll={importingAll}
                onImport={(lead, i) => importLead(lead, i, activeSearchId, () => setImportedIds((prev) => new Set(prev).add(i)))}
                onImportAll={() => importAll(results, importedIds, activeSearchId, setImportedIds, setImportingAll)}
              />
            </motion.div>
          )}
        </>
      )}

      {/* ── Tab: LinkedIn ── */}
      {activeTab === 'scraper-2' && (
        <motion.div key="scraper-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          <ScraperInfo id="scraper-2" />

          {/* Show timer if a job is active — clickable to open detail page */}
          {s2StartedAt && s2EstimatedReadyAt && (
            <LinkedInPendingTimer
              startedAt={s2StartedAt}
              estimatedReadyAt={s2EstimatedReadyAt}
              hoursNeeded={s2HoursNeeded}
              onClick={s2ActiveEntry ? () => openDetailPage(s2ActiveEntry) : undefined}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" /> Search Leads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Number of leads</Label>
                  <Input type="number" min="1" value={s2FetchCount} onChange={(e) => setS2FetchCount(e.target.value)} placeholder="100" />
                  <p className="text-xs text-muted-foreground">Leave empty to scrape all available results.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Run label / file name</Label>
                  <Input value={s2FileName} onChange={(e) => setS2FileName(e.target.value)} placeholder="Prospects" />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4" style={{ borderColor: `${BRAND}15` }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact filters</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Include job titles</Label>
                    <TagInput value={s2JobTitles} onChange={setS2JobTitles} placeholder="e.g. realtor, teacher…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclude job titles</Label>
                    <TagInput value={s2NotJobTitles} onChange={setS2NotJobTitles} placeholder="e.g. intern…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Seniority level</Label>
                  <MultiSelect options={SENIORITY_OPTIONS} value={s2Seniority} onChange={setS2Seniority} />
                </div>
                <div className="space-y-1.5">
                  <Label>Functional level</Label>
                  <MultiSelect options={FUNCTIONAL_OPTIONS} value={s2Functional} onChange={setS2Functional} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Include locations</Label>
                    <TagInput value={s2Location} onChange={setS2Location} placeholder="e.g. United States…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclude locations</Label>
                    <TagInput value={s2NotLocation} onChange={setS2NotLocation} placeholder="e.g. Canada…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Include cities</Label>
                    <TagInput value={s2City} onChange={setS2City} placeholder="e.g. Miami…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclude cities</Label>
                    <TagInput value={s2NotCity} onChange={setS2NotCity} placeholder="e.g. Houston…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email status</Label>
                  <MultiSelect options={EMAIL_STATUS_OPTIONS} value={s2EmailStatus} onChange={setS2EmailStatus} />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4" style={{ borderColor: `${BRAND}15` }}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company filters</p>
                <div className="space-y-1.5">
                  <Label>Include company domains</Label>
                  <TagInput value={s2Domain} onChange={setS2Domain} placeholder="e.g. google.com, apple.com…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Company size</Label>
                  <MultiSelect options={COMPANY_SIZE_OPTIONS} value={s2CompanySize} onChange={setS2CompanySize} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Include industries</Label>
                    <TagInput value={s2Industry} onChange={setS2Industry} placeholder="e.g. Software, Retail…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclude industries</Label>
                    <TagInput value={s2NotIndustry} onChange={setS2NotIndustry} placeholder="e.g. Finance…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Include keywords</Label>
                    <TagInput value={s2Keywords} onChange={setS2Keywords} placeholder="e.g. SaaS, gym…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exclude keywords</Label>
                    <TagInput value={s2NotKeywords} onChange={setS2NotKeywords} placeholder="e.g. agency…" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Minimum revenue</Label>
                    <Select value={s2MinRevenue || '__none__'} onValueChange={(v) => setS2MinRevenue(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="No minimum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No minimum</SelectItem>
                        {REVENUE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximum revenue</Label>
                    <Select value={s2MaxRevenue || '__none__'} onValueChange={(v) => setS2MaxRevenue(v === '__none__' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="No maximum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No maximum</SelectItem>
                        {REVENUE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Funding round</Label>
                  <MultiSelect options={FUNDING_OPTIONS} value={s2Funding} onChange={setS2Funding} />
                </div>
              </div>

              <Button
                onClick={runSearch2}
                disabled={s2Loading}
                style={{ backgroundColor: BRAND }}
                className="text-white gap-2"
              >
                {s2Loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
                  : <><Search className="w-4 h-4" /> Find Leads</>}
              </Button>
            </CardContent>
          </Card>

          {s2Results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Results2Table
                results={s2Results}
                importedIds={s2ImportedIds}
                filename={s2Filename}
                importingAll={s2ImportingAll}
                onImport={(lead, i) =>
                  importLead(
                    { ...lead, title: lead.companyName || lead.company, phone: lead.phone, website: lead.website, email: lead.email, city: lead.city, countryCode: lead.country, categoryName: lead.industry } as LeadResult,
                    i, null,
                    () => setS2ImportedIds((prev) => new Set(prev).add(i)),
                  )
                }
                onImportAll={async () => {
                  if (!userId) return;
                  const pending = s2Results.map((l, i) => ({ l, i })).filter(({ i }) => !s2ImportedIds.has(i));
                  if (!pending.length) { toast.info('All leads already imported.'); return; }
                  setS2ImportingAll(true);
                  try {
                    const { error } = await supabase.from('leads').insert(pending.map(({ l }) => buildLead2Payload(l)));
                    if (error) throw error;
                    const ids = new Set(s2ImportedIds);
                    pending.forEach(({ i }) => ids.add(i));
                    setS2ImportedIds(ids);
                    toast.success(`${pending.length} leads imported.`);
                  } catch { toast.error('Bulk import failed.'); }
                  finally { setS2ImportingAll(false); }
                }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
      </>}

      {/* ── History Dialog ── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Search History
            </DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No searches yet.</p>
          ) : (
            <div className="overflow-y-auto divide-y flex-1">
              {history.map((entry) => {
                const cfg        = STATUS_CONFIG[entry.status];
                const fname      = `leads-${entry.keyword.replace(/\s+/g, '-')}-${entry.id}`;
                const imported   = (entry.imported_indices ?? []).length;
                const isLinkedIn = entry.keyword.startsWith('[LinkedIn]');
                const displayLabel = isLinkedIn
                  ? entry.keyword.replace('[LinkedIn] ', '🔗 ')
                  : `${entry.keyword}${entry.location ? ` · ${entry.location}` : ''}`;
                const pendingMeta = (isLinkedIn && entry.status === 'pending')
                  ? (entry.results[0] as unknown as Scraper2Meta)
                  : null;
                const canRestore = pendingMeta?.__meta === true && !!pendingMeta.estimated_ready_at;

                return (
                  <div key={entry.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-shrink-0">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{displayLabel}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                          {entry.status === 'success' ? `${entry.result_count} leads` : entry.status}
                        </span>
                        {entry.status === 'success' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {imported} imported
                          </span>
                        )}
                        {isLinkedIn && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${BRAND}12`, color: BRAND }}>
                            LinkedIn
                          </span>
                        )}
                        {/* Inline countdown for pending LinkedIn jobs */}
                        {canRestore && pendingMeta?.estimated_ready_at && (
                          <HistoryCountdown estimatedReadyAt={pendingMeta.estimated_ready_at} />
                        )}
                        {!canRestore && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'dd MMM yyyy · HH:mm')}
                          </span>
                        )}
                        {entry.error_message && (
                          <span className="text-xs text-red-500 truncate max-w-[200px]">{entry.error_message}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Pending LinkedIn: restore timer + open detail */}
                      {canRestore && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                          style={{ borderColor: `${BRAND}40`, color: BRAND }}
                          onClick={() => { restoreS2Timer(entry); openDetailPage(entry); }}>
                          View details
                        </Button>
                      )}
                      {/* Success entries: CSV / Excel exports */}
                      {entry.status === 'success' && entry.results.length > 0 && !isLinkedIn && (
                        <>
                          <Button variant="ghost" size="icon" className="w-7 h-7" title="CSV"
                            onClick={(e) => { e.stopPropagation(); exportCSV(entry.results as LeadResult[], fname); }}>
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7" title="Excel"
                            onClick={(e) => { e.stopPropagation(); exportExcel(entry.results as LeadResult[], fname); }}>
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {/* All success entries: open detail page */}
                      {entry.status === 'success' && (
                        <Button variant="ghost" size="icon" className="w-7 h-7" title="View details"
                          onClick={() => openDetailPage(entry)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive"
                        onClick={() => deleteEntry(entry.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
