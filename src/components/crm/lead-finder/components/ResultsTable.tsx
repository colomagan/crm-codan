import { Download, FileSpreadsheet, FileText, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BRAND, COLUMNS } from '../constants';
import { exportCSV, exportExcel } from '../utils';
import type { LeadResult } from '../types';

interface ResultsTableProps {
  results: LeadResult[];
  importedIds: Set<number>;
  onImport: (lead: LeadResult, index: number) => void;
  onImportAll: () => void;
  importingAll: boolean;
  filename: string;
}

export function ResultsTable({ results, importedIds, onImport, onImportAll, importingAll, filename }: ResultsTableProps) {
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
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(results, filename)}>
              <FileText className="w-4 h-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportExcel(results, filename)}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap text-xs">{col.label}</TableHead>
              ))}
              <TableHead className="text-right text-xs">Import</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((lead, i) => {
              const imported = importedIds.has(i);
              return (
                <TableRow key={i} className={`text-sm transition-colors ${imported ? 'bg-emerald-50/40' : ''}`}>
                  <TableCell className="font-medium whitespace-nowrap">{lead.title || lead.name || '—'}</TableCell>
                  <TableCell>{lead.totalScore ?? '—'}</TableCell>
                  <TableCell>{lead.reviewsCount ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.street || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.city || '—'}</TableCell>
                  <TableCell>{lead.state || '—'}</TableCell>
                  <TableCell>{lead.countryCode || '—'}</TableCell>
                  <TableCell>
                    {lead.website
                      ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[140px] block" style={{ color: BRAND }}>{lead.website}</a>
                      : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{lead.phone || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{lead.categoryName || '—'}</TableCell>
                  <TableCell className="max-w-[160px]">
                    {Array.isArray(lead.categories) && lead.categories.length > 0
                      ? <span className="text-xs text-muted-foreground">{lead.categories.join(', ')}</span>
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {lead.url
                      ? <a href={lead.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-xs" style={{ color: BRAND }}>Maps</a>
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
