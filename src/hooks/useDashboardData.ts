import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MonthlyPoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface RecentClient {
  id: string;
  business_name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  created_at: string;
}

export interface DashboardData {
  totalClients: number;
  clientsChange: number | null;
  revenueThisMonth: number;
  revenueChange: number | null;
  expensesThisMonth: number;
  expensesChange: number | null;
  netProfit: number;
  netProfitChange: number | null;
  chartData: MonthlyPoint[];
  recentClients: RecentClient[];
  loading: boolean;
}

function monthStart(year: number, month: number): string {
  return new Date(year, month, 1).toISOString().split('T')[0];
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function sumItems(items: Array<{ quantity: number; unit_price: number }>): number {
  return items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
}

export function useDashboardData(): DashboardData {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [data, setData] = useState<DashboardData>({
    totalClients: 0,
    clientsChange: null,
    revenueThisMonth: 0,
    revenueChange: null,
    expensesThisMonth: 0,
    expensesChange: null,
    netProfit: 0,
    netProfitChange: null,
    chartData: [],
    recentClients: [],
    loading: true,
  });

  const load = useCallback(async () => {
    if (!userId) return;

    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth(); // 0-based

    // Month boundaries as date strings
    const thisMonthStart = monthStart(cy, cm);
    const nextMonthStart = monthStart(cy, cm + 1);
    const lastMonthStart = monthStart(cy, cm - 1);

    // Chart covers last 6 months including current
    const chartMonths: { year: number; month: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cy, cm - i, 1);
      chartMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('en-US', { month: 'short' }),
      });
    }
    const chartStart = monthStart(chartMonths[0].year, chartMonths[0].month);

    const [
      totalClientsRes,
      thisMonthClientsRes,
      lastMonthClientsRes,
      recentClientsRes,
      revenuesRes,
      expensesRes,
    ] = await Promise.all([
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thisMonthStart)
        .lt('created_at', nextMonthStart),

      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', lastMonthStart)
        .lt('created_at', thisMonthStart),

      supabase
        .from('clients')
        .select('id, business_name, first_name, last_name, email, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('revenues')
        .select('date, items:revenue_items(quantity, unit_price)')
        .eq('user_id', userId)
        .gte('date', chartStart)
        .lt('date', nextMonthStart)
        .neq('status', 'cancelled'),

      supabase
        .from('expenses')
        .select('date, items:expense_items(quantity, unit_price)')
        .eq('user_id', userId)
        .gte('date', chartStart)
        .lt('date', nextMonthStart)
        .neq('status', 'cancelled'),
    ]);

    // Aggregate by month key YYYY-MM
    const revenueByMonth: Record<string, number> = {};
    for (const r of (revenuesRes.data ?? []) as Array<{ date: string; items: Array<{ quantity: number; unit_price: number }> }>) {
      const key = r.date.slice(0, 7);
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + sumItems(r.items ?? []);
    }

    const expenseByMonth: Record<string, number> = {};
    for (const e of (expensesRes.data ?? []) as Array<{ date: string; items: Array<{ quantity: number; unit_price: number }> }>) {
      const key = e.date.slice(0, 7);
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + sumItems(e.items ?? []);
    }

    const thisKey = `${cy}-${String(cm + 1).padStart(2, '0')}`;
    const prevKey = `${cm === 0 ? cy - 1 : cy}-${String(cm === 0 ? 12 : cm).padStart(2, '0')}`;

    const revenueThisMonth = revenueByMonth[thisKey] ?? 0;
    const revenuePrevMonth = revenueByMonth[prevKey] ?? 0;
    const expensesThisMonth = expenseByMonth[thisKey] ?? 0;
    const expensesPrevMonth = expenseByMonth[prevKey] ?? 0;
    const netProfit = revenueThisMonth - expensesThisMonth;
    const prevNetProfit = revenuePrevMonth - expensesPrevMonth;

    const chartData: MonthlyPoint[] = chartMonths.map(m => {
      const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
      return {
        month: m.label,
        revenue: Math.round(revenueByMonth[key] ?? 0),
        expenses: Math.round(expenseByMonth[key] ?? 0),
      };
    });

    setData({
      totalClients: totalClientsRes.count ?? 0,
      clientsChange: pctChange(thisMonthClientsRes.count ?? 0, lastMonthClientsRes.count ?? 0),
      revenueThisMonth,
      revenueChange: pctChange(revenueThisMonth, revenuePrevMonth),
      expensesThisMonth,
      expensesChange: pctChange(expensesThisMonth, expensesPrevMonth),
      netProfit,
      netProfitChange: pctChange(netProfit, prevNetProfit),
      chartData,
      recentClients: (recentClientsRes.data ?? []) as RecentClient[],
      loading: false,
    });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return data;
}
