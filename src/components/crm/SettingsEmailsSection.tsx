import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Mail, Loader2, Signature, Image, Paperclip, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const BRAND = 'hsl(38, 60%, 50%)';
type SettingsTab = 'accounts' | 'signatures';

interface SenderAccount {
  id: string;
  name: string;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  signature_id: string | null;
  created_at: string;
}

interface EmailSignature {
  id: string;
  user_id: string;
  name: string;
  body: string;
  is_html: boolean;
  image_url: string | null;
  image_position: 'above' | 'below';
  updated_at: string;
}

const EMPTY_ACCOUNT_FORM = {
  name: '', from_name: '', from_email: '',
  smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '',
};

const EMPTY_SIG_FORM = {
  name: '', body: '', is_html: false,
  image_url: '', image_position: 'below' as 'above' | 'below',
};

export function SettingsEmailsSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');

  // ── Accounts state ─────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<SenderAccount | null>(null);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_FORM);
  const [savingAccount, setSavingAccount] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState<SenderAccount | null>(null);

  // ── Signatures state ────────────────────────────────────────────────────────
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [sigsLoading, setSigsLoading] = useState(true);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [editSig, setEditSig] = useState<EmailSignature | null>(null);
  const [sigForm, setSigForm] = useState(EMPTY_SIG_FORM);
  const [savingSig, setSavingSig] = useState(false);
  const [deleteSig, setDeleteSig] = useState<EmailSignature | null>(null);
  const [sigImgUploading, setSigImgUploading] = useState(false);
  const sigImgRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAccounts = async () => {
    setAccountsLoading(true);
    const { data, error } = await supabase
      .from('sender_accounts')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) toast.error('Failed to load accounts');
    else setAccounts(data ?? []);
    setAccountsLoading(false);
  };

  const fetchSignatures = async () => {
    if (!userId) return;
    setSigsLoading(true);
    const { data, error } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) toast.error('Failed to load signatures');
    else setSignatures(data ?? []);
    setSigsLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [session]);
  useEffect(() => { fetchSignatures(); }, [userId]);

  // ── Account CRUD ───────────────────────────────────────────────────────────
  const openAddAccount = () => {
    setEditAccount(null);
    setAccountForm(EMPTY_ACCOUNT_FORM);
    setAccountModalOpen(true);
  };

  const openEditAccount = (a: SenderAccount) => {
    setEditAccount(a);
    setAccountForm({
      name: a.name, from_name: a.from_name, from_email: a.from_email,
      smtp_host: a.smtp_host, smtp_port: a.smtp_port,
      smtp_user: a.smtp_user, smtp_pass: a.smtp_pass,
    });
    setAccountModalOpen(true);
  };

  const handleSaveAccount = async () => {
    if (!accountForm.name.trim() || !accountForm.from_email.trim() || !accountForm.smtp_host.trim() || !accountForm.smtp_user.trim() || !accountForm.smtp_pass.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSavingAccount(true);
    if (editAccount) {
      const { error } = await supabase.from('sender_accounts').update({ ...accountForm }).eq('id', editAccount.id);
      if (error) toast.error('Failed to update account');
      else { toast.success('Account updated'); setAccountModalOpen(false); fetchAccounts(); }
    } else {
      const { error } = await supabase.from('sender_accounts').insert({ ...accountForm, user_id: session!.user.id });
      if (error) toast.error('Failed to create account');
      else { toast.success('Account created'); setAccountModalOpen(false); fetchAccounts(); }
    }
    setSavingAccount(false);
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccount) return;
    const { error } = await supabase.from('sender_accounts').delete().eq('id', deleteAccount.id);
    if (error) toast.error('Failed to delete account');
    else { toast.success('Account deleted'); fetchAccounts(); }
    setDeleteAccount(null);
  };

  const assignSignature = async (accountId: string, signatureId: string | null) => {
    const { error } = await supabase
      .from('sender_accounts')
      .update({ signature_id: signatureId })
      .eq('id', accountId);
    if (error) toast.error('Failed to assign signature');
    else setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, signature_id: signatureId } : a));
  };

  // ── Signature CRUD ─────────────────────────────────────────────────────────
  const openAddSig = () => {
    setEditSig(null);
    setSigForm(EMPTY_SIG_FORM);
    setSigModalOpen(true);
  };

  const openEditSig = (s: EmailSignature) => {
    setEditSig(s);
    setSigForm({
      name: s.name, body: s.body, is_html: s.is_html,
      image_url: s.image_url ?? '', image_position: s.image_position,
    });
    setSigModalOpen(true);
  };

  const handleSaveSig = async () => {
    if (!sigForm.name.trim()) { toast.error('Signature name is required'); return; }
    if (!userId) return;
    setSavingSig(true);
    const payload = {
      user_id: userId,
      name: sigForm.name.trim(),
      body: sigForm.body,
      is_html: sigForm.is_html,
      image_url: sigForm.image_url || null,
      image_position: sigForm.image_position,
      updated_at: new Date().toISOString(),
    };
    if (editSig) {
      const { error } = await supabase.from('email_signatures').update(payload).eq('id', editSig.id);
      if (error) toast.error('Failed to update signature');
      else { toast.success('Signature updated'); setSigModalOpen(false); fetchSignatures(); }
    } else {
      const { error } = await supabase.from('email_signatures').insert(payload);
      if (error) toast.error('Failed to create signature');
      else { toast.success('Signature created'); setSigModalOpen(false); fetchSignatures(); }
    }
    setSavingSig(false);
  };

  const handleDeleteSig = async () => {
    if (!deleteSig) return;
    const { error } = await supabase.from('email_signatures').delete().eq('id', deleteSig.id);
    if (error) toast.error('Failed to delete signature');
    else { toast.success('Signature deleted'); fetchSignatures(); fetchAccounts(); }
    setDeleteSig(null);
  };

  const uploadSigImage = async (file: File) => {
    if (!userId) return;
    setSigImgUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/sig-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('signature-images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('signature-images').getPublicUrl(path);
      setSigForm(f => ({ ...f, image_url: publicUrl }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setSigImgUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage sender accounts and email signatures</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b">
        {(['accounts', 'signatures'] as SettingsTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#096fd3] text-[#096fd3]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'accounts' ? 'Sender Accounts' : 'Signatures'}
          </button>
        ))}
      </div>

      {/* ── ACCOUNTS TAB ── */}
      {activeTab === 'accounts' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">SMTP identities for outgoing email</p>
            <Button onClick={openAddAccount} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Mail className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No sender accounts yet</p>
                  <p className="text-xs mt-1">Add an account to start sending emails</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>SMTP Host</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">"{a.from_name}" &lt;{a.from_email}&gt;</TableCell>
                        <TableCell className="text-sm text-gray-600">{a.smtp_host}:{a.smtp_port}</TableCell>
                        <TableCell>
                          <select
                            value={a.signature_id ?? ''}
                            onChange={e => assignSignature(a.id, e.target.value || null)}
                            className="text-sm border border-input rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring max-w-[180px]"
                          >
                            <option value="">None</option>
                            {signatures.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditAccount(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteAccount(a)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── SIGNATURES TAB ── */}
      {activeTab === 'signatures' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Named signatures you can assign to sender accounts</p>
            <Button onClick={openAddSig} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
              <Plus className="w-4 h-4" /> Add Signature
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {sigsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : signatures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Signature className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No signatures yet</p>
                  <p className="text-xs mt-1">Create a signature to assign it to a sender account</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signatures.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.is_html ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.is_html ? 'HTML' : 'Text'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{s.image_url ? '✓' : '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditSig(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteSig(s)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Account modal ── */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Edit Account' : 'Add Sender Account'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {([
              ['name',       'Name',          'text',     'e.g. Ventas'],
              ['from_name',  'From Name',      'text',     'e.g. Aires Soft Ventas'],
              ['from_email', 'From Email',     'email',    'ventas@aires-soft.com'],
              ['smtp_host',  'SMTP Host',      'text',     'smtp.example.com'],
              ['smtp_port',  'SMTP Port',      'number',   '465'],
              ['smtp_user',  'SMTP User',      'text',     'ventas@aires-soft.com'],
              ['smtp_pass',  'SMTP Password',  'password', ''],
            ] as [string, string, string, string][]).map(([key, label, type, placeholder]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key} type={type} placeholder={placeholder}
                  value={String(accountForm[key as keyof typeof accountForm])}
                  onChange={e => setAccountForm(f => ({ ...f, [key]: key === 'smtp_port' ? Number(e.target.value) : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAccount} disabled={savingAccount} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
              {savingAccount && <Loader2 className="w-4 h-4 animate-spin" />}
              {editAccount ? 'Save Changes' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Signature modal ── */}
      <Dialog open={sigModalOpen} onOpenChange={setSigModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSig ? 'Edit Signature' : 'Add Signature'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sig-name">Name</Label>
              <Input id="sig-name" placeholder="e.g. Main, Support, Sales..." value={sigForm.name} onChange={e => setSigForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Body format</Label>
              <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 text-xs">
                <button onClick={() => setSigForm(f => ({ ...f, is_html: false }))}
                  className={`px-2 py-0.5 rounded transition-all ${!sigForm.is_html ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  Text
                </button>
                <button onClick={() => setSigForm(f => ({ ...f, is_html: true }))}
                  className={`px-2 py-0.5 rounded transition-all ${sigForm.is_html ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  HTML
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="sig-body">Body</Label>
              <Textarea
                id="sig-body"
                placeholder={sigForm.is_html
                  ? '<p><strong>Your Name</strong></p><p>Title | Company</p>'
                  : 'Your Name\nTitle | Company\nPhone'}
                value={sigForm.body}
                onChange={e => setSigForm(f => ({ ...f, body: e.target.value }))}
                rows={4}
                className={`resize-none text-sm ${sigForm.is_html ? 'font-mono text-xs' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> Signature Image
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Image URL or upload..."
                  value={sigForm.image_url}
                  onChange={e => setSigForm(f => ({ ...f, image_url: e.target.value }))}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs flex-shrink-0"
                  onClick={() => sigImgRef.current?.click()} disabled={sigImgUploading}>
                  {sigImgUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Paperclip className="w-3.5 h-3.5" />Upload</>}
                </Button>
                <input ref={sigImgRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadSigImage(f); e.target.value = ''; }} />
              </div>
              {sigForm.image_url && (
                <div className="space-y-1.5">
                  <img src={sigForm.image_url} alt="preview" className="max-w-[200px] max-h-[80px] object-contain rounded border" />
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Position:</span>
                    {(['above', 'below'] as const).map(pos => (
                      <button key={pos}
                        onClick={() => setSigForm(f => ({ ...f, image_position: pos }))}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${sigForm.image_position === pos ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        style={sigForm.image_position === pos ? { backgroundColor: BRAND } : {}}>
                        {pos === 'above' ? 'Above text' : 'Below text'}
                      </button>
                    ))}
                    <button onClick={() => setSigForm(f => ({ ...f, image_url: '' }))}
                      className="ml-auto text-red-400 hover:text-red-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSig} disabled={savingSig} className="gap-2 text-white" style={{ backgroundColor: BRAND }}>
              {savingSig && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {editSig ? 'Save Changes' : 'Add Signature'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete account confirm ── */}
      <AlertDialog open={!!deleteAccount} onOpenChange={open => { if (!open) setDeleteAccount(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sender account?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteAccount?.name}" will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete signature confirm ── */}
      <AlertDialog open={!!deleteSig} onOpenChange={open => { if (!open) setDeleteSig(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete signature?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteSig?.name}" will be permanently removed. Accounts using it will have no signature assigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSig} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
