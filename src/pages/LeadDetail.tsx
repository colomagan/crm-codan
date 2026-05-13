import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Building2, Phone, Save, Trash2, ExternalLink,
  ArrowRight, Clock, Mail, Globe, FileText, MapPin, Tag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { Lead } from '@/types/crm';

const BRAND = '#096fd3';
const SOURCES = ['Lead Finder', 'Instagram', 'Web', 'Referral', 'Manual', 'Other'];

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0]?.length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0]?.charAt(0).toUpperCase() || '?';
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [form, setForm] = useState<Partial<Lead>>({});

  useEffect(() => { if (id) fetchLead(); }, [id]);

  const fetchLead = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('leads').select('*').eq('id', id!).single();
    if (error || !data) { toast.error('Lead not found'); navigate(-1); return; }
    const l = data as Lead;
    setLead(l);
    setForm(l);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    const { error } = await supabase.from('leads').update({
      business_name: form.business_name || null,
      first_name: form.first_name || '',
      last_name: form.last_name || '',
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      source: form.source || null,
      city: form.city || null,
      state: form.state || null,
      country_code: form.country_code || null,
      category: form.category || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id);
    if (error) { toast.error(`Could not save: ${error.message}`); }
    else { toast.success('Lead updated'); fetchLead(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!lead) return;
    const { error } = await supabase.from('leads').delete().eq('id', lead.id);
    if (error) { toast.error('Could not delete'); } else { toast.success('Lead deleted'); navigate(-1); }
  };

  const handlePromote = async () => {
    if (!lead || !userId) return;
    setPromoting(true);
    try {
      const { error } = await supabase.from('contacts').insert({
        user_id:         userId,
        business_name:   lead.business_name   || '',
        first_name:      lead.first_name      || '',
        last_name:       lead.last_name       || '',
        email:           lead.email           || null,
        whatsapp:        lead.phone           || null,
        website:         lead.website         || null,
        type:            'LEAD_CONTACTED',
        source:          lead.source          || null,
        notes:           lead.notes           || null,
        labels:          [],
        country_code:    lead.country_code    || null,
        city:            lead.city            || null,
        category:        lead.category        || null,
        google_maps_url: lead.google_maps_url || null,
        score:           lead.score           ?? null,
        reviews_count:   lead.reviews_count   ?? null,
      });
      if (error) throw error;
      await supabase.from('leads').delete().eq('id', lead.id);
      toast.success('Moved to Contacts');
      navigate(-1);
    } catch { toast.error('Could not promote'); }
    finally { setPromoting(false); setPromoteOpen(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-transparent"
          style={{ borderTopColor: BRAND, borderRightColor: `${BRAND}40` }} />
      </div>
    );
  }

  if (!lead || !userId) return null;

  const displayName = form.business_name || `${form.first_name} ${form.last_name}`.trim() || 'No name';
  const initials = getInitials(displayName);
  const locationStr = [form.city, form.state, form.country_code].filter(Boolean).join(', ');

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
              {form.category && <p className="text-sm text-muted-foreground">{form.category}</p>}
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-600 border-amber-200">
              Lead
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPromoteOpen(true)}>
              <ArrowRight className="w-4 h-4 mr-2 text-blue-500" />
              Move to Contacts
            </Button>
            {lead.google_maps_url && (
              <Button variant="outline" size="icon" asChild>
                <a href={lead.google_maps_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
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
                <Building2 className="w-4 h-4" /> Identification
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Business / Full Name</Label>
                  <Input value={form.business_name || ''} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} className="text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Input value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Dental clinic" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Source</Label>
                <Select value={form.source || ''} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* CONTACT DATA */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Phone className="w-4 h-4" /> Contact Data
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
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <div className="flex gap-2">
                    <Input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />
                    {form.phone && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://wa.me/${(form.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
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
              </div>
            </motion.div>

            {/* LOCATION */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <MapPin className="w-4 h-4" /> Location
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={form.city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Miami" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Input value={form.state || ''} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="FL" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Input value={form.country_code || ''} onChange={e => setForm(p => ({ ...p, country_code: e.target.value }))} placeholder="US" />
                </div>
              </div>
            </motion.div>

            {/* NOTES */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <FileText className="w-4 h-4" /> Notes
              </div>
              <Textarea
                value={form.notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Internal notes about this lead..."
                rows={4}
                className="resize-none"
              />
            </motion.div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* AVATAR CARD */}
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="rounded-2xl border bg-card overflow-hidden">
              <div className="relative h-20 w-full" style={{ background: `linear-gradient(135deg, ${BRAND}33 0%, ${BRAND}99 100%)` }}>
                <div className="absolute top-2 right-3 w-10 h-10 rounded-full opacity-20" style={{ backgroundColor: BRAND }} />
                <div className="absolute top-5 right-8 w-5 h-5 rounded-full opacity-15" style={{ backgroundColor: BRAND }} />
                <div className="absolute top-1 left-4 w-6 h-6 rounded-full opacity-10" style={{ backgroundColor: BRAND }} />
              </div>
              <div className="flex flex-col items-center px-6 pb-6 -mt-10 gap-3">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
                  className="relative">
                  <motion.div animate={{ scale: [1, 1.14, 1], opacity: [0.3, 0.08, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full" style={{ backgroundColor: BRAND, margin: '-6px' }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl ring-4 ring-card"
                    style={{ background: `linear-gradient(145deg, ${BRAND}cc, ${BRAND})` }}>
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
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-600 border-amber-200">Lead</span>
                  </div>
                  {locationStr && (
                    <p className="text-xs text-muted-foreground pt-1 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" /> {locationStr}
                    </p>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* INFO CARD */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Clock className="w-4 h-4" /> Info
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{format(new Date(lead.created_at), 'dd MMM yyyy')}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="font-medium">{format(new Date(lead.updated_at), 'dd MMM yyyy')}</span>
                </div>
                {lead.source && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="font-medium">{lead.source}</span>
                    </div>
                  </>
                )}
                {lead.score != null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">⭐ {lead.score}</span>
                    </div>
                  </>
                )}
                {lead.reviews_count != null && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reviews</span>
                      <span className="font-medium">{lead.reviews_count}</span>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* QUICK ACTIONS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Tag className="w-4 h-4" /> Quick Actions
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => setPromoteOpen(true)}>
                  <ArrowRight className="w-4 h-4" /> Move to Contacts
                </Button>
                {lead.google_maps_url && (
                  <Button variant="outline" className="w-full justify-start gap-2" asChild>
                    <a href={lead.google_maps_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-4 h-4" /> Open in Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Promote confirm */}
      <AlertDialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{displayName}</strong> will be moved to <strong>Contacts</strong> and removed from Leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePromote} disabled={promoting} style={{ backgroundColor: BRAND }} className="text-white">
              {promoting ? 'Moving...' : 'Move to Contacts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{displayName}</strong> will be permanently deleted.
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
