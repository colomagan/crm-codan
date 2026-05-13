import { motion } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';

const BRAND = 'hsl(38, 60%, 50%)';

function ComingSoonOverlay() {
  return (
    <div
      className="absolute inset-0 rounded-xl z-10 flex items-center justify-center backdrop-blur-[2px]"
      style={{ background: 'hsl(20 8% 8% / 0.6)' }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
        style={{
          color: 'hsl(38 60% 50%)',
          borderColor: 'hsl(38 60% 50% / 0.4)',
          background: 'hsl(20 8% 8% / 0.9)',
        }}
      >
        Coming Soon
      </span>
    </div>
  );
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  paused: 'bg-yellow-100 text-yellow-700',
};

function clientName(c: { business_name: string; first_name: string; last_name: string }): string {
  return c.business_name || `${c.first_name} ${c.last_name}`.trim() || '—';
}

function ChangeIndicator({ value, invertColors = false }: { value: number | null; invertColors?: boolean }) {
  if (value === null) {
    return <span className="text-xs font-semibold text-muted-foreground flex items-center gap-0.5"><Minus className="w-3.5 h-3.5" />—</span>;
  }
  const positive = invertColors ? value < 0 : value >= 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

export function Dashboard() {
  const {
    totalClients, clientsChange,
    revenueThisMonth, revenueChange,
    expensesThisMonth, expensesChange,
    netProfit, netProfitChange,
    chartData, recentClients, loading,
  } = useDashboardData();

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date());

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const stats = [
    {
      title: 'Total Clients',
      value: loading ? null : String(totalClients),
      change: clientsChange,
      invertColors: false,
      icon: Users,
      color: '#096fd3',
      comingSoon: false,
    },
    {
      title: 'Revenue (Month)',
      value: loading ? null : `$${fmt(revenueThisMonth)}`,
      change: revenueChange,
      invertColors: false,
      icon: TrendingUp,
      color: '#10b981',
      comingSoon: true,
    },
    {
      title: 'Expenses (Month)',
      value: loading ? null : `$${fmt(expensesThisMonth)}`,
      change: expensesChange,
      invertColors: true,
      icon: TrendingDown,
      color: '#ef4444',
      comingSoon: true,
    },
    {
      title: 'Net Profit',
      value: loading ? null : `$${fmt(netProfit)}`,
      change: netProfitChange,
      invertColors: false,
      icon: DollarSign,
      color: '#f59e0b',
      comingSoon: true,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>Dashboard</h1>
        <p className="text-muted-foreground mt-1 capitalize">{today}</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
          >
            <div className="relative">
              {stat.comingSoon && <ComingSoonOverlay />}
              <Card className={`hover-lift${stat.comingSoon ? ' opacity-50 pointer-events-none select-none' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <ChangeIndicator value={stat.change} invertColors={stat.invertColors} />
                </div>
                {stat.value === null ? (
                  <Skeleton className="h-8 w-24 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + Recent Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue vs Expenses Chart */}
        <motion.div
          className="xl:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
              <p className="text-sm text-muted-foreground">Last 6 months</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="w-full h-[260px]" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2.5} fill="url(#revenueGrad)" name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#expensesGrad)" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recent Clients</CardTitle>
              <p className="text-sm text-muted-foreground">Latest additions</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              ) : recentClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No clients yet.</p>
              ) : (
                recentClients.map(client => (
                  <div key={client.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: BRAND }}
                    >
                      {clientName(client).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{clientName(client)}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[client.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {client.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
