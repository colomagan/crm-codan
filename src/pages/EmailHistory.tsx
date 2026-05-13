import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const BRAND = '#096fd3';
const PAGE_SIZE = 25;

interface EmailLog {
  id: string;
  sent_at: string;
  from_email: string;
  subject: string;
  total_sent: number;
  total_failed: number;
  status: 'sent' | 'partial' | 'failed';
}

function StatusBadge({ status }: { status: EmailLog['status'] }) {
  const map = {
    sent:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    partial: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed:  'bg-red-50 text-red-700 border border-red-200',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>{status}</span>;
}

export default function EmailHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('email_logs')
        .select('id,sent_at,from_email,subject,total_sent,total_failed,status', { count: 'exact' })
        .order('sent_at', { ascending: false })
        .range(from, to);
      setLogs((data as EmailLog[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    };
    load();
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleBack = () => {
    sessionStorage.setItem('activeSection', 'email-sender');
    navigate('/');
  };

  return (
    <div className="p-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Email History</h1>
          <p className="text-muted-foreground mt-1">All emails sent from this account</p>
        </div>
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
                <Inbox className="w-10 h-10 opacity-30" />
                <p className="text-sm">No emails sent yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate(`/email-history/${log.id}`)}
                      >
                        <TableCell className="text-sm">{format(new Date(log.sent_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(log.sent_at), 'HH:mm')}</TableCell>
                        <TableCell className="text-sm">{log.from_email}</TableCell>
                        <TableCell className="text-sm">{log.total_sent + log.total_failed}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell><StatusBadge status={log.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Page {page + 1} of {totalPages} — {total} total
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
