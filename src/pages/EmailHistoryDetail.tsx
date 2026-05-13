import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Image, File, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const BRAND = '#096fd3';

interface Recipient { id: string; name: string; email: string; status: 'sent' | 'failed'; }
interface Attachment { filename: string; size: number; contentType: string; }
interface EmailOpen { recipient_email: string; opened_at: string; }

interface EmailLog {
  id: string;
  sent_at: string;
  from_email: string;
  subject: string;
  body_html: string;
  signature: string | null;
  recipients: Recipient[];
  attachments: Attachment[] | null;
  total_sent: number;
  total_failed: number;
  status: 'sent' | 'partial' | 'failed';
}

function StatusBadge({ status }: { status: EmailLog['status'] }) {
  const map = {
    sent:    { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Sent' },
    partial: { cls: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Partial' },
    failed:  { cls: 'bg-red-50 text-red-700 border border-red-200', label: 'Failed' },
  };
  const { cls, label } = map[status];
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>{label}</span>;
}

function OpenBadge({ count }: { count: number }) {
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
      opened {count}×
    </span>
  );
}

function RecipientBadge({ status }: { status: 'sent' | 'failed' }) {
  return status === 'sent'
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">sent</span>
    : <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">failed</span>;
}

function getInitials(name: string) {
  const w = name.trim().split(/\s+/);
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
  return (w[0]?.substring(0, 2) ?? '?').toUpperCase();
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500" />;
  if (contentType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

const previewWrapper = (html: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px;line-height:1.6}p{margin:0 0 16px}</style></head><body>${html}</body></html>`;

export default function EmailHistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<EmailLog | null>(null);
  const [opens, setOpens] = useState<EmailOpen[]>([]);
  const [loading, setLoading] = useState(true);
  const [sigOpen, setSigOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: logData }, { data: opensData }] = await Promise.all([
        supabase.from('email_logs').select('*').eq('id', id).single(),
        supabase.from('email_opens').select('recipient_email, opened_at').eq('email_log_id', id),
      ]);
      setLog(logData as EmailLog);
      setOpens((opensData ?? []) as EmailOpen[]);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading...</div>;
  if (!log) return <div className="p-8 text-muted-foreground text-sm">Log not found.</div>;

  const successRate = log.total_sent + log.total_failed > 0
    ? Math.round((log.total_sent / (log.total_sent + log.total_failed)) * 100)
    : 0;

  const uniqueOpeners = new Set(opens.map(o => o.recipient_email));
  const openRate = log.total_sent > 0
    ? Math.round((uniqueOpeners.size / log.total_sent) * 100)
    : 0;
  const openCountByEmail = opens.reduce<Record<string, number>>((acc, o) => {
    acc[o.recipient_email] = (acc[o.recipient_email] ?? 0) + 1;
    return acc;
  }, {});

  const shortId = log.id.split('-')[0].toUpperCase();

  return (
    <div className="p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/email-history')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to History
          </Button>
          <span className="text-xs text-muted-foreground font-mono">{shortId}…</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-5 gap-6">
        {/* Left: preview (60%) */}
        <div className="col-span-3 space-y-3">
          <div className="rounded-lg border bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 truncate">
            {log.subject}
          </div>
          <div className="rounded-lg border overflow-hidden" style={{ height: '600px' }}>
            <iframe
              srcDoc={previewWrapper(log.body_html)}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              title="Email preview"
            />
          </div>
        </div>

        {/* Right: metadata (40%) */}
        <div className="col-span-2 space-y-4">
          {/* Status + date */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <StatusBadge status={log.status} />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(log.sent_at), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              <p className="text-sm"><span className="text-muted-foreground">From: </span>{log.from_email}</p>
              <p className="text-sm"><span className="text-muted-foreground">Subject: </span>{log.subject}</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{log.total_sent}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{log.total_failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: BRAND }}>{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
            </CardContent>
          </Card>

          {/* Open Rate */}
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold" style={{ color: BRAND }}>{openRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {uniqueOpeners.size} of {log.total_sent} recipient{log.total_sent !== 1 ? 's' : ''} opened
              </p>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-sm font-semibold">Recipients ({log.recipients.length})</p>
            </CardHeader>
            <CardContent className="p-0 max-h-48 overflow-y-auto">
              {log.recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 border-b last:border-0">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: BRAND }}>
                    {getInitials(r.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {openCountByEmail[r.email] && (
                      <OpenBadge count={openCountByEmail[r.email]} />
                    )}
                    <RecipientBadge status={r.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Attachments */}
          {log.attachments && log.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <p className="text-sm font-semibold">Attachments ({log.attachments.length})</p>
              </CardHeader>
              <CardContent className="p-0">
                {log.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2 border-b last:border-0">
                    <FileIcon contentType={a.contentType} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{a.filename}</p>
                      <p className="text-xs text-muted-foreground">{Math.round(a.size / 1024)} KB</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Signature */}
          {log.signature && (
            <Card>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                onClick={() => setSigOpen(o => !o)}
              >
                Signature
                {sigOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {sigOpen && (
                <CardContent className="px-4 pb-4 pt-0 border-t">
                  <div
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: log.signature }}
                  />
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}
