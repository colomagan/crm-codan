import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mail, X, Send, Target, Users, UserCheck,
  Phone, Globe, MapPin, Star, Plus, Eye, Code2, Type,
  Sparkles, BookTemplate, Image, Pen, Save, Trash2,
  ChevronDown, Check, AlertCircle, Loader2, Signature, Paperclip, History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Lead, Contact, CrmClient } from '@/types/crm';

const BRAND = 'hsl(38, 60%, 50%)';
type Tab = 'leads' | 'contacts' | 'clients';
type ComposeTab = 'write' | 'preview' | 'ai' | 'templates';
type EditorMode = 'text' | 'html';
type AiTone = 'professional' | 'friendly' | 'formal' | 'casual' | 'persuasive';

interface SenderAccount { id: string; name: string; from_email: string; }
interface Recipient { id: string; name: string; email: string; manual?: boolean; }
interface Template  { id: string; name: string; subject: string; body: string; isHtml: boolean; createdAt: string; }
interface Signature { name: string; body: string; isHtml: boolean; imageUrl?: string; imagePosition?: 'above' | 'below' | 'none'; }

const TONE_LABELS: Record<AiTone, string> = {
  professional: 'Professional', friendly: 'Friendly',
  formal: 'Formal', casual: 'Casual', persuasive: 'Persuasive',
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: 'Active',   color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  inactive: { label: 'Inactive', color: 'bg-gray-50 text-gray-600 border border-gray-200' },
  paused:   { label: 'Paused',   color: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

const LS_TEMPLATES  = 'crm_email_templates';

function getInitials(name: string) {
  const w = name.trim().split(/\s+/);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return (w[0]?.substring(0, 2) ?? '?').toUpperCase();
}
function getName(item: Lead | Contact | CrmClient): string {
  return item.business_name || `${item.first_name} ${item.last_name}`.trim() || '—';
}
function sortByEmail<T extends { email: string | null }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => (!!b.email ? 1 : 0) - (!!a.email ? 1 : 0));
}

// ── Compose tab button ────────────────────────────────────────────────────────
function TabBtn({ id, label, icon: Icon, active, onClick }: {
  id: ComposeTab; label: string; icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
        active ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
      style={active ? { backgroundColor: BRAND } : {}}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolBtn({ icon: Icon, label, onClick, active }: {
  icon: React.ElementType; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
      }`}
      style={active ? { backgroundColor: BRAND } : {}}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EmailSenderSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const navigate = useNavigate();

  // ── Table data ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [clients,   setClients]   = useState<CrmClient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());

  // ── Panel state ────────────────────────────────────────────────────────────
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [composeTab,   setComposeTab]   = useState<ComposeTab>('write');
  const [editorMode,   setEditorMode]   = useState<EditorMode>('text');
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [manualEmail,  setManualEmail]  = useState('');
  const [extraRecipients, setExtraRecipients] = useState<Recipient[]>([]);

  // ── Signature ──────────────────────────────────────────────────────────────
  const [signature,      setSignature]      = useState<Signature>({ name: '', body: '', isHtml: false, imageUrl: '', imagePosition: 'below' });
  const [useSignature,   setUseSignature]   = useState(false);
  const [editSignature,  setEditSignature]  = useState(false);
  const [sigDraft,       setSigDraft]       = useState<Signature>(signature);
  const [sigImgUploading, setSigImgUploading] = useState(false);
  const sigImgInputRef = useRef<HTMLInputElement>(null);

  // ── Templates ──────────────────────────────────────────────────────────────
  const [templates,     setTemplates]     = useState<Template[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TEMPLATES) ?? '[]'); }
    catch { return []; }
  });
  const [templateName,  setTemplateName]  = useState('');
  const [savingTpl,     setSavingTpl]     = useState(false);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const [aiPurpose,   setAiPurpose]   = useState('');
  const [aiTone,      setAiTone]      = useState<AiTone>('professional');
  const [aiPoints,    setAiPoints]    = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [sending,     setSending]     = useState(false);
  const [toneOpen,    setToneOpen]    = useState(false);

  // ── Image insert ───────────────────────────────────────────────────────────
  const [imgUrl,      setImgUrl]      = useState('');
  const [imgDialog,   setImgDialog]   = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const attachInputRef = useRef<HTMLInputElement>(null);

  // ── Sender accounts ────────────────────────────────────────────────────────
  const [senderAccounts,    setSenderAccounts]    = useState<SenderAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: l }, { data: c }, { data: cl }] = await Promise.all([
      supabase.from('leads').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('contacts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    setLeads((l as Lead[]) ?? []);
    setContacts((c as Contact[]) ?? []);
    setClients((cl as CrmClient[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setSelected(new Set()); setSearch(''); }, [activeTab]);

  // Auto-load signature when selected account changes
  useEffect(() => {
    if (!selectedAccountId) return;
    const account = senderAccounts.find(a => a.id === selectedAccountId) as (typeof senderAccounts[0] & { signature_id?: string }) | undefined;
    const sigId = (account as any)?.signature_id;
    if (!sigId) {
      const empty: Signature = { name: '', body: '', isHtml: false, imageUrl: '', imagePosition: 'below' };
      setSignature(empty);
      setSigDraft(empty);
      setUseSignature(false);
      return;
    }
    supabase.from('email_signatures').select('*').eq('id', sigId).maybeSingle().then(({ data }) => {
      if (data) {
        const sig: Signature = {
          name: '',
          body: data.body ?? '',
          isHtml: data.is_html,
          imageUrl: data.image_url ?? '',
          imagePosition: data.image_position ?? 'below',
        };
        setSignature(sig);
        setSigDraft(sig);
        setUseSignature(true);
      }
    });
  }, [selectedAccountId, senderAccounts]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('sender_accounts')
      .select('id, name, from_email, signature_id')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const accounts = data ?? [];
        setSenderAccounts(accounts);
        if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
      });
  }, [userId]);

  // ── Rows for current tab ───────────────────────────────────────────────────
  const rawRows: (Lead | Contact | CrmClient)[] =
    activeTab === 'leads' ? leads : activeTab === 'contacts' ? contacts : clients;

  const filtered = sortByEmail(
    rawRows.filter(r => {
      const q = search.toLowerCase();
      return !q || getName(r).toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q);
    })
  );
  const filteredWithEmail = filtered.filter(r => !!r.email);

  const toggle = (id: string) => {
    const row = filtered.find(r => r.id === id);
    if (!row?.email) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === filteredWithEmail.length ? new Set() : new Set(filteredWithEmail.map(r => r.id)));
  };

  // ── Recipients (table selection + manual) ─────────────────────────────────
  const tableRecipients: Recipient[] = filtered
    .filter(r => selected.has(r.id))
    .map(r => ({ id: r.id, name: getName(r), email: r.email ?? '' }));

  const allRecipients: Recipient[] = [...tableRecipients, ...extraRecipients];

  const removeRecipient = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    setExtraRecipients(prev => prev.filter(r => r.id !== id));
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (!email) return;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) { toast.error('Invalid email address'); return; }
    if (allRecipients.some(r => r.email === email)) { toast.error('Email already added'); return; }
    setExtraRecipients(prev => [...prev, { id: `manual-${Date.now()}`, name: email, email, manual: true }]);
    setManualEmail('');
  };

  // ── Full email body (with optional signature) ──────────────────────────────
  const buildSignatureHtml = (sig: Signature) => {
    const imgTag = sig.imageUrl ? `<img src="${sig.imageUrl}" alt="signature" style="max-width:260px;height:auto;display:block;margin:8px 0"/>` : '';
    const bodyPart = sig.isHtml ? sig.body : `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${sig.body}</pre>`;
    if (!sig.imageUrl) return bodyPart;
    return sig.imagePosition === 'above' ? `${imgTag}${bodyPart}` : `${bodyPart}${imgTag}`;
  };

  const fullBody = useSignature && (signature.body || signature.imageUrl)
    ? `${body}\n\n<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>\n${buildSignatureHtml(signature)}`
    : body;

  // ── Signature save ─────────────────────────────────────────────────────────
  const saveSignature = async () => {
    setSignature(sigDraft);
    await supabase.from('email_signatures').upsert({
      user_id: userId,
      body: sigDraft.body,
      is_html: sigDraft.isHtml,
      image_url: sigDraft.imageUrl ?? null,
      image_position: sigDraft.imagePosition ?? 'below',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setEditSignature(false);
    toast.success('Signature saved');
  };

  const uploadSignatureImage = async (file: File) => {
    if (!userId) return;
    setSigImgUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/signature.${ext}`;
      const { error } = await supabase.storage.from('signature-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('signature-images').getPublicUrl(path);
      setSigDraft(d => ({ ...d, imageUrl: publicUrl }));
      toast.success('Image uploaded');
    } catch (e) {
      toast.error('Image upload failed');
    } finally {
      setSigImgUploading(false);
    }
  };

  // ── Templates ──────────────────────────────────────────────────────────────
  const saveTemplate = () => {
    if (!templateName.trim()) { toast.error('Enter a template name'); return; }
    const tpl: Template = {
      id: `tpl-${Date.now()}`, name: templateName.trim(),
      subject, body, isHtml: editorMode === 'html',
      createdAt: new Date().toISOString(),
    };
    const next = [...templates, tpl];
    setTemplates(next);
    localStorage.setItem(LS_TEMPLATES, JSON.stringify(next));
    setTemplateName('');
    setSavingTpl(false);
    toast.success(`Template "${tpl.name}" saved`);
  };

  const loadTemplate = (tpl: Template) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
    setEditorMode(tpl.isHtml ? 'html' : 'text');
    setComposeTab('write');
    toast.success(`Template "${tpl.name}" loaded`);
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    localStorage.setItem(LS_TEMPLATES, JSON.stringify(next));
  };

  // ── AI generation ──────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      toast.error('Add VITE_ANTHROPIC_API_KEY to your .env file to use AI');
      return;
    }
    if (!aiPurpose.trim()) { toast.error('Describe the email purpose'); return; }
    setAiLoading(true);
    try {
      const prompt = `Write a ${aiTone} email for the following purpose: "${aiPurpose}".${aiPoints.trim() ? `\nKey points to include:\n${aiPoints}` : ''}

Return your response in this exact JSON format:
{"subject": "...", "body": "..."}

The body should be well-structured HTML with inline styles suitable for email clients. Use <p>, <ul>, <li>, <strong> tags. Keep it concise and focused.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-request-blocking': 'false',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const text = data.content?.[0]?.text ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(match[0]);
      setSubject(parsed.subject ?? '');
      setBody(parsed.body ?? '');
      setEditorMode('html');
      setComposeTab('write');
      toast.success('Email generated — review it in the Write tab');
    } catch (e) {
      toast.error('AI generation failed. Check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Insert image ───────────────────────────────────────────────────────────
  const insertImage = () => {
    if (!imgUrl.trim()) return;
    const tag = editorMode === 'html'
      ? `<img src="${imgUrl}" alt="image" style="max-width:100%;height:auto;display:block;margin:12px 0"/>`
      : `\n[Image: ${imgUrl}]\n`;
    const el = bodyRef.current;
    if (el) {
      const start = el.selectionStart;
      setBody(prev => prev.slice(0, start) + tag + prev.slice(el.selectionEnd));
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + tag.length; el.focus(); }, 0);
    } else {
      setBody(prev => prev + tag);
    }
    setImgUrl('');
    setImgDialog(false);
  };

  // ── Attachments ────────────────────────────────────────────────────────────
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (allRecipients.length === 0 || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      const serializedAttachments = await Promise.all(
        attachments.map(async (file) => ({
          filename: file.name,
          content: await fileToBase64(file),
          contentType: file.type || 'application/octet-stream',
        }))
      );

      // Insert log first to get the server-generated ID, then pass it to send-email
      // so the tracking pixel URLs always reference the correct email_logs row.
      const { data: logData, error: logError } = await supabase.from('email_logs').insert({
        user_id: session?.user?.id,
        from_email: senderAccounts.find(a => a.id === selectedAccountId)?.from_email ?? '',
        subject: subject.trim(),
        body_html: fullBody,
        signature: useSignature ? signature.body : null,
        recipients: allRecipients.map(r => ({ id: r.id, name: r.name, email: r.email, status: 'sent' })),
        attachments: attachments.map(f => ({ filename: f.name, size: f.size, contentType: f.type })),
        total_sent: 0,
        total_failed: 0,
        status: 'sent',
      }).select('id').single();

      if (logError) throw new Error(logError.message);
      const logId = logData.id;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          recipients: allRecipients.map(r => ({ email: r.email, name: r.name })),
          subject: subject.trim(),
          html: fullBody,
          attachments: serializedAttachments,
          account_id: selectedAccountId,
          log_id: logId,
        },
      });

      if (error) throw new Error(error.message);

      const { sent, failed } = data as { sent: number; failed: number };
      const emailStatus = failed === 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';

      // Update log with real send results
      supabase.from('email_logs').update({
        total_sent: sent,
        total_failed: failed,
        status: emailStatus,
      }).eq('id', logId).then(({ error }) => { if (error) console.error('email_logs update:', error); });

      if (failed > 0 && sent === 0) {
        toast.error(`Failed to send to all ${failed} recipients`);
      } else if (failed > 0) {
        toast.warning(`Sent to ${sent}, failed for ${failed} recipients`);
      } else {
        toast.success(`Email sent to ${sent} recipient${sent !== 1 ? 's' : ''}`);
        setPanelOpen(false);
        setSubject('');
        setBody('');
        setAttachments([]);
        setSelected(new Set());
        setExtraRecipients([]);
      }
    } catch (err) {
      toast.error(`Send failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  };

  // ── Stat cards config ──────────────────────────────────────────────────────
  const statCards = [
    { tab: 'leads'    as Tab, label: 'Leads',    icon: Target,    color: BRAND,      value: leads.length    },
    { tab: 'contacts' as Tab, label: 'Contacts', icon: Users,     color: '#8b5cf6',  value: contacts.length },
    { tab: 'clients'  as Tab, label: 'Clients',  icon: UserCheck, color: '#10b981',  value: clients.length  },
  ];
  const colCount    = activeTab === 'leads' ? 9 : 8;
  const avatarColor = activeTab === 'leads' ? BRAND : activeTab === 'contacts' ? '#3b82f6' : '#10b981';

  // ── Preview HTML ───────────────────────────────────────────────────────────
  const previewHtml = editorMode === 'html'
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;line-height:1.6}p{margin:0 0 16px}</style></head><body>${fullBody}</body></html>`
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;line-height:1.6;white-space:pre-wrap}</style></head><body>${fullBody.replace(/</g,'&lt;')}</body></html>`;

  return (
    <div className="p-8 space-y-6 relative overflow-hidden">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Email Sender</h1>
          <p className="text-muted-foreground mt-1">Select recipients and compose your email</p>
        </div>
        <Button variant="outline" className="gap-2" style={{ color: BRAND, borderColor: BRAND }} onClick={() => navigate('/email-history')}>
          <History className="w-4 h-4" /> Email History
        </Button>
      </motion.div>

      {/* Stat cards / tab switcher */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          const isActive = activeTab === s.tab;
          return (
            <motion.div key={s.tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card
                className={`cursor-pointer transition-all ${isActive ? 'ring-2' : 'hover:shadow-md'}`}
                style={isActive ? { boxShadow: `0 0 0 2px ${s.color}` } : {}}
                onClick={() => setActiveTab(s.tab)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <Icon className="w-4 h-4" />
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
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {(selected.size > 0 || extraRecipients.length > 0) && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                    <Button onClick={() => setPanelOpen(true)} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
                      <Mail className="w-4 h-4" />
                      Compose ({selected.size + extraRecipients.length})
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex-1" />
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filteredWithEmail.length > 0 && selected.size === filteredWithEmail.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  {activeTab === 'leads' && <><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Location</TableHead><TableHead>Category</TableHead><TableHead>Score</TableHead><TableHead>Source</TableHead><TableHead>Added</TableHead></>}
                  {activeTab === 'contacts' && <><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Channel</TableHead><TableHead>Source</TableHead><TableHead>Added</TableHead></>}
                  {activeTab === 'clients' && <><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Since</TableHead></>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={colCount} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={colCount} className="text-center py-10 text-muted-foreground">No results found.</TableCell></TableRow>
                ) : filtered.map(row => {
                  const name    = getName(row);
                  const isChecked = selected.has(row.id);
                  const noEmail = !row.email;
                  return (
                    <TableRow key={row.id}
                      className={`transition-colors ${noEmail ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/30'}`}
                      onClick={() => { if (!noEmail) toggle(row.id); }}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isChecked} onCheckedChange={() => toggle(row.id)} disabled={noEmail} />
                      </TableCell>

                      {activeTab === 'leads' && (() => {
                        const lead = row as Lead;
                        const loc = [lead.city, lead.state, lead.country_code].filter(Boolean).join(', ');
                        return <>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor }}>{getInitials(name)}</div>
                              <div>
                                <p className="font-medium text-sm">{name}</p>
                                {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[11px] hover:underline" style={{ color: BRAND }}><Globe className="w-2.5 h-2.5" />{lead.website.replace(/^https?:\/\//, '').split('/')[0]}</a>}
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
                          <TableCell>{loc ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3 flex-shrink-0" />{loc}</span> : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{lead.category || '—'}</TableCell>
                          <TableCell>{lead.score != null ? <span className="flex items-center gap-1 text-xs font-medium"><Star className="w-3 h-3 text-amber-400" />{lead.score}</span> : '—'}</TableCell>
                          <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{lead.source || '—'}</span></TableCell>
                          <TableCell className="text-muted-foreground text-xs">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                        </>;
                      })()}

                      {activeTab === 'contacts' && (() => {
                        const contact = row as Contact;
                        return <>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor }}>{getInitials(name)}</div>
                              <span className="text-sm">{name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{contact.email || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{contact.whatsapp || '—'}</TableCell>
                          <TableCell>{contact.channel ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">{contact.channel}</span> : '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{contact.source || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(contact.created_at), 'dd MMM yyyy')}</TableCell>
                        </>;
                      })()}

                      {activeTab === 'clients' && (() => {
                        const client = row as CrmClient;
                        const badge = STATUS_BADGE[client.status] ?? STATUS_BADGE.inactive;
                        return <>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: avatarColor }}>{getInitials(name)}</div>
                              <div>
                                <p className="text-sm font-medium">{name}</p>
                                {(client as CrmClient & { website?: string }).website && <a href={(client as CrmClient & { website?: string }).website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] hover:underline" style={{ color: BRAND }}>{(client as CrmClient & { website?: string }).website!.replace(/^https?:\/\//, '').split('/')[0]}</a>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{client.email || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{client.phone || '—'}</TableCell>
                          <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.label}</span></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{client.source || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{format(new Date(client.created_at), 'dd MMM yyyy')}</TableCell>
                        </>;
                      })()}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Overlay ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div className="fixed inset-0 bg-black/40 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPanelOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Compose Panel ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            className="fixed top-0 right-0 h-full bg-background border-l shadow-2xl z-50 flex flex-col"
            style={{ width: '62%' }}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
              <div className="flex items-center gap-2" style={{ color: BRAND }}>
                <Send className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Compose Email</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{allRecipients.length} recipient{allRecipients.length !== 1 ? 's' : ''}</span>
                <Button variant="ghost" size="icon" onClick={() => setPanelOpen(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* ── Left: Recipients + compose area ── */}
              <div className="flex-1 flex flex-col overflow-hidden">

                {/* Recipients bar */}
                <div className="px-5 pt-4 pb-3 border-b space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</Label>
                  <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-offset-0" style={{ ['--tw-ring-color' as string]: BRAND }}>
                    {allRecipients.map(r => (
                      <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: r.manual ? '#7c3aed' : BRAND }}>
                        {r.email}
                        <button onClick={() => removeRecipient(r.id)} className="ml-0.5 hover:opacity-70"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <input
                      type="email"
                      placeholder="Add email address..."
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addManualEmail(); } }}
                      className="flex-1 min-w-[180px] text-xs bg-transparent outline-none placeholder-gray-300 py-0.5"
                    />
                    {manualEmail && (
                      <button onClick={addManualEmail} className="text-xs px-2 py-0.5 rounded-md font-medium text-white" style={{ backgroundColor: BRAND }}>
                        Add
                      </button>
                    )}
                  </div>
                  {allRecipients.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Select recipients from the table or type email addresses above</p>
                  )}
                </div>

                {/* Compose tabs */}
                <div className="px-5 pt-3 pb-2 border-b flex items-center gap-1 bg-gray-50/50">
                  <TabBtn id="write"     label="Write"     icon={Pen}           active={composeTab === 'write'}     onClick={() => setComposeTab('write')}     />
                  <TabBtn id="preview"   label="Preview"   icon={Eye}           active={composeTab === 'preview'}   onClick={() => setComposeTab('preview')}   />
                  <TabBtn id="ai"        label="AI Writer" icon={Sparkles}      active={composeTab === 'ai'}        onClick={() => setComposeTab('ai')}        />
                  <TabBtn id="templates" label="Templates" icon={BookTemplate}  active={composeTab === 'templates'} onClick={() => setComposeTab('templates')} />
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">

                  {/* ── Write tab ── */}
                  {composeTab === 'write' && (
                    <div className="px-5 py-4 space-y-4">
                      {/* From */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</Label>
                        {senderAccounts.length === 0 ? (
                          <p className="text-xs text-amber-600">No sender accounts configured — add one in Settings → Emails</p>
                        ) : (
                          <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {senderAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.from_email})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</Label>
                        <Input placeholder="Email subject..." value={subject} onChange={e => setSubject(e.target.value)} className="font-medium" />
                      </div>

                      {/* Toolbar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setEditorMode('text')}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${editorMode === 'text' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <Type className="w-3.5 h-3.5" /> Text
                          </button>
                          <button
                            onClick={() => setEditorMode('html')}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium transition-all ${editorMode === 'html' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                          >
                            <Code2 className="w-3.5 h-3.5" /> HTML
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <ToolBtn icon={Image} label="Insert image" onClick={() => setImgDialog(true)} />
                          <ToolBtn icon={Paperclip} label="Attach file" onClick={() => attachInputRef.current?.click()} />
                          <input
                            ref={attachInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={e => {
                              const files = Array.from(e.target.files ?? []);
                              setAttachments(prev => [...prev, ...files]);
                              e.target.value = '';
                            }}
                          />
                          <ToolBtn icon={Signature} label="Signature" onClick={() => setUseSignature(v => !v)} active={useSignature} />
                          <ToolBtn icon={Save} label="Save as template" onClick={() => setSavingTpl(true)} />
                        </div>
                      </div>

                      {/* Image dialog */}
                      <AnimatePresence>
                        {imgDialog && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <Input placeholder="Image URL..." value={imgUrl} onChange={e => setImgUrl(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && insertImage()} className="h-8 text-sm flex-1" autoFocus />
                            <Button size="sm" onClick={insertImage} className="h-8 text-white" style={{ backgroundColor: BRAND }}>Insert</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setImgDialog(false); setImgUrl(''); }}>Cancel</Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Save template dialog */}
                      <AnimatePresence>
                        {savingTpl && (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="flex gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg"
                          >
                            <Input placeholder="Template name..." value={templateName} onChange={e => setTemplateName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveTemplate()} className="h-8 text-sm flex-1" autoFocus />
                            <Button size="sm" onClick={saveTemplate} className="h-8 text-white bg-violet-600 hover:bg-violet-700">Save</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setSavingTpl(false); setTemplateName(''); }}>Cancel</Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Editor */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {editorMode === 'html' ? 'HTML Body' : 'Message'}
                        </Label>
                        <Textarea
                          ref={bodyRef}
                          placeholder={editorMode === 'html'
                            ? '<p>Hello {{name}},</p>\n<p>Your message here...</p>'
                            : 'Write your message here...'}
                          value={body}
                          onChange={e => setBody(e.target.value)}
                          rows={14}
                          className={`resize-none text-sm ${editorMode === 'html' ? 'font-mono text-xs leading-relaxed' : ''}`}
                        />
                      </div>

                      {/* Signature section */}
                      <AnimatePresence>
                        {useSignature && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                                <Signature className="w-3.5 h-3.5" /> Signature
                              </span>
                              <button onClick={() => { setSigDraft(signature); setEditSignature(v => !v); }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                {editSignature ? 'Done' : 'Edit'}
                              </button>
                            </div>
                            {editSignature ? (
                              <div className="p-3 space-y-3">
                                {/* Text mode toggle */}
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 text-xs">
                                    <button onClick={() => setSigDraft(d => ({ ...d, isHtml: false }))}
                                      className={`px-2 py-0.5 rounded ${!sigDraft.isHtml ? 'bg-white shadow' : 'text-gray-500'}`}>Text</button>
                                    <button onClick={() => setSigDraft(d => ({ ...d, isHtml: true }))}
                                      className={`px-2 py-0.5 rounded ${sigDraft.isHtml ? 'bg-white shadow' : 'text-gray-500'}`}>HTML</button>
                                  </div>
                                </div>
                                <Textarea value={sigDraft.body} onChange={e => setSigDraft(d => ({ ...d, body: e.target.value }))}
                                  placeholder={sigDraft.isHtml ? '<p><strong>Your Name</strong></p><p>Title | Company</p>' : 'Your Name\nTitle | Company\nPhone'}
                                  rows={3} className={`text-sm resize-none ${sigDraft.isHtml ? 'font-mono text-xs' : ''}`} />

                                {/* Image section */}
                                <div className="space-y-1.5">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Image className="w-3.5 h-3.5" /> Signature Image
                                  </p>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Image URL or upload..."
                                      value={sigDraft.imageUrl ?? ''}
                                      onChange={e => setSigDraft(d => ({ ...d, imageUrl: e.target.value }))}
                                      className="h-8 text-xs flex-1"
                                    />
                                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs flex-shrink-0"
                                      onClick={() => sigImgInputRef.current?.click()} disabled={sigImgUploading}>
                                      {sigImgUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Paperclip className="w-3.5 h-3.5" />Upload</>}
                                    </Button>
                                    <input ref={sigImgInputRef} type="file" accept="image/*" className="hidden"
                                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignatureImage(f); e.target.value = ''; }} />
                                  </div>
                                  {sigDraft.imageUrl && (
                                    <div className="space-y-1.5">
                                      <img src={sigDraft.imageUrl} alt="preview" className="max-w-[200px] max-h-[80px] object-contain rounded border" />
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <span>Position:</span>
                                        {(['above', 'below'] as const).map(pos => (
                                          <button key={pos} onClick={() => setSigDraft(d => ({ ...d, imagePosition: pos }))}
                                            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${sigDraft.imagePosition === pos ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            style={sigDraft.imagePosition === pos ? { backgroundColor: BRAND } : {}}>
                                            {pos === 'above' ? 'Above text' : 'Below text'}
                                          </button>
                                        ))}
                                        <button onClick={() => setSigDraft(d => ({ ...d, imageUrl: '' }))}
                                          className="ml-auto text-red-400 hover:text-red-600 transition-colors">
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <Button size="sm" onClick={saveSignature} className="text-white h-8" style={{ backgroundColor: BRAND }}>
                                  <Save className="w-3.5 h-3.5 mr-1" /> Save signature
                                </Button>
                              </div>
                            ) : (
                              <div className="p-3">
                                {(signature.body || signature.imageUrl)
                                  ? <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: buildSignatureHtml(signature) }} />
                                  : <p className="text-xs text-gray-400 italic">No signature set. Click Edit to create one.</p>
                                }
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Attachments */}
                      {attachments.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" /> Attachments ({attachments.length})
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((file, i) => (
                              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700 border">
                                <Paperclip className="w-3 h-3 text-gray-400" />
                                <span className="max-w-[140px] truncate">{file.name}</span>
                                <span className="text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
                                <button onClick={() => removeAttachment(i)} className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Preview tab ── */}
                  {composeTab === 'preview' && (
                    <div className="h-full flex flex-col">
                      {subject && (
                        <div className="px-5 py-3 border-b bg-gray-50">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Subject</p>
                          <p className="text-sm font-semibold text-gray-800">{subject}</p>
                        </div>
                      )}
                      <div className="flex-1 relative">
                        {fullBody ? (
                          <iframe
                            srcDoc={previewHtml}
                            className="w-full h-full border-0"
                            title="Email preview"
                            sandbox="allow-same-origin"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-300">
                            <Eye className="w-12 h-12 mb-3" />
                            <p className="text-sm font-medium">Nothing to preview</p>
                            <p className="text-xs mt-1">Write something in the Write tab first</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── AI Writer tab ── */}
                  {composeTab === 'ai' && (
                    <div className="px-5 py-5 space-y-5">
                      <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ background: `${BRAND}06`, borderColor: `${BRAND}20` }}>
                        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: BRAND }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: BRAND }}>AI Email Writer</p>
                          <p className="text-xs text-gray-500 mt-0.5">Describe what you need and the AI will write a complete email for you. Requires <code className="bg-gray-100 px-1 rounded">VITE_ANTHROPIC_API_KEY</code> in your .env file.</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Purpose *</Label>
                        <Textarea
                          placeholder="e.g. Follow up with a potential client about our SaaS product after a demo call last week..."
                          value={aiPurpose}
                          onChange={e => setAiPurpose(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tone</Label>
                        <div className="relative">
                          <button
                            onClick={() => setToneOpen(v => !v)}
                            className="w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium">{TONE_LABELS[aiTone]}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${toneOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {toneOpen && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 overflow-hidden"
                              >
                                {(Object.entries(TONE_LABELS) as [AiTone, string][]).map(([key, label]) => (
                                  <button key={key} onClick={() => { setAiTone(key); setToneOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                                  >
                                    {label}
                                    {aiTone === key && <Check className="w-4 h-4" style={{ color: BRAND }} />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key points <span className="normal-case font-normal text-gray-400">(optional)</span></Label>
                        <Textarea
                          placeholder="• Mention the 20% discount expiring Friday&#10;• Reference their pain point with team onboarding&#10;• Include a clear CTA to book a call"
                          value={aiPoints}
                          onChange={e => setAiPoints(e.target.value)}
                          rows={4}
                          className="resize-none text-sm"
                        />
                      </div>

                      <Button
                        onClick={generateWithAI}
                        disabled={aiLoading || !aiPurpose.trim()}
                        className="w-full gap-2 text-white h-10"
                        style={{ backgroundColor: BRAND }}
                      >
                        {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Email</>}
                      </Button>
                    </div>
                  )}

                  {/* ── Templates tab ── */}
                  {composeTab === 'templates' && (
                    <div className="px-5 py-5 space-y-4">
                      {/* Save current */}
                      <div className="p-4 rounded-xl border border-dashed bg-gray-50/50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Save current as template</p>
                        <div className="flex gap-2">
                          <Input placeholder="Template name..." value={templateName} onChange={e => setTemplateName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveTemplate()} className="h-9 text-sm" />
                          <Button onClick={saveTemplate} disabled={!templateName.trim()} className="h-9 text-white gap-1.5 flex-shrink-0" style={{ backgroundColor: BRAND }}>
                            <Save className="w-3.5 h-3.5" /> Save
                          </Button>
                        </div>
                      </div>

                      {/* Template list */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved templates ({templates.length})</p>
                        {templates.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                            <BookTemplate className="w-10 h-10 mb-2" />
                            <p className="text-sm font-medium">No templates yet</p>
                            <p className="text-xs mt-1">Save an email to reuse it later</p>
                          </div>
                        ) : (
                          <AnimatePresence>
                            {templates.map(tpl => (
                              <motion.div key={tpl.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-start justify-between gap-3 p-3 bg-white border rounded-xl hover:shadow-sm transition-shadow"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{tpl.name}</p>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${tpl.isHtml ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {tpl.isHtml ? 'HTML' : 'Text'}
                                    </span>
                                  </div>
                                  {tpl.subject && <p className="text-xs text-gray-400 truncate">Subject: {tpl.subject}</p>}
                                  <p className="text-[10px] text-gray-300 mt-0.5">{format(new Date(tpl.createdAt), 'dd MMM yyyy')}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => loadTemplate(tpl)}
                                    className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-80"
                                    style={{ backgroundColor: BRAND }}>
                                    Load
                                  </button>
                                  <button onClick={() => deleteTemplate(tpl.id)}
                                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Panel footer */}
                <div className="px-5 py-4 border-t bg-gray-50/50 flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    {allRecipients.length > 0
                      ? `Sending to ${allRecipients.length} recipient${allRecipients.length !== 1 ? 's' : ''}`
                      : 'No recipients selected'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setPanelOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleSend}
                      disabled={allRecipients.length === 0 || !subject.trim() || !body.trim() || sending || !selectedAccountId}
                      className="gap-2 text-white"
                      style={{ backgroundColor: BRAND }}
                    >
                      {sending
                        ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                        : <><Send className="w-4 h-4" />Send email</>
                      }
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
