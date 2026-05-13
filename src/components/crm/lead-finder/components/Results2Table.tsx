import { Download, FileSpreadsheet, FileText, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BRAND, COLUMNS2 } from '../constants';
import { exportCSV2, exportExcel2 } from '../utils';
import type { Lead2Result } from '../types';

interface Results2TableProps {
  results: Lead2Result[];
  importedIds: Set<number>;
  onImport: (lead: Lead2Result, index: number) => void;
  onImportAll: () => void;
  importingAll: boolean;
  filename: string;
}

export function Results2Table({ results, importedIds, onImport, onImportAll, importingAll, filename }: Results2TableProps) {
  const remaining = results.length - importedIds.size;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>{results.length} Leads Found</span>
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              {importedIds.size} imported
            </Badge>
            {remaining > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                {remaining} pending
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {remaining > 0 && (
              <Button
                size="sm"
                className="gap-1.5 text-white"
                style={{ backgroundColor: BRAND }}
                onClick={onImportAll}
                disabled={importingAll}
              >
                {importingAll
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                  : <><Download className="w-4 h-4" /> Import All ({remaining})</>}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV2(results, filename)}>
              <FileText className="w-4 h-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportExcel2(results, filename)}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS2.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap text-xs">{col.label}</TableHead>
              ))}
              <TableHead className="text-right text-xs">Import</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((lead, i) => {
              const imported = importedIds.has(i);
              const name = lead.fullName || lead.name || `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || '—';
              const linkedIn = lead.linkedinUrl || lead.linkedInUrl;
              return (
                <TableRow key={i} className={`text-sm transition-colors ${imported ? 'bg-emerald-50/40' : ''}`}>
                  <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.jobTitle || lead.title || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.companyName || lead.company || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.location || [lead.city, lead.country].filter(Boolean).join(', ') || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.email || '—'}</TableCell>
                  <TableCell>
                    {lead.emailStatus
                      ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lead.emailStatus === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-muted text-muted-foreground border'}`}>{lead.emailStatus}</span>
                      : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{lead.phone || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.industry || '—'}</TableCell>
                  <TableCell>
                    {linkedIn
                      ? <a href={linkedIn} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs" style={{ color: BRAND }}>LinkedIn</a>
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={imported ? 'outline' : 'default'}
                      disabled={imported || importingAll}
                      onClick={() => onImport(lead, i)}
                      style={!imported ? { backgroundColor: BRAND } : {}}
                      className={!imported ? 'text-white gap-1 h-7 px-2' : 'gap-1 h-7 px-2 text-emerald-700 border-emerald-200'}
                    >
                      <UserPlus className="w-3 h-3" />
                      {imported ? 'Done' : 'Import'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
