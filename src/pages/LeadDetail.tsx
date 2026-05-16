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
  ArrowRight, Clock, Mail, Globe, FileText, MapPin, Tag, Briefcase,
  Instagram, Linkedin, Activity, Ruler, Utensils,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttachmentsSection } from '@/components/crm/AttachmentsSection';
import { Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { Lead } from '@/types/crm';

const BRAND = '#096fd3';
const SOURCES = ['Lead Finder', 'Instagram', 'Web', 'Referral', 'Manual', 'Other'];
const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level', 'Founder/Owner'];

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
      first_name: form.first_name || '',
      last_name: form.last_name || '',
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
      age: form.age ?? null,
      height_cm: form.height_cm ?? null,
      weight_kg: form.weight_kg ?? null,
      body_fat_pct: form.body_fat_pct ?? null,
      muscle_mass_kg: form.muscle_mass_kg ?? null,
      neck_cm: form.neck_cm ?? null,
      shoulders_cm: form.shoulders_cm ?? null,
      chest_cm: form.chest_cm ?? null,
      bicep_l_cm: form.bicep_l_cm ?? null,
      bicep_r_cm: form.bicep_r_cm ?? null,
      waist_cm: form.waist_cm ?? null,
      hips_cm: form.hips_cm ?? null,
      thigh_l_cm: form.thigh_l_cm ?? null,
      thigh_r_cm: form.thigh_r_cm ?? null,
      calf_l_cm: form.calf_l_cm ?? null,
      calf_r_cm: form.calf_r_cm ?? null,
      kcal_current: form.kcal_current ?? null,
      protein_g: form.protein_g ?? null,
      carbs_g: form.carbs_g ?? null,
      fat_g: form.fat_g ?? null,
      water_liters: form.water_liters ?? null,
      supplements: form.supplements || null,
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
      const { data: insertData, error } = await supabase.from('contacts').insert({
        user_id:              userId,
        business_name:        '',
        first_name:           lead.first_name           || '',
        last_name:            lead.last_name            || '',
        email:                lead.email                || null,
        whatsapp:             lead.phone                || null,
        website:              lead.website              || null,
        instagram:            lead.instagram            || null,
        linkedin:             lead.linkedin             || null,
        job_title:            lead.job_title            || null,
        industry:             lead.industry             || null,
        headline:             lead.headline             || null,
        seniority_level:      lead.seniority_level      || null,
        company_linkedin:     lead.company_linkedin     || null,
        functional_area:      lead.functional_area      || null,
        company_domain:       lead.company_domain       || null,
        company_founded_year: lead.company_founded_year || null,
        company_city:         lead.company_city         || null,
        company_country:      lead.company_country      || null,
        age:                  lead.age                  ?? null,
        height_cm:            lead.height_cm            ?? null,
        weight_kg:            lead.weight_kg            ?? null,
        body_fat_pct:         lead.body_fat_pct         ?? null,
        muscle_mass_kg:       lead.muscle_mass_kg       ?? null,
        neck_cm:              lead.neck_cm              ?? null,
        shoulders_cm:         lead.shoulders_cm         ?? null,
        chest_cm:             lead.chest_cm             ?? null,
        bicep_l_cm:           lead.bicep_l_cm           ?? null,
        bicep_r_cm:           lead.bicep_r_cm           ?? null,
        waist_cm:             lead.waist_cm             ?? null,
        hips_cm:              lead.hips_cm              ?? null,
        thigh_l_cm:           lead.thigh_l_cm           ?? null,
        thigh_r_cm:           lead.thigh_r_cm           ?? null,
        calf_l_cm:            lead.calf_l_cm            ?? null,
        calf_r_cm:            lead.calf_r_cm            ?? null,
        kcal_current:         lead.kcal_current         ?? null,
        protein_g:            lead.protein_g            ?? null,
        carbs_g:              lead.carbs_g              ?? null,
        fat_g:                lead.fat_g                ?? null,
        water_liters:         lead.water_liters         ?? null,
        supplements:          lead.supplements          || null,
        type:                 'LEAD_CONTACTED',
        source:               lead.source               || null,
        notes:                lead.notes                || null,
        labels:               [],
        country_code:         lead.country_code         || null,
        city:                 lead.city                 || null,
        category:             lead.category             || null,
        google_maps_url:      lead.google_maps_url      || null,
        score:                lead.score                ?? null,
        reviews_count:        lead.reviews_count        ?? null,
      }).select('id').single();
      if (error) throw error;
      const newContactId = (insertData as any)?.id;
      if (newContactId) {
        await supabase.from('crm_attachment_folders')
          .update({ entity_type: 'contact', entity_id: newContactId })
          .eq('entity_type', 'lead').eq('entity_id', lead.id);
        await supabase.from('crm_attachments')
          .update({ entity_type: 'contact', entity_id: newContactId })
          .eq('entity_type', 'lead').eq('entity_id', lead.id);
      }
      await supabase.from('leads').delete().eq('id', lead.id);
      toast.success('Moved to Contacts');
      navigate(newContactId ? `/clients/${newContactId}` : -1 as any);
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

  const displayName = `${form.first_name || ''} ${form.last_name || ''}`.trim() || form.email || 'No name';
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
              {(form.job_title || form.category) && <p className="text-sm text-muted-foreground">{form.job_title || form.category}</p>}
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

            {/* CONTACT */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Phone className="w-4 h-4" /> Contact
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
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone / WhatsApp</Label>
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
              </div>
            </motion.div>

            {/* FÍSICO · MEDIDAS · NUTRICIÓN */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <Tabs defaultValue="body">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="body" className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Físico
                  </TabsTrigger>
                  <TabsTrigger value="measurements" className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5" /> Medidas
                  </TabsTrigger>
                  <TabsTrigger value="nutrition" className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" /> Nutrición
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1 — Físico */}
                <TabsContent value="body" className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {([
                      { label: 'Peso (kg)',       key: 'weight_kg',      placeholder: '75' },
                      { label: 'Altura (cm)',      key: 'height_cm',      placeholder: '175' },
                      { label: 'Edad (años)',      key: 'age',            placeholder: '30' },
                      { label: '% Grasa',          key: 'body_fat_pct',   placeholder: '18' },
                      { label: 'Músculo (kg)',     key: 'muscle_mass_kg', placeholder: '35' },
                    ] as const).map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Input
                          type="number" placeholder={f.placeholder}
                          value={(form as any)[f.key] ?? ''}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 2 — Medidas */}
                <TabsContent value="measurements" className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {([
                      { label: 'Cuello (cm)',      key: 'neck_cm' },
                      { label: 'Hombros (cm)',     key: 'shoulders_cm' },
                      { label: 'Pecho (cm)',       key: 'chest_cm' },
                      { label: 'Bícep Izq. (cm)',  key: 'bicep_l_cm' },
                      { label: 'Bícep Der. (cm)',  key: 'bicep_r_cm' },
                      { label: 'Cintura (cm)',     key: 'waist_cm' },
                      { label: 'Cadera (cm)',      key: 'hips_cm' },
                      { label: 'Muslo Izq. (cm)',  key: 'thigh_l_cm' },
                      { label: 'Muslo Der. (cm)',  key: 'thigh_r_cm' },
                      { label: 'Gemelo Izq. (cm)', key: 'calf_l_cm' },
                      { label: 'Gemelo Der. (cm)', key: 'calf_r_cm' },
                    ] as const).map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Input
                          type="number" placeholder="—"
                          value={(form as any)[f.key] ?? ''}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab 3 — Nutrición */}
                <TabsContent value="nutrition" className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {([
                      { label: 'Calorías actuales (kcal)', key: 'kcal_current',  placeholder: '2000' },
                      { label: 'Proteína (g)',              key: 'protein_g',     placeholder: '150' },
                      { label: 'Carbohidratos (g)',         key: 'carbs_g',       placeholder: '200' },
                      { label: 'Grasas (g)',                key: 'fat_g',         placeholder: '70' },
                      { label: 'Agua (litros)',             key: 'water_liters',  placeholder: '2.5' },
                    ] as const).map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{f.label}</Label>
                        <Input
                          type="number" placeholder={f.placeholder}
                          value={(form as any)[f.key] ?? ''}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Suplementos</Label>
                    <Textarea
                      placeholder="Ej: Creatina 5g, Proteína whey, Omega 3..."
                      value={(form as any).supplements || ''}
                      onChange={e => setForm(p => ({ ...p, supplements: e.target.value || null }))}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>

            {/* PROFESSIONAL */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Briefcase className="w-4 h-4" /> Professional
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Headline</Label>
                <Input value={form.headline || ''} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Marketing Manager @ Acme | ex-Google" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Job Title</Label>
                  <Input value={form.job_title || ''} onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))} placeholder="e.g. Marketing Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Seniority Level</Label>
                  <Select value={form.seniority_level || ''} onValueChange={v => setForm(p => ({ ...p, seniority_level: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {SENIORITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Industry</Label>
                  <Input value={form.industry || ''} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. SaaS, Healthcare" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Functional Area</Label>
                  <Input value={form.functional_area || ''} onChange={e => setForm(p => ({ ...p, functional_area: e.target.value }))} placeholder="e.g. Marketing, Engineering" />
                </div>
              </div>
            </motion.div>

            {/* SOCIAL & WEB */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Globe className="w-4 h-4" /> Social & Web
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label>
                  <div className="flex gap-2">
                    <Input value={form.linkedin || ''} onChange={e => setForm(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/username" />
                    {form.linkedin && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-blue-600" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> Instagram</Label>
                  <div className="flex gap-2">
                    <Input value={form.instagram || ''} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@username" />
                    {form.instagram && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://instagram.com/${form.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-pink-500" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</Label>
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

            {/* COMPANY */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Building2 className="w-4 h-4" /> Company
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company LinkedIn</Label>
                  <div className="flex gap-2">
                    <Input value={form.company_linkedin || ''} onChange={e => setForm(p => ({ ...p, company_linkedin: e.target.value }))} placeholder="linkedin.com/company/acme" />
                    {form.company_linkedin && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={form.company_linkedin.startsWith('http') ? form.company_linkedin : `https://${form.company_linkedin}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-blue-600" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Domain</Label>
                  <Input value={form.company_domain || ''} onChange={e => setForm(p => ({ ...p, company_domain: e.target.value }))} placeholder="acme.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Founded Year</Label>
                  <Input value={form.company_founded_year || ''} onChange={e => setForm(p => ({ ...p, company_founded_year: e.target.value }))} placeholder="2010" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company City</Label>
                  <Input value={form.company_city || ''} onChange={e => setForm(p => ({ ...p, company_city: e.target.value }))} placeholder="San Francisco" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Company Country</Label>
                  <Input value={form.company_country || ''} onChange={e => setForm(p => ({ ...p, company_country: e.target.value }))} placeholder="United States" />
                </div>
              </div>
            </motion.div>

            {/* LOCATION */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <MapPin className="w-4 h-4" /> Personal Location
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

            {/* META */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Tag className="w-4 h-4" /> Meta
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Source</Label>
                  <Select value={form.source || ''} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Input value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Dental clinic" />
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

            {/* ATTACHMENTS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Paperclip className="w-4 h-4" /> Archivos adjuntos
              </div>
              <AttachmentsSection
                entityType="lead"
                entityId={lead.id}
                userId={userId}
                brand={BRAND}
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
                  {(form.job_title || form.headline) && (
                    <p className="text-sm text-muted-foreground">{form.job_title || form.headline}</p>
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
