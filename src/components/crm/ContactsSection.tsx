import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Users, ChevronRight, ArrowRight, ChevronDown,
  Mail, Globe, MapPin, Phone, Briefcase, Building2, Instagram, Linkedin,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  bulkMoveContactsToLeads,
  bulkMoveContactsToClients,
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
import type { Contact, Source } from '@/types/crm';
import { format } from 'date-fns';

const BRAND = 'hsl(38, 60%, 50%)';
const SOURCES: Source[] = ['Instagram', 'Web', 'Referral', 'Manual', 'Lead Finder', 'Other'];
const CHANNELS = ['WhatsApp', 'Email', 'Instagram', 'Phone'];
const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level', 'Founder/Owner'];

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  whatsapp: '',
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
  channel: '',
  source: '' as Source | '',
  category: '',
  notes: '',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

export function ContactsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<Contact | null>(null);
  const [promoting, setPromoting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [statFilter, setStatFilter] = useState<'all' | 'this-month'>('all');

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'LEAD_CONTACTED')
      .order('created_at', { ascending: false });
    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const filtered = contacts.filter(c => {
    if (statFilter === 'this-month') {
      const d = new Date(c.created_at);
      const now = new Date();
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    }
    const q = search.toLowerCase();
    return !q || [c.first_name, c.last_name, c.email, c.whatsapp, c.job_title, c.company_domain, c.industry]
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

  const openCreate = () => { setEditingContact(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      email: c.email || '',
      whatsapp: c.whatsapp || '',
      job_title: c.job_title || '',
      headline: c.headline || '',
      seniority_level: c.seniority_level || '',
      industry: c.industry || '',
      functional_area: c.functional_area || '',
      linkedin: c.linkedin || '',
      instagram: c.instagram || '',
      website: c.website || '',
      company_linkedin: c.company_linkedin || '',
      company_domain: c.company_domain || '',
      company_founded_year: c.company_founded_year || '',
      company_city: c.company_city || '',
      company_country: c.company_country || '',
      city: c.city || '',
      country_code: c.country_code || '',
      channel: c.channel || '',
      source: c.source || '',
      category: c.category || '',
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.email.trim() && !form.whatsapp.trim()) {
      toast.error('At least an email or phone (WhatsApp) is required.');
      return;
    }
    if (!userId) return;

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
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
      type: 'LEAD_CONTACTED' as const,
      channel: form.channel || null,
      source: form.source || null,
      category: form.category || null,
      notes: form.notes || null,
    };

    if (editingContact) {
      const { error } = await supabase.from('contacts')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingContact.id);
      if (error) { toast.error('Could not update.'); return; }
      toast.success('Contact updated.');
    } else {
      const { error } = await supabase.from('contacts')
        .insert({ user_id: userId, ...payload, labels: [] });
      if (error) { toast.error('Could not create.'); return; }
      toast.success('Contact added.');
    }

    setDialogOpen(false);
    fetchContacts();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('contacts').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Could not delete.');
    else { toast.success('Contact deleted.'); fetchContacts(); }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const { error } = await supabase.from('contacts').delete().in('id', ids);
    if (error) { toast.error('Could not delete selected contacts.'); return; }
    toast.success(`${ids.length} contact${ids.length !== 1 ? 's' : ''} deleted.`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    fetchContacts();
  };

  const handleBulkMove = async (destination: 'leads' | 'clients') => {
    const selectedContacts = filtered.filter(c => selectedIds.has(c.id));
    setBulkMoving(true);
    try {
      if (destination === 'leads') {
        await bulkMoveContactsToLeads(selectedContacts, userId!);
        toast.success(`${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''} moved to Leads.`);
      } else {
        await bulkMoveContactsToClients(selectedContacts, userId!);
        toast.success(`${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''} moved to Clients.`);
      }
      setSelectedIds(new Set());
      fetchContacts();
    } catch {
      toast.error('Could not move selected contacts.');
    } finally {
      setBulkMoving(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteTarget || !userId) return;
    setPromoting(true);
    try {
      const { error: insertErr } = await supabase.from('clients').insert({
        user_id:         userId,
        business_name:   '',
        first_name:      promoteTarget.first_name      || '',
        last_name:       promoteTarget.last_name       || '',
        email:           promoteTarget.email           || null,
        phone:           promoteTarget.whatsapp        || null,
        website:         promoteTarget.website         || null,
        source:          promoteTarget.source          || null,
        notes:           promoteTarget.notes           || null,
        status:          'active',
        city:            promoteTarget.city            || null,
        category:        promoteTarget.category        || null,
        country_code:    promoteTarget.country_code    || null,
        labels:          promoteTarget.labels          || [],
        channel:         promoteTarget.channel         || null,
        google_maps_url: promoteTarget.google_maps_url || null,
        score:           promoteTarget.score           ?? null,
      });
      if (insertErr) throw insertErr;
      await supabase.from('contacts').delete().eq('id', promoteTarget.id);
      toast.success('Moved to Clients.');
      fetchContacts();
    } catch {
      toast.error('Could not move to clients.');
    } finally {
      setPromoting(false);
      setPromoteTarget(null);
    }
  };

  const thisMonth = contacts.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Contacts</h1>
          <p className="text-muted-foreground mt-1">Leads you have contacted — {contacts.length} total</p>
        </div>
        <Button onClick={openCreate} style={{ backgroundColor: BRAND }} className="text-white gap-2">
          <Plus className="w-4 h-4" /> Add Contact
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Contacts',   value: contacts.length, color: BRAND,     key: 'all'        as const },
          { label: 'Added This Month', value: thisMonth,       color: '#10b981', key: 'this-month' as const },
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
                    <Users className="w-4 h-4" />
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
                    <DropdownMenuItem onClick={() => handleBulkMove('leads')}>Leads</DropdownMenuItem>
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
                  <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8" />
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
                  <TableHead>Job</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No contacts found.</TableCell></TableRow>
                ) : filtered.map(contact => {
                  const displayName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || '—';
                  return (
                    <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/clients/${contact.id}`, { state: { from: 'contacts' } })}>
                      <TableCell className="w-10 px-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleOne(contact.id)}
                          className="rounded-full border-2"
                          style={selectedIds.has(contact.id) ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: BRAND }}>
                            {getInitials(displayName)}
                          </div>
                          <span>{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {contact.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{contact.email}</span>}
                          {contact.whatsapp && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{contact.whatsapp}</span>}
                          {!contact.email && !contact.whatsapp && '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{contact.job_title || '—'}</TableCell>
                      <TableCell>
                        {contact.channel
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">{contact.channel}</span>
                          : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{contact.source || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(contact.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="outline" size="sm"
                            className="h-7 px-2 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => setPromoteTarget(contact)}
                            title="Move to Clients"
                          >
                            <ArrowRight className="w-3 h-3" /> Client
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(contact)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={() => setDeleteTarget(contact)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => navigate(`/clients/${contact.id}`, { state: { from: 'contacts' } })}>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
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
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
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
                  <Input placeholder="+1 555-0000" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
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
                  <Label>Contact Channel</Label>
                  <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue placeholder="How contacted?" /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v as Source })}>
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
              {editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to Client confirm */}
      <AlertDialog open={!!promoteTarget} onOpenChange={o => { if (!o) setPromoteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Clients?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{`${promoteTarget?.first_name || ''} ${promoteTarget?.last_name || ''}`.trim() || promoteTarget?.email}</strong> will be moved to <strong>Clients</strong> as a confirmed customer. This removes it from Contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePromote}
              disabled={promoting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {promoting ? 'Moving...' : 'Move to Clients'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
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
            <AlertDialogTitle>Delete {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
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
