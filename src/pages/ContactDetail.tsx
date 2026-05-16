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
  ArrowLeft, ArrowRight, Phone, Tag, Save, Trash2, ExternalLink,
  PhoneCall, Clock, X, Plus, Mail, Globe, FileText, MapPin, Star,
  Briefcase, Building2, Instagram, Linkedin, Activity, Ruler, Utensils,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttachmentsSection } from '@/components/crm/AttachmentsSection';
import { Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const BRAND = '#d97706';

const SOURCES: Source[] = ['Instagram', 'Web', 'Referral', 'Manual', 'Other'];
const CHANNELS = ['WhatsApp', 'Email', 'Instagram', 'Phone'];
const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level', 'Founder/Owner'];

const DEFAULT_LABELS = [
  'VIP', 'New', 'Follow up', 'Hot lead', 'Cold lead',
  'Needs proposal', 'Negotiating', 'Closed', 'At risk', 'Churned',
];

const TYPE_INFO: Record<string, { label: string; color: string }> = {
  CLIENT:             { label: 'Client',             color: 'bg-emerald-500/15 text-emerald-600 border-emerald-200' },
  LEAD_CONTACTED:     { label: 'Lead (contacted)',   color: 'bg-amber-500/15 text-amber-600 border-amber-200' },
  LEAD_NOT_CONTACTED: { label: 'Lead',               color: 'bg-amber-500/15 text-amber-600 border-amber-200' },
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words[0].length >= 2) return words[0].substring(0, 2).toUpperCase();
  return words[0].charAt(0).toUpperCase() || '?';
}

type FormState = Partial<Contact & { notes: string }>;

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveToLeadOpen, setMoveToLeadOpen] = useState(false);
  const [moveToClientOpen, setMoveToClientOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');

  const [form, setForm] = useState<FormState>({});

  useEffect(() => { if (!id) return; fetchContact(); }, [id]);

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
    if (error || !data) { toast.error('Contact not found'); navigate(-1); return; }
    const c = data as any;
    setContact(c);
    setForm({
      first_name:           c.first_name           || '',
      last_name:            c.last_name            || '',
      email:                c.email                || '',
      whatsapp:             c.whatsapp             || '',
      job_title:            c.job_title            || '',
      headline:             c.headline             || '',
      seniority_level:      c.seniority_level      || '',
      industry:             c.industry             || '',
      functional_area:      c.functional_area      || '',
      linkedin:             c.linkedin             || '',
      instagram:            c.instagram            || '',
      website:              c.website              || '',
      company_linkedin:     c.company_linkedin     || '',
      company_domain:       c.company_domain       || '',
      company_founded_year: c.company_founded_year || '',
      company_city:         c.company_city         || '',
      company_country:      c.company_country      || '',
      age:                  c.age                  ?? null,
      height_cm:            c.height_cm            ?? null,
      weight_kg:            c.weight_kg            ?? null,
      body_fat_pct:         c.body_fat_pct         ?? null,
      muscle_mass_kg:       c.muscle_mass_kg       ?? null,
      neck_cm:              c.neck_cm              ?? null,
      shoulders_cm:         c.shoulders_cm         ?? null,
      chest_cm:             c.chest_cm             ?? null,
      bicep_l_cm:           c.bicep_l_cm           ?? null,
      bicep_r_cm:           c.bicep_r_cm           ?? null,
      waist_cm:             c.waist_cm             ?? null,
      hips_cm:              c.hips_cm              ?? null,
      thigh_l_cm:           c.thigh_l_cm           ?? null,
      thigh_r_cm:           c.thigh_r_cm           ?? null,
      calf_l_cm:            c.calf_l_cm            ?? null,
      calf_r_cm:            c.calf_r_cm            ?? null,
      kcal_current:         c.kcal_current         ?? null,
      protein_g:            c.protein_g            ?? null,
      carbs_g:              c.carbs_g              ?? null,
      fat_g:                c.fat_g                ?? null,
      water_liters:         c.water_liters         ?? null,
      supplements:          c.supplements          || '',
      channel:              c.channel              || '',
      notes:                c.notes                || '',
      source:               c.source               || '',
      last_contact_date:    c.last_contact_date    || '',
      labels:               c.labels               || [],
      city:                 c.city                 || '',
      country_code:         c.country_code         || '',
      category:             c.category             || '',
      google_maps_url:      c.google_maps_url      || '',
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').update({
      first_name:           form.first_name           || '',
      last_name:            form.last_name            || '',
      email:                form.email                || null,
      whatsapp:             form.whatsapp             || null,
      job_title:            (form as any).job_title            || null,
      headline:             (form as any).headline             || null,
      seniority_level:      (form as any).seniority_level      || null,
      industry:             (form as any).industry             || null,
      functional_area:      (form as any).functional_area      || null,
      linkedin:             (form as any).linkedin             || null,
      instagram:            (form as any).instagram            || null,
      website:              form.website              || null,
      company_linkedin:     (form as any).company_linkedin     || null,
      company_domain:       (form as any).company_domain       || null,
      company_founded_year: (form as any).company_founded_year || null,
      company_city:         (form as any).company_city         || null,
      company_country:      (form as any).company_country      || null,
      age:                  (form as any).age                  ?? null,
      height_cm:            (form as any).height_cm            ?? null,
      weight_kg:            (form as any).weight_kg            ?? null,
      body_fat_pct:         (form as any).body_fat_pct         ?? null,
      muscle_mass_kg:       (form as any).muscle_mass_kg       ?? null,
      neck_cm:              (form as any).neck_cm              ?? null,
      shoulders_cm:         (form as any).shoulders_cm         ?? null,
      chest_cm:             (form as any).chest_cm             ?? null,
      bicep_l_cm:           (form as any).bicep_l_cm           ?? null,
      bicep_r_cm:           (form as any).bicep_r_cm           ?? null,
      waist_cm:             (form as any).waist_cm             ?? null,
      hips_cm:              (form as any).hips_cm              ?? null,
      thigh_l_cm:           (form as any).thigh_l_cm           ?? null,
      thigh_r_cm:           (form as any).thigh_r_cm           ?? null,
      calf_l_cm:            (form as any).calf_l_cm            ?? null,
      calf_r_cm:            (form as any).calf_r_cm            ?? null,
      kcal_current:         (form as any).kcal_current         ?? null,
      protein_g:            (form as any).protein_g            ?? null,
      carbs_g:              (form as any).carbs_g              ?? null,
      fat_g:                (form as any).fat_g                ?? null,
      water_liters:         (form as any).water_liters         ?? null,
      supplements:          (form as any).supplements          || null,
      channel:              form.channel              || null,
      notes:                (form as any).notes       || null,
      source:               form.source               || null,
      last_contact_date:    form.last_contact_date    || null,
      labels:               form.labels               || [],
      city:                 (form as any).city        || null,
      country_code:         form.country_code         || null,
      category:             (form as any).category    || null,
      google_maps_url:      (form as any).google_maps_url || null,
      updated_at:           new Date().toISOString(),
    }).eq('id', contact.id);

    if (error) { toast.error(`Could not save: ${error.message}`); }
    else { toast.success('Contact updated'); fetchContact(); }
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

  const handleMoveToLead = async () => {
    if (!contact || !userId) return;
    setMoving(true);
    try {
      const f = form as any;
      const { data: newLead, error } = await supabase.from('leads').insert({
        user_id:              userId,
        business_name:        '',
        first_name:           form.first_name           || '',
        last_name:            form.last_name            || '',
        email:                form.email                || null,
        phone:                form.whatsapp             || null,
        website:              form.website              || null,
        instagram:            f.instagram               || null,
        linkedin:             f.linkedin                || null,
        job_title:            f.job_title               || null,
        industry:             f.industry                || null,
        headline:             f.headline                || null,
        seniority_level:      f.seniority_level         || null,
        company_linkedin:     f.company_linkedin        || null,
        functional_area:      f.functional_area         || null,
        company_domain:       f.company_domain          || null,
        company_founded_year: f.company_founded_year    || null,
        company_city:         f.company_city            || null,
        company_country:      f.company_country         || null,
        age:                  f.age                     ?? null,
        height_cm:            f.height_cm               ?? null,
        weight_kg:            f.weight_kg               ?? null,
        body_fat_pct:         f.body_fat_pct            ?? null,
        muscle_mass_kg:       f.muscle_mass_kg          ?? null,
        neck_cm:              f.neck_cm                 ?? null,
        shoulders_cm:         f.shoulders_cm            ?? null,
        chest_cm:             f.chest_cm                ?? null,
        bicep_l_cm:           f.bicep_l_cm              ?? null,
        bicep_r_cm:           f.bicep_r_cm              ?? null,
        waist_cm:             f.waist_cm                ?? null,
        hips_cm:              f.hips_cm                 ?? null,
        thigh_l_cm:           f.thigh_l_cm              ?? null,
        thigh_r_cm:           f.thigh_r_cm              ?? null,
        calf_l_cm:            f.calf_l_cm               ?? null,
        calf_r_cm:            f.calf_r_cm               ?? null,
        kcal_current:         f.kcal_current            ?? null,
        protein_g:            f.protein_g               ?? null,
        carbs_g:              f.carbs_g                 ?? null,
        fat_g:                f.fat_g                   ?? null,
        water_liters:         f.water_liters            ?? null,
        supplements:          f.supplements             || null,
        source:               form.source               || null,
        notes:                f.notes                   || null,
        city:                 f.city                    || null,
        country_code:         form.country_code         || null,
        category:             f.category                || null,
        google_maps_url:      f.google_maps_url         || null,
        score:                contact.score             ?? null,
        reviews_count:        contact.reviews_count     ?? null,
      }).select('id').single();
      if (error) throw error;
      const newLeadId = (newLead as any)?.id;
      if (newLeadId) {
        await supabase.from('crm_attachment_folders')
          .update({ entity_type: 'lead', entity_id: newLeadId })
          .eq('entity_type', 'contact').eq('entity_id', contact.id);
        await supabase.from('crm_attachments')
          .update({ entity_type: 'lead', entity_id: newLeadId })
          .eq('entity_type', 'contact').eq('entity_id', contact.id);
      }
      await supabase.from('contacts').delete().eq('id', contact.id);
      toast.success('Movido a Leads');
      navigate(newLeadId ? `/leads/${newLeadId}` : '/leads');
    } catch { toast.error('No se pudo mover a Leads.'); }
    finally { setMoving(false); setMoveToLeadOpen(false); }
  };

  const handleMoveToClient = async () => {
    if (!contact || !userId) return;
    setMoving(true);
    try {
      const f = form as any;
      const { data: newClient, error } = await supabase.from('clients').insert({
        user_id:         userId,
        business_name:   '',
        first_name:      form.first_name  || '',
        last_name:       form.last_name   || '',
        email:           form.email       || null,
        phone:           form.whatsapp    || null,
        website:         form.website     || null,
        source:          form.source      || null,
        notes:           f.notes          || null,
        status:          'active',
        city:            f.city           || null,
        category:        f.category       || null,
        country_code:    form.country_code || null,
        labels:          form.labels       || [],
        channel:         form.channel      || null,
        google_maps_url: f.google_maps_url || null,
        score:           contact.score     ?? null,
      }).select('id').single();
      if (error) throw error;
      const newClientId = (newClient as any)?.id;
      if (newClientId) {
        await supabase.from('crm_attachment_folders')
          .update({ entity_type: 'contact', entity_id: newClientId })
          .eq('entity_type', 'contact').eq('entity_id', contact.id);
        await supabase.from('crm_attachments')
          .update({ entity_type: 'contact', entity_id: newClientId })
          .eq('entity_type', 'contact').eq('entity_id', contact.id);
      }
      await supabase.from('contacts').delete().eq('id', contact.id);
      toast.success('Movido a Clientes');
      navigate(newClientId ? `/crm-clients/${newClientId}` : '/clients');
    } catch { toast.error('No se pudo mover a Clientes.'); }
    finally { setMoving(false); setMoveToClientOpen(false); }
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
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-4 border-transparent"
          style={{ borderTopColor: BRAND, borderRightColor: `${BRAND}40` }} />
      </div>
    );
  }

  if (!contact || !userId) return null;

  const typeInfo = TYPE_INFO[contact.type] || TYPE_INFO.LEAD_CONTACTED;
  const displayName = `${form.first_name || ''} ${form.last_name || ''}`.trim() || form.email || 'No name';
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
              {(form as any).job_title && <p className="text-sm text-muted-foreground">{(form as any).job_title}</p>}
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
            <Button variant="outline" size="sm" onClick={() => setMoveToLeadOpen(true)} disabled={moving}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Mover a Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMoveToClientOpen(true)} disabled={moving}>
              Mover a Cliente <ArrowRight className="w-4 h-4 ml-1.5 text-emerald-500" />
            </Button>
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
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) } as any))}
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
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) } as any))}
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
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value === '' ? null : Number(e.target.value) } as any))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Suplementos</Label>
                    <Textarea
                      placeholder="Ej: Creatina 5g, Proteína whey, Omega 3..."
                      value={(form as any).supplements || ''}
                      onChange={e => setForm(p => ({ ...p, supplements: e.target.value || null } as any))}
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
                <Input value={(form as any).headline || ''} onChange={e => setForm(p => ({ ...p, headline: e.target.value } as any))} placeholder="e.g. Marketing Manager @ Acme | ex-Google" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Job Title</Label>
                  <Input value={(form as any).job_title || ''} onChange={e => setForm(p => ({ ...p, job_title: e.target.value } as any))} placeholder="e.g. Marketing Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Seniority Level</Label>
                  <Select value={(form as any).seniority_level || ''} onValueChange={v => setForm(p => ({ ...p, seniority_level: v } as any))}>
                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      {SENIORITY_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Industry</Label>
                  <Input value={(form as any).industry || ''} onChange={e => setForm(p => ({ ...p, industry: e.target.value } as any))} placeholder="e.g. SaaS, Healthcare" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Functional Area</Label>
                  <Input value={(form as any).functional_area || ''} onChange={e => setForm(p => ({ ...p, functional_area: e.target.value } as any))} placeholder="e.g. Marketing, Engineering" />
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
                    <Input value={(form as any).linkedin || ''} onChange={e => setForm(p => ({ ...p, linkedin: e.target.value } as any))} placeholder="linkedin.com/in/username" />
                    {(form as any).linkedin && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={(form as any).linkedin.startsWith('http') ? (form as any).linkedin : `https://${(form as any).linkedin}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-blue-600" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1"><Instagram className="w-3.5 h-3.5" /> Instagram</Label>
                  <div className="flex gap-2">
                    <Input value={(form as any).instagram || ''} onChange={e => setForm(p => ({ ...p, instagram: e.target.value } as any))} placeholder="@username" />
                    {(form as any).instagram && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={`https://instagram.com/${((form as any).instagram || '').replace('@', '')}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-pink-500" /></a>
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
                    <Input value={(form as any).company_linkedin || ''} onChange={e => setForm(p => ({ ...p, company_linkedin: e.target.value } as any))} placeholder="linkedin.com/company/acme" />
                    {(form as any).company_linkedin && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={(form as any).company_linkedin.startsWith('http') ? (form as any).company_linkedin : `https://${(form as any).company_linkedin}`} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 text-blue-600" /></a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company Domain</Label>
                  <Input value={(form as any).company_domain || ''} onChange={e => setForm(p => ({ ...p, company_domain: e.target.value } as any))} placeholder="acme.com" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Founded Year</Label>
                  <Input value={(form as any).company_founded_year || ''} onChange={e => setForm(p => ({ ...p, company_founded_year: e.target.value } as any))} placeholder="2010" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Company City</Label>
                  <Input value={(form as any).company_city || ''} onChange={e => setForm(p => ({ ...p, company_city: e.target.value } as any))} placeholder="San Francisco" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Company Country</Label>
                  <Input value={(form as any).company_country || ''} onChange={e => setForm(p => ({ ...p, company_country: e.target.value } as any))} placeholder="United States" />
                </div>
              </div>
            </motion.div>

            {/* PERSONAL LOCATION */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border bg-card p-6 space-y-5" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <MapPin className="w-4 h-4" /> Personal Location
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={(form as any).city || ''} onChange={e => setForm(p => ({ ...p, city: e.target.value } as any))} placeholder="Miami" />
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
                  <Select value={form.source || ''} onValueChange={v => setForm(p => ({ ...p, source: v as Source }))}>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Input value={(form as any).category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value } as any))} placeholder="e.g. Dental clinic" />
                </div>
              </div>
            </motion.div>

            {/* NOTES */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <FileText className="w-4 h-4" /> Notes
              </div>
              <Textarea
                value={(form as any).notes || ''}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value } as any))}
                placeholder="Internal notes about this contact..."
                rows={4}
                className="resize-none"
              />
            </motion.div>

            {/* ATTACHMENTS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <Paperclip className="w-4 h-4" /> Archivos adjuntos
              </div>
              <AttachmentsSection
                entityType="contact"
                entityId={contact.id}
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
                  {(form as any).job_title && (
                    <p className="text-sm text-muted-foreground">{(form as any).job_title}</p>
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
                <Tag className="w-4 h-4" /> Labels
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
                <Clock className="w-4 h-4" /> Info
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
              </div>
            </motion.div>

            {/* CONTACT STATUS */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border bg-card p-6 space-y-4" style={{ borderTop: `3px solid ${BRAND}` }}>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: BRAND }}>
                <PhoneCall className="w-4 h-4" /> Contact Status
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

      <AlertDialog open={moveToLeadOpen} onOpenChange={setMoveToLeadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Mover a Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{displayName}</strong> se moverá a la sección de Leads. Todos los datos y archivos se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToLead} disabled={moving}>
              {moving ? 'Moviendo...' : 'Mover a Lead'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={moveToClientOpen} onOpenChange={setMoveToClientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Mover a Clientes?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{displayName}</strong> se moverá a la sección de Clientes. Todos los datos y archivos se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToClient} disabled={moving}>
              {moving ? 'Moviendo...' : 'Mover a Cliente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizeLabel(v: string) { return v.trim().replace(/\s+/g, ' '); }
