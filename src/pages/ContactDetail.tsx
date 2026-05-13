import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Contact, Source } from '@/types/crm';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Building2, Phone, Tag, Save, Trash2, ExternalLink,
  PhoneCall, Clock, X, Plus, Mail, Globe, FileText, MapPin, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const BRAND = '#096fd3';

const SOURCES: Source[] = ['Instagram', 'Web', 'Referral', 'Manual', 'Other'];
const CHANNELS = ['WhatsApp', 'Email', 'Instagram', 'Phone'];

const DEFAULT_LABELS = [
  'VIP', 'New', 'Follow up', 'Hot lead', 'Cold lead',
  'Needs proposal', 'Negotiating', 'Closed', 'At risk', 'Churned',
];

const TYPE_INFO: Record<string, { label: string; color: string }> = {
  CLIENT:             { label: 'Client',             color: 'bg-emerald-500/15 text-emerald-600 border-emerald-200' },
  LEAD_CONTACTED:     { label: 'Lead (contacted)',   color: 'bg-blue-500/15 text-blue-600 border-blue-200' },
  LEAD_NOT_CONTACTED: { label: 'Lead',               color: 'bg-amber-500/15 text-amber-600 border-amber-200' },
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0].length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0].charAt(0).toUpperCase() || '?';
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');

  const [form, setForm] = useState<Partial<Contact & { notes: string }>>({});

  useEffect(() => {
    if (!id) return;
    fetchContact();
  }, [id]);

  // Close label picker on outside click / Esc
  useEffect(() => {
    if (!labelPickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLabelPickerOpen(false); setLabelSearch(''); } };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-label-picker]')) return;
      setLabelPickerOpen(false); setLabelSearch('');
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('mousedown', onMouseDown); };
  }, [labelPickerOpen]);

  const fetchContact = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('contacts').select('*').eq('id', id!).single();
    if (error || !data) {
      toast.error('Contact not found');
      navigate(-1);
      return;
    }
    const c = data as any;
    setContact(c);
    setForm({
      business_name: c.business_name || '',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      website: c.website || '',
      channel: c.channel || '',
      notes: c.notes || '',
      source: c.source || '',
      last_contact_date: c.last_contact_date || '',
      labels: c.labels || [],
      city: c.city || '',
      category: c.category || '',
      google_maps_url: c.google_maps_url || '',
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').update({
      business_name: form.business_name,
      first_name: form.first_name,
      last_name: form.last_name,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      website: form.website || null,
      channel: form.channel || null,
      notes: (form as any).notes || null,
      source: form.source || null,
      last_contact_date: form.last_contact_date || null,
      labels: form.labels || [],
      city: (form as any).city || null,
      category: (form as any).category || null,
      google_maps_url: (form as any).google_maps_url || null,
      updated_at: new Date().toISOString(),
    }).eq('id', contact.id);

    if (error) {
      toast.error(`Could not save: ${error.message}`);
    } else {
      toast.success('Contact updated');
      fetchContact();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!contact) return;
    const { error } = await supabase.from('contacts').delete().eq('id', contact.id);
    if (error) { toast.error('Could not delete'); } else { toast.success('Contact deleted'); navigate(-1); }
  };

  const handleMarkAsContacted = async () => {
    if (!contact) return;
    const { error } = await supabase.from('contacts').update({
      type: 'LEAD_CONTACTED',
      last_contact_date: new Date().toISOString().split('T')[0],
    }).eq('id', contact.id);
    if (error) { toast.error('Error updating contact'); }
    else { toast.success('Marked as contacted'); fetchContact(); }
  };

  const normalizeLabel = (v: string) => v.trim().replace(/\s+/g, ' ');
  const addLabel = (label: string) => {
    const n = normalizeLabel(label);
    if (!n) return;
    setForm(prev => ({ ...prev, labels: prev.labels?.includes(n) ? prev.labels : [...(prev.labels || []), n] }));
  };
  const removeLabel = (label: string) => setForm(prev => ({ ...prev, labels: prev.labels?.filter(l => l !== label) || [] }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-transparent"
          style={{ borderTopColor: BRAND, borderRightColor: `${BRAND}40` }}
        />
      </div>
    );
  }

  if (!contact || !userId) return null;

  const typeInfo = TYPE_INFO[contact.type] || TYPE_INFO.CLIENT;
  const displayName = form.business_name || `${form.first_name} ${form.last_name}`.trim() || 'No name';
  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold leading-tight">{displayName}</h1>
              {form.first_name && <p className="text-sm text-muted-foreground">{form.first_name} {form.last_name}</p>}
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {contact.type === 'LEAD_NOT_CONTACTED' && (
              <Button variant="outline" onClick={handleMarkAsContacted}>
                <PhoneCall className="w-4 h-4 mr-2 text-emerald-500" />
                Mark as contacted
              </Button>
            )}
            <Button variant="destructive" size="icon" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: BRAND }} className="text-white">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* IDENTIFICATION */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Building2 className="w-4 h-4" />
                Identification
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Business / Full Name *</Label>
                  <Input value={form.business_name || ''} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} className="text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Input value={(form as any).category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value } as any))} placeholder="e.g. Dental clinic" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <Select value={form.source || ''} onValueChange={v => setForm(p => ({ ...p, source: v as Source }))}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={(form as any).city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value } as any))} placeholder="Miami" />
                </div>
              </div>
            </motion.div>

            {/* CONTACT DATA */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Phone className="w-4 h-4" />
                Contact Data
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <Input value={form.first_name || ''} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <Input value={form.last_name || ''} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">WhatsApp / Phone</Label>
                  <div className="flex gap-2">
                    <Input value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+1 555 000 0000" />
                    {form.whatsapp && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://wa.me/${(form.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 text-emerald-500" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex gap-2">
                    <Input value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" placeholder="email@example.com" />
                    {form.email && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`mailto:${form.email}`}><Mail className="w-4 h-4 text-blue-500" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Website</Label>
                  <div className="flex gap-2">
                    <Input value={form.website || ''} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://example.com" />
                    {form.website && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={form.website} target="_blank" rel="noreferrer"><Globe className="w-4 h-4" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Google Maps URL</Label>
                  <div className="flex gap-2">
                    <Input value={(form as any).google_maps_url || ''} onChange={e => setForm(p => ({ ...p, google_maps_url: e.target.value } as any))} placeholder="https://maps.google.com/..." />
                    {(form as any).google_maps_url && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={(form as any).google_maps_url} target="_blank" rel="noreferrer"><MapPin className="w-4 h-4 text-red-500" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* NOTES */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <FileText className="w-4 h-4" />
                Notes
              </div>
              <Textarea
                value={(form as any).notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value } as any))}
                placeholder="Internal notes about this contact..."
                rows={4}
                className="resize-none"
              />
            </motion.div>


          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* AVATAR CARD */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-2xl border bg-card overflow-hidden"
            >
              <div className="relative h-20 w-full" style={{ background: `linear-gradient(135deg, ${BRAND}33 0%, ${BRAND}99 100%)` }}>
                <div className="absolute top-2 right-3 w-10 h-10 rounded-full opacity-20" style={{ backgroundColor: BRAND }} />
                <div className="absolute top-5 right-8 w-5 h-5 rounded-full opacity-15" style={{ backgroundColor: BRAND }} />
                <div className="absolute top-1 left-4 w-6 h-6 rounded-full opacity-10" style={{ backgroundColor: BRAND }} />
              </div>

              <div className="flex flex-col items-center px-6 pb-6 -mt-10 gap-3">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative"
                >
                  <motion.div
                    animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.08, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: BRAND, margin: '-6px' }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl ring-4 ring-card"
                    style={{ background: `linear-gradient(145deg, ${BRAND}cc, ${BRAND})` }}
                  >
                    <span className="text-2xl font-black tracking-tight select-none" style={{ color: '#ffffff', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                      {initials}
                    </span>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-center space-y-0.5">
                  <p className="font-bold text-base leading-tight">{displayName}</p>
                  {(form.first_name || form.last_name) && form.business_name && (
                    <p className="text-sm text-muted-foreground">{form.first_name} {form.last_name}</p>
                  )}
                  <div className="pt-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* LABELS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Tag className="w-4 h-4" />
                Labels
              </div>

              <div className="flex flex-wrap items-center gap-2" data-label-picker>
                {(form.labels || []).length === 0 ? (
                  <span className="text-sm text-muted-foreground">No labels</span>
                ) : (
                  (form.labels || []).map(label => (
                    <Badge key={label} variant={DEFAULT_LABELS.includes(label) ? 'default' : 'secondary'}
                      className="gap-1 cursor-pointer"
                      style={DEFAULT_LABELS.includes(label) ? { backgroundColor: BRAND } : {}}
                      onClick={() => removeLabel(label)} title="Remove label">
                      {label} <X className="w-3 h-3" />
                    </Badge>
                  ))
                )}

                <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full"
                  onClick={() => { setLabelPickerOpen(v => !v); setLabelSearch(''); }} title="Add label">
                  <Plus className="w-4 h-4" />
                </Button>

                {labelPickerOpen && (
                  <div data-label-picker className="relative w-full">
                    <div className="absolute right-0 top-2 w-full rounded-xl border bg-popover shadow-lg p-2 z-20">
                      <div className="p-1.5">
                        <Input
                          autoFocus value={labelSearch} onChange={e => setLabelSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const selected = new Set(form.labels || []);
                            const query = labelSearch.trim().toLowerCase();
                            const options = DEFAULT_LABELS.filter(l => !selected.has(l)).filter(l => query ? l.toLowerCase().includes(query) : true);
                            if (options.length > 0) addLabel(options[0]);
                            else if (labelSearch.trim() && !selected.has(normalizeLabel(labelSearch))) addLabel(labelSearch);
                            setLabelPickerOpen(false); setLabelSearch('');
                          }}
                          placeholder="Search or create label..." className="h-9"
                        />
                      </div>
                      {(() => {
                        const selected = new Set(form.labels || []);
                        const query = labelSearch.trim().toLowerCase();
                        const options = DEFAULT_LABELS.filter(l => !selected.has(l)).filter(l => query ? l.toLowerCase().includes(query) : true);
                        const canCreate = !!labelSearch.trim() && !selected.has(normalizeLabel(labelSearch));
                        return (
                          <div className="max-h-56 overflow-auto p-1">
                            {options.length === 0 && !canCreate && <div className="px-3 py-2 text-sm text-muted-foreground">No results.</div>}
                            {options.map(label => (
                              <button key={label} type="button"
                                className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted transition"
                                onClick={() => { addLabel(label); setLabelPickerOpen(false); setLabelSearch(''); }}>
                                <span>{label}</span>
                                <span className="text-xs text-muted-foreground">Default</span>
                              </button>
                            ))}
                            {canCreate && (
                              <button type="button"
                                className="mt-1 w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted transition"
                                onClick={() => { addLabel(labelSearch); setLabelPickerOpen(false); setLabelSearch(''); }}>
                                <span>Create "{normalizeLabel(labelSearch)}"</span>
                                <span className="text-xs text-muted-foreground">New</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* INFO CARD */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Clock className="w-4 h-4" />
                Info
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{format(new Date(contact.created_at), 'dd MMM yyyy')}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{format(new Date(contact.updated_at), 'dd MMM yyyy')}</span>
                </div>
                {contact.last_contact_date && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last contact</span>
                      <span className="font-medium">{format(new Date(contact.last_contact_date), 'dd MMM yyyy')}</span>
                    </div>
                  </>
                )}
                {contact.source && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium">{contact.source}</span>
                    </div>
                  </>
                )}
                {contact.channel && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Channel</span>
                      <span className="font-medium">{contact.channel}</span>
                    </div>
                  </>
                )}
                {contact.score != null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{contact.score}</span>
                    </div>
                  </>
                )}
                {contact.reviews_count != null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reviews</span>
                      <span className="font-medium">{contact.reviews_count}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* CHANNEL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <PhoneCall className="w-4 h-4" />
                Contact Status
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Preferred channel</Label>
                  <Select value={form.channel || ''} onValueChange={v => setForm(p => ({ ...p, channel: v as any }))}>
                    <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Last contact date</Label>
                  <Input type="date" value={form.last_contact_date || ''} onChange={e => setForm(p => ({ ...p, last_contact_date: e.target.value }))} />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{displayName}</strong> from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// helper used in label picker
function normalizeLabel(v: string) { return v.trim().replace(/\s+/g, ' '); }
