import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, UserCheck, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  bulkMoveClientsToLeads,
  bulkMoveClientsToContacts,
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
import type { CrmClient, ClientStatus } from '@/types/crm';
import { format } from 'date-fns';

const BRAND = 'hsl(38, 60%, 50%)';
const SOURCES = ['Instagram', 'Web', 'Referral', 'Manual', 'Lead Finder', 'Other'];

const STATUS_BADGE: Record<ClientStatus, { label: string; color: string }> = {
  active:   { label: 'Active',    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  inactive: { label: 'Inactive',  color: 'bg-gray-50 text-gray-600 border border-gray-200' },
  paused:   { label: 'Paused',    color: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

const EMPTY_FORM = {
  business_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  website: '',
  source: '',
  status: 'active' as ClientStatus,
  notes: '',
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

export function ClientsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigate = useNavigate();

  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ClientStatus>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CrmClient | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [deleteTarget, setDeleteTarget] = useState<CrmClient | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoving, setBulkMoving] = useState(false);

  const fetchClients = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setClients((data as CrmClient[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filtered = clients.filter(c => {
    const matchStatus = filter === 'all' || c.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || [c.business_name, c.first_name, c.last_name, c.email, c.phone]
      .some(v => v?.toLowerCase().includes(q));
    return matchStatus && matchSearch;
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

  const openCreate = () => { setEditingClient(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (c: CrmClient) => {
    setEditingClient(c);
    setForm({
      business_name: c.business_name || '',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      email: c.email || '',
      phone: c.phone || '',
      website: c.website || '',
      source: c.source || '',
      status: c.status,
      notes: c.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.business_name.trim() && !form.first_name.trim()) {
      toast.error('Business name or first name is required.');
      return;
    }
    if (!userId) return;

    const payload = {
      business_name: form.business_name,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      source: form.source || null,
      status: form.status,
      notes: form.notes || null,
    };

    if (editingClient) {
      const { error } = await supabase.from('clients')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingClient.id);
      if (error) { toast.error('Could not update.'); return; }
      toast.success('Client updated.');
    } else {
      const { error } = await supabase.from('clients')
        .insert({ user_id: userId, ...payload });
      if (error) { toast.error('Could not create.'); return; }
      toast.success('Client added.');
    }

    setDialogOpen(false);
    fetchClients();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Could not delete.');
    else { toast.success('Client deleted.'); fetchClients(); }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (error) { toast.error('Could not delete selected clients.'); return; }
    toast.success(`${ids.length} client${ids.length !== 1 ? 's' : ''} deleted.`);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    fetchClients();
  };

  const handleBulkMove = async (destination: 'leads' | 'contacts') => {
    const selectedClients = filtered.filter(c => selectedIds.has(c.id));
    setBulkMoving(true);
    try {
      if (destination === 'leads') {
        await bulkMoveClientsToLeads(selectedClients, userId!);
        toast.success(`${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} moved to Leads.`);
      } else {
        await bulkMoveClientsToContacts(selectedClients, userId!);
        toast.success(`${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} moved to Contacts.`);
      }
      setSelectedIds(new Set());
      fetchClients();
    } catch {
      toast.error('Could not move selected clients.');
    } finally {
      setBulkMoving(false);
    }
  };

  const total     = clients.length;
  const active    = clients.filter(c => c.status === 'active').length;
  const inactive  = clients.filter(c => c.status === 'inactive').length;

  const FILTERS = [
    { id: 'all' as const,       label: `All (${total})` },
    { id: 'active' as const,    label: `Active (${active})` },
    { id: 'inactive' as const,  label: `Inactive (${inactive})` },
    { id: 'paused' as const,    label: `Paused (${clients.filter(c => c.status === 'paused').length})` },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Clients</h1>
          <p className="text-muted-foreground mt-1">Confirmed customers — {total} total · {active} active</p>
        </div>
        <Button onClick={openCreate} style={{ backgroundColor: BRAND }} className="text-white gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Clients', value: total,    color: BRAND,     key: 'all'      as const },
          { label: 'Active',        value: active,   color: '#10b981', key: 'active'   as const },
          { label: 'Inactive',      value: inactive, color: '#6b7280', key: 'inactive' as const },
        ].map((s, i) => {
          const isActive = filter === s.key;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card
                className="cursor-pointer transition-all hover:shadow-md"
                style={isActive ? { outline: `2px solid ${s.color}`, outlineOffset: '2px' } : {}}
                onClick={() => setFilter(isActive ? 'all' : s.key)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <UserCheck className="w-4 h-4" />
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
                    <DropdownMenuItem onClick={() => handleBulkMove('contacts')}>Contacts</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="sm" className="h-8" onClick={() => setBulkDeleteOpen(true)}>
                  Delete
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilter(f.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={filter === f.id ? { backgroundColor: BRAND, color: '#fff' } : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8" />
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No clients found.</TableCell></TableRow>
                ) : filtered.map(client => {
                  const displayName = client.business_name || `${client.first_name} ${client.last_name}`.trim();
                  const badge = STATUS_BADGE[client.status];
                  return (
                    <TableRow key={client.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/crm-clients/${client.id}`, { state: { from: 'clients' } })}>
                      <TableCell className="w-10 px-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(client.id)}
                          onCheckedChange={() => toggleOne(client.id)}
                          className="rounded-full border-2"
                          style={selectedIds.has(client.id) ? { backgroundColor: BRAND, borderColor: BRAND } : {}}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#10b981' }}>
                            {getInitials(displayName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{displayName}</p>
                            {client.website && (
                              <a href={client.website} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] hover:underline" style={{ color: BRAND }}
                                onClick={e => e.stopPropagation()}>
                                {client.website.replace(/^https?:\/\//, '').split('/')[0]}
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.phone || '—'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.source || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(client.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(client)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-7 h-7 hover:text-destructive" onClick={() => setDeleteTarget(client)}>
                            <Trash2 className="w-3.5 h-3.5" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Business / Full Name *</Label>
              <Input placeholder="Acme Corp" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input placeholder="John" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input placeholder="Doe" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+1 555-0000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://example.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ClientStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} style={{ backgroundColor: BRAND }} className="text-white">
              {editingClient ? 'Update' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.business_name || `${deleteTarget?.first_name} ${deleteTarget?.last_name}`.trim()}</strong> will be permanently deleted.
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
            <AlertDialogTitle>Delete {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
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
