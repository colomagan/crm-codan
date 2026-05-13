import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { BRAND, PLAN_PRICES } from '../constants';
import { formatHistDate } from '../utils';
import { PlansDialog } from './PlansDialog';
import type { UserCredits, SearchEntry } from '../types';

interface CreditsBarProps {
  userId: string;
  refreshKey: number;
  recentHistory?: SearchEntry[];
}

export function CreditsBar({ userId, refreshKey, recentHistory = [] }: CreditsBarProps) {
  const [data, setData] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('user_credits')
      .select('credits_used, credits_total, reset_date, plan:plans(id, name, description, max_credits, features)')
      .eq('user_id', userId)
      .single()
      .then(({ data: row }) => {
        setData(row as UserCredits | null);
        setLoading(false);
      });
  }, [userId, refreshKey]);

  if (loading) return <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />;
  if (!data) return null;

  const used      = data.credits_used;
  const total     = data.credits_total;
  const remaining = Math.max(total - used, 0);
  const pct       = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const barColor  = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : BRAND;

  const planName     = data.plan?.name ?? 'Plan';
  const planPrice    = PLAN_PRICES[planName] ?? 0;
  const pricePerTok  = total > 0 && planPrice > 0 ? planPrice / total : 0;
  const remainingEur = pricePerTok > 0 ? (remaining * pricePerTok).toFixed(2) : null;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="cursor-pointer select-none"
          >
            <Card className="border hover:shadow-md transition-shadow" style={{ borderColor: `${BRAND}20` }}>
              <CardContent className="px-5 py-3">
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: BRAND }}
                  >
                    <Zap className="w-3 h-3" />
                    {planName}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground font-medium">Credits used</span>
                      <div className="flex items-center gap-2">
                        {pct >= 90 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </span>
                        )}
                        <span className="text-xs font-semibold tabular-nums">
                          <span style={{ color: barColor }}>{used.toLocaleString()}</span>
                          <span className="text-muted-foreground"> / {total.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: barColor }}
                      />
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold tabular-nums leading-none" style={{ color: barColor }}>
                      {remaining.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">remaining</p>
                  </div>

                  {data.reset_date && (
                    <div className="text-right flex-shrink-0 border-l pl-4" style={{ borderColor: `${BRAND}15` }}>
                      <p className="text-[10px] text-muted-foreground">Resets</p>
                      <p className="text-xs font-medium">{format(new Date(data.reset_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-[440px] p-0 bg-white border shadow-xl rounded-2xl overflow-hidden"
          style={{ borderColor: `${BRAND}25` }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: `${BRAND}12`, background: `${BRAND}06` }}>
            <div>
              <p className="font-bold text-sm" style={{ color: BRAND }}>Token Management</p>
              {data.plan?.description && (
                <p className="text-xs text-muted-foreground">{data.plan.description}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">Updated just now</span>
          </div>

          <div className="grid grid-cols-3 divide-x mx-4 mt-4 rounded-xl overflow-hidden border" style={{ borderColor: `${BRAND}15` }}>
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground font-medium">Total tokens</p>
              <p className="text-xl font-extrabold tabular-nums mt-0.5">{total.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{planName} active</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground font-medium">Consumed</p>
              <p className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: barColor }}>{used.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{pct.toFixed(0)}% of plan</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-muted-foreground font-medium">Remaining balance</p>
              <p className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: pct >= 90 ? '#ef4444' : '#10b981' }}>
                {remaining.toLocaleString()}
              </p>
              {remainingEur && (
                <p className="text-[10px] text-muted-foreground mt-0.5">≈ €{remainingEur} in leads</p>
              )}
            </div>
          </div>

          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Token Consumption</p>
              <p className="text-[10px] font-bold" style={{ color: barColor }}>{pct.toFixed(0)}% used</p>
            </div>
            <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>

          {recentHistory.length > 0 && (
            <div className="mt-4 px-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Search History</p>
              <div className="divide-y" style={{ borderColor: `${BRAND}10` }}>
                {recentHistory.slice(0, 4).map((entry) => {
                  const tokenCost = entry.result_count;
                  const eurCost   = pricePerTok > 0 ? (tokenCost * pricePerTok).toFixed(2) : null;
                  return (
                    <div key={entry.id} className="flex items-start justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">{formatHistDate(entry.created_at)}</p>
                        <p className="text-xs font-medium truncate mt-0.5">
                          {entry.keyword}{entry.location ? ` · ${entry.location}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {entry.status === 'success' ? (
                          <>
                            <p className="text-xs font-semibold" style={{ color: barColor }}>– {tokenCost} tokens</p>
                            {eurCost && <p className="text-[10px] text-muted-foreground">€{eurCost}</p>}
                          </>
                        ) : entry.status === 'pending' ? (
                          <p className="text-[10px] text-amber-600">– 0 tokens</p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">{entry.status}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pct >= 80 && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                When balance drops below 20%, a visual alert fires and the client is notified — avoiding campaigns without quota. Natural upsell or recharge opportunity.
              </p>
            </div>
          )}

          <div className="px-4 py-3 mt-3 border-t flex items-center justify-between" style={{ borderColor: `${BRAND}10` }}>
            <p className="text-[10px] text-muted-foreground">1 credit deducted per lead scraped</p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 gap-1.5"
              style={{ borderColor: `${BRAND}30`, color: BRAND }}
              onClick={() => setPlansOpen(true)}
            >
              View all plans
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <PlansDialog open={plansOpen} onClose={() => setPlansOpen(false)} />
    </>
  );
}
