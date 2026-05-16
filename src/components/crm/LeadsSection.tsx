import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Target, ChevronRight,
  Phone, Mail, Globe, MapPin, Star, ArrowRight, ChevronDown,
  Instagram, Linkedin, Briefcase, Building2,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  bulkMoveLeadsToContacts,
  bulkMoveLeadsToClients,
} from '@/utils/crmBulkMove';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Lead } from '@/types/crm';
import { format } from 'date-fns';

const BRAND = 'hsl(38, 60%, 50%)';
const SOURCES = ['Lead Finder', 'Instagram', 'Web', 'Referral', 'Manual', 'Other'];

const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level', 'Founder/Owner'];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  job_title: '',
  headline: '',
  seniority_level: '',
  industry: '',
  functional_area: '',
  linkedin: '',
  instagram: '',
  website: '',
  company_linkedin: '',
  company_domain: '',
  company_founded_year: '',
  company_city: '',
  company_country: '',
  city: '',
  country_code: '',
  source: '',
  category: '',
  notes: '',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

export function LeadsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<Lead | null>(null);
  const [promoting, setPromoting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [statFilter, setStatFilter] = useState<'all' | 'lead-finder' | 'manual'>('all');

  const fetchLeads = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (statFilter === 'lead-finder' && l.source !== 'Lead Finder') return false;
    if (statFilter === 'manual' && l.source === 'Lead Finder') return false;
    const q = search.toLowerCase();
    return !q || [l.first_name, l.last_name, l.email, l.phone, l.city, l.category, l.job_title, l.company_domain, l.industry]
      .some(v => v?.toLowerCase().includes(q));
  });

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)));
    }
  }

  const openCreate = () => { setEditingLead(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (l: Lead) => {
    setEditingLead(l);
    setForm({
      first_name: l.first_name || '',
      last_name: l.last_name || '',
      email: l.email || '',
      phone: l.phone || '',
      job_title: l.job_title || '',
      headline: l.headline || '',
      seniority_level: l.seniority_level || '',
      industry: l.industry || '',
      functional_area: l.functional_area || '',
      linkedin: l.linkedin || '',
      instagram: l.instagram || '',
      website: l.website || '',
      company_linkedin: l.company_linkedin || '',
      company_domain: l.company_domain || '',
      company_founded_year: l.company_founded_year || '',
      company_city: l.company_city || '',
      company_country: l.company_country || '',
      city: l.city || '',
      country_code: l.country_code || '',
      source: l.source || '',
      category: l.category || '',
      notes: l.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error('At least an email or phone (WhatsApp) is required.');
      return;
    }
    if (!userId) return;

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      job_title: form.job_title || null,
      headline: form.headline || null,
      seniority_level: form.seniority_level || null,
      industry: form.industry || null,
      functional_area: form.functional_area || null,
      linkedin: form.linkedin || null,
      instagram: form.instagram || null,
      website: form.website || null,
      company_linkedin: form.company_linkedin || null,
      company_domain: form.company_domain || null,
      company_founded_year: form.company_founded_year || null,
      company_city: form.company_city || null,
      company_country: form.company_country || null,
      city: form.city || null,
      country_code: form.country_code || null,
      source: form.source || null,
      category: form.category || null,
      notes: form.notes || null,
    };

    if (editingLead) {
      const { error } = await supabase.from('leads')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingLead.id);
      if (error) { toast.error('Could not update.'); return; }
      toast.success('Lead updated.');
    } else {
      const { error } = await supabase.from('leads')
        .insert({ user_id: userId, ...payload });
      if (error) { toast.error('Could not create.'); return; }
      toast.success('Lead added.');
    }

    setDialogOpen(false);
    fetchLeads();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('leads').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Could not delete.');
    else { toast.success('Lead deleted.'); fetchLeads(); }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) { toast.error('Could not delete selected leads.'); return; }
    toast.success(`${ids.length} lead${ids.length !== 1 ? 's' : ''} deleted.`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    fetchLeads();
  };

  const handleBulkMove = async (destination: 'contacts' | 'clients') => {
    const selectedLeads = filtered.filter(l => selectedIds.has(l.id));
    setBulkMoving(true);
    try {
      if (destination === 'contacts') {
        await bulkMoveLeadsToContacts(selectedLeads, userId!);
        toast.success(`${selectedLeads.length} lead${selectedLeads.length !== 1 ? 's' : ''} moved to Contacts.`);
      } else {
        await bulkMoveLeadsToClients(selectedLeads, userId!);
        toast.success(`${selectedLeads.length} lead${selectedLeads.length !== 1 ? 's' : ''} moved to Clients.`);
      }
      setSelectedIds(new Set());
      fetchLeads();
    } catch {
      toast.error('Could not move selected leads.');
    } finally {
      setBulkMoving(false);
    }
  };

  // Promote lead → contacts (creates a contact with type=LEAD_CONTACTED, removes from leads)
  const handlePromote = async () => {
    if (!promoteTarget || !userId) return;
    setPromoting(true);
    try {
      const { data: insertedContact, error: insertErr } = await supabase.from('contacts').insert({
        user_id:              userId,
        business_name:        '',
        first_name:           promoteTarget.first_name           || '',
        last_name:            promoteTarget.last_name            || '',
        email:                promoteTarget.email                || null,
        whatsapp:             promoteTarget.phone                || null,
        website:              promoteTarget.website              || null,
        instagram:            promoteTarget.instagram            || null,
        linkedin:             promoteTarget.linkedin             || null,
        job_title:            promoteTarget.job_title            || null,
        industry:             promoteTarget.industry             || null,
        headline:             promoteTarget.headline             || null,
        seniority_level:      promoteTarget.seniority_level      || null,
        company_linkedin:     promoteTarget.company_linkedin     || null,
        functional_area:      promoteTarget.functional_area      || null,
        company_domain:       promoteTarget.company_domain       || null,
        company_founded_year: promoteTarget.company_founded_year || null,
        company_city:         promoteTarget.company_city         || null,
        company_country:      promoteTarget.company_country      || null,
        type:                 'LEAD_CONTACTED',
        source:               promoteTarget.source               || null,
        notes:                promoteTarget.notes                || null,
        labels:               [],
        country_code:         promoteTarget.country_code         || null,
        city:                 promoteTarget.city                 || null,
        category:             promoteTarget.category             || null,
        google_maps_url:      promoteTarget.google_maps_url      || null,
        score:                promoteTarget.score                ?? null,
        reviews_count:        promoteTarget.reviews_count        ?? null,
      }).select('id').single();
      if (insertErr) throw insertErr;
      const newContactId = (insertedContact as any)?.id;
      if (newContactId) {
        await supabase.from('crm_attachment_folders')
          .update({ entity_type: 'contact', entity_id: newContactId })
          .eq('entity_type', 'lead').eq('entity_id', promoteTarget.id);
        await supabase.from('crm_attachments')
          .update({ entity_type: 'contact', entity_id: newContactId })
          .eq('entity_type', 'lead').eq('entity_id', promoteTarget.id);
      }
      await supabase.from('leads').delete().eq('id', promoteTarget.id);
      toast.success('Moved to Contacts.');
      fetchLeads();
    } catch {
      toast.error('Could not move to contacts.');
    } finally {
      setPromoting(false);
      setPromoteTarget(null);
    }
  };

  const location = (l: Lead) => [l.city, l.state, l.country_code].filter(Boolean).join(', ');

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Leads</h1>
          <p className="text-muted-foreground mt-1">Prospects not yet contacted — {leads.length} total</p>
        </div>
        <Button onClick={openCreate} style={{ backgroundColor: BRAND }} className="text-white gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Leads',      value: leads.length,                                          color: BRAND,     key: 'all'         as const },
          { label: 'From Lead Finder', value: leads.filter(l => l.source === 'Lead Finder').length,  color: '#8b5cf6', key: 'lead-finder' as const },
          { label: 'Manual',           value: leads.filter(l => l.source !== 'Lead Finder').length,  color: '#f59e0b', key: 'manual'      as const },
        ].map((s, i) => {
          const active = statFilter === s.key;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card
                className="cursor-pointer transition-all hover:shadow-md"
                style={active ? { outline: `2px solid ${s.color}`, outlineOffset: '2px' } : {}}
                onClick={() => setStatFilter(active ? 'all' : s.key)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-4">
            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: BRAND }}>
                  {selectedIds.size} selected
                </span>
                <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSelectedIds(new Set())}>
                  Deselect all
                </button>
                <div className="flex-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1" disabled={bulkMoving}>
                      Move to <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkMove('contacts')}>Contacts</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkMove('clients')}>Clients</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="sm" className="h-8" onClick={() => setBulkDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-end">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8" />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3">
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        className="rounded-full border-2"
                        style={allSelected || someSelected ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                        aria-label="Select all"
                      />
                    </div>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No leads found.</TableCell></TableRow>
                ) : filtered.map(lead => {
                  const displayName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email || '—';
                  const loc = location(lead);
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`, { state: { from: 'leads' } })}>
                      <TableCell className="w-10 px-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(lead.id)}
                          onCheckedChange={() => toggleOne(lead.id)}
                          className="rounded-full border-2"
                          style={selectedIds.has(lead.id) ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: BRAND }}>
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{displayName}</p>
                            {lead.website && (
                              <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1 text-[11px] hover:underline" style={{ color: BRAND }}>
                                <Globe className="w-2.5 h-2.5" /> {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {lead.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</span>}
                          {lead.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{lead.phone}</span>}
                          {!lead.email && !lead.phone && '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {loc
                          ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3 flex-shrink-0" />{loc}</span>
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lead.category || '—'}</TableCell>
                      <TableCell>
                        {lead.score != null
                          ? <span className="flex items-center gap-1 text-xs font-medium"><Star className="w-3 h-3 text-amber-400" />{lead.score}</span>
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{lead.source || '—'}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline" size="sm"
                            className="h-7 px-2 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => setPromoteTarget(lead)}
                            title="Move to Contacts"
                          >
                            <ArrowRight className="w-3 h-3" /> Contact
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(lead)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={() => setDeleteTarget(lead)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          {lead.google_maps_url && (
                            <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="w-7 h-7" title="Open in Maps">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
            <p className="text-xs text-muted-foreground">Email or WhatsApp required. All other fields optional.</p>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 space-y-6 py-2">

            {/* 1. Contact — required */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Contact <span className="text-red-500 font-normal normal-case tracking-normal">* at least one</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input placeholder="John" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input placeholder="Doe" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-red-400">*</span></Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone / WhatsApp <span className="text-red-400">*</span></Label>
                  <Input placeholder="+1 555-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 2. Professional */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Professional
              </p>
              <div className="space-y-1.5">
                <Label>Headline</Label>
                <Input placeholder="e.g. Marketing Manager @ Acme | ex-Google" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Job Title</Label>
                  <Input placeholder="e.g. Marketing Manager" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Seniority Level</Label>
                  <Select value={form.seniority_level} onValueChange={v => setForm({ ...form, seniority_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {SENIORITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Input placeholder="e.g. SaaS, Healthcare" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Functional Area</Label>
                  <Input placeholder="e.g. Marketing, Engineering" value={form.functional_area} onChange={e => setForm({ ...form, functional_area: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 3. Social & Web */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Social & Web
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label>
                  <Input placeholder="linkedin.com/in/username" value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> Instagram</Label>
                  <Input placeholder="@username" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</Label>
                  <Input placeholder="https://example.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 4. Company */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Company
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Company LinkedIn</Label>
                  <Input placeholder="linkedin.com/company/acme" value={form.company_linkedin} onChange={e => setForm({ ...form, company_linkedin: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Domain</Label>
                  <Input placeholder="acme.com" value={form.company_domain} onChange={e => setForm({ ...form, company_domain: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Founded Year</Label>
                  <Input placeholder="2010" value={form.company_founded_year} onChange={e => setForm({ ...form, company_founded_year: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company City</Label>
                  <Input placeholder="San Francisco" value={form.company_city} onChange={e => setForm({ ...form, company_city: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Company Country</Label>
                  <Input placeholder="United States" value={form.company_country} onChange={e => setForm({ ...form, company_country: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 5. Personal Location */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Personal Location
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input placeholder="Miami" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input placeholder="US" value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })} />
                </div>
              </div>
            </div>

            {/* 6. Meta */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input placeholder="e.g. Dental clinic" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Internal notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>

          </div>
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} style={{ backgroundColor: BRAND }} className="text-white">
              {editingLead ? 'Update Lead' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to Contact confirm */}
      <AlertDialog open={!!promoteTarget} onOpenChange={o => { if (!o) setPromoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{`${promoteTarget?.first_name || ''} ${promoteTarget?.last_name || ''}`.trim() || promoteTarget?.email}</strong> will be moved to <strong>Contacts</strong> (leads you have contacted). This action removes it from Leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePromote}
              disabled={promoting}
              style={{ backgroundColor: BRAND }}
              className="text-white"
            >
              {promoting ? 'Moving...' : 'Move to Contacts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{`${deleteTarget?.first_name || ''} ${deleteTarget?.last_name || ''}`.trim() || deleteTarget?.email}</strong> will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
