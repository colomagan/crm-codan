import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BRAND, PLANS_CARDS, ENRICHMENT_TABLE } from '../constants';

interface PlansDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlansDialog({ open, onClose }: PlansDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold" style={{ color: BRAND }}>Pricing Plans</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          {PLANS_CARDS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl border p-4 relative"
              style={
                plan.popular   ? { borderColor: BRAND, boxShadow: `0 0 0 2px ${BRAND}30` } :
                plan.enterprise ? { borderColor: '#d97706' } : {}
              }
            >
              {plan.popular ? (
                <div className="flex items-center gap-1 text-xs font-semibold mb-2" style={{ color: BRAND }}>
                  <Star className="w-3 h-3 fill-current" /> Most popular
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">{plan.tag}</p>
              )}
              <p className="font-bold text-base">{plan.name}</p>
              <p
                className="text-2xl font-extrabold mt-1"
                style={{ color: plan.popular ? BRAND : plan.enterprise ? '#d97706' : undefined }}
              >
                {plan.price}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{plan.leads}</p>
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">1 token / lead basic</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Lead Enrichment — Additional Cost by Plan
          </p>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${BRAND}20` }}>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: `${BRAND}08` }}>
                  <TableHead className="text-xs font-bold">Plan</TableHead>
                  <TableHead className="text-xs font-bold">Basic</TableHead>
                  <TableHead className="text-xs font-bold" style={{ color: BRAND }}>+ Email Verified</TableHead>
                  <TableHead className="text-xs font-bold text-amber-700">+ Direct Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENRICHMENT_TABLE.map((row) => (
                  <TableRow key={row.plan} className={row.popular ? 'bg-blue-50/40' : ''}>
                    <TableCell className="font-semibold text-sm">
                      {row.plan}
                      {row.popular && <Star className="w-3 h-3 inline ml-1 fill-current" style={{ color: BRAND }} />}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{row.basic.price}</p>
                      <p className="text-[10px] text-muted-foreground">{row.basic.tpl}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm" style={{ color: BRAND }}>{row.email.price}</p>
                      <p className="text-[10px] text-muted-foreground">{row.email.tpl}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm text-amber-700">{row.phone.price}</p>
                      <p className="text-[10px] text-muted-foreground">{row.phone.tpl}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Optional Add-Ons — Available on All Plans
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: `${BRAND}20` }}>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${BRAND}15`, color: BRAND }}>
                Email Sender
              </span>
              <p className="font-bold mt-2">Bulk Email Module</p>
              <p className="text-xl font-extrabold" style={{ color: BRAND }}>€49/mo</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send email campaigns directly to pipeline leads, with open tracking and click rates. Integrated in CRM Aires-Soft.
              </p>
              <p className="text-xs font-medium" style={{ color: BRAND }}>Recommended for leads with verified email</p>
            </div>
            <div className="rounded-xl border p-4 space-y-2 border-emerald-200">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Chatbot
              </span>
              <p className="font-bold mt-2">Contact Chatbot Module</p>
              <p className="text-xl font-extrabold text-emerald-700">€39/mo</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatic lead qualification via chat. Email tier: pre-qualifies who responds. Phone tier: automatic follow-up after missed call.
              </p>
              <p className="text-xs font-medium text-emerald-700">Compatible with email + phone tier</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 leading-relaxed">
            Add-ons are sold separately and not included in any base plan. They can be activated on a case-by-case basis as a sales argument (60 days free) without compromising regular pricing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
