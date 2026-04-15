import { useEffect, useState } from 'react';
import {
  ShoppingCart, ShoppingBag, TrendingUp, TrendingDown,
  Users, Package, AlertCircle, ArrowUpRight, ArrowDownRight,
  RotateCcw, Star, Clock,
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { reportService } from '../services/pos.service';
import type { DashboardStats } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rs ${(n / 1_000_000).toFixed(0)}M` : n >= 1_000 ? `Rs ${(n / 1_000).toFixed(0)}K` : `Rs ${(n).toFixed(0)}`;

// ─── Stat card ────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, change, icon: Icon, gradient, iconBg,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
  icon: React.FC<{ size?: number; className?: string }>;
  gradient: string;
  iconBg: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${gradient} relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-white/80 truncate">{label}</p>
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon size={15} className="text-white" />
          </div>
        </div>
        <p className="text-xl font-extrabold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-white/70 mt-0.5">{sub}</p>}
        {change != null && (
          <div className={`flex items-center gap-0.5 text-xs mt-1 font-semibold ${change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(change)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    reportService.dashboard()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 text-red-600 py-10 justify-center">
      <AlertCircle size={16} /> {error}
    </div>
  );
  if (!stats) return null;

  const { today, thisMonth, inventory, customers, suppliers, changes, charts, topProducts, recentSales, pendingReturns } = stats;

  const dailyData = (charts?.daily ?? []).map(d => ({
    label: d.date.slice(5),
    Sales: d.sales,
    Purchases: d.purchases,
    Expenses: d.expenses,
  }));

  const monthlyData = (charts?.monthly ?? []).map(d => ({
    label: d.month.slice(2),
    Sales: d.sales,
    Purchases: d.purchases,
    Expenses: d.expenses,
  }));

  const chartData = chartView === 'daily' ? dailyData : monthlyData;

  const maxTopRevenue = Math.max(...(topProducts ?? []).map(p => p.totalRevenue), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold bg-linear-to-r from-secondary-700 via-secondary-600 to-primary-600 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {(pendingReturns ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-lg font-medium">
            <RotateCcw size={12} /> {pendingReturns} pending return{(pendingReturns ?? 0) > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Today Sales" value={fmt(today?.salesTotal ?? 0)}
          sub={`${today?.salesCount ?? 0} orders`}
          change={today?.vsYesterday?.salesGrowth ?? null}
          icon={ShoppingCart}
          gradient="bg-linear-to-br from-secondary-700 to-secondary-800"
          iconBg="bg-white/20" />
        <KPI label="Month Sales" value={fmt(thisMonth?.salesTotal ?? 0)}
          sub={`${thisMonth?.salesCount ?? 0} orders`}
          change={changes?.salesGrowth ?? null}
          icon={TrendingUp}
          gradient="bg-linear-to-br from-primary-500 to-primary-700"
          iconBg="bg-white/20" />
        <KPI label="Month Purchases" value={fmt(thisMonth?.purchasesTotal ?? 0)}
          sub={`${thisMonth?.purchasesCount ?? 0} orders`}
          change={changes?.purchasesChange ?? null}
          icon={ShoppingBag}
          gradient="bg-linear-to-br from-secondary-600 to-secondary-700"
          iconBg="bg-white/20" />
        <KPI label="Net Profit" value={fmt(thisMonth?.netProfit ?? 0)}
          sub={`COGS ${fmt(thisMonth?.cogs ?? 0)}`}
          icon={thisMonth?.netProfit && thisMonth.netProfit >= 0 ? TrendingUp : TrendingDown}
          gradient={(thisMonth?.netProfit ?? 0) >= 0 ? 'bg-linear-to-br from-emerald-500 to-green-600' : 'bg-linear-to-br from-red-500 to-rose-600'}
          iconBg="bg-white/20" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Inventory Products" value={(inventory?.totalProducts ?? 0).toString()}
          sub={`Value ${fmtK(inventory?.totalInventoryValue ?? 0)}`}
          icon={Package}
          gradient="bg-linear-to-br from-secondary-500 to-secondary-700"
          iconBg="bg-white/20" />
        <KPI label="Low / Out of Stock" value={`${inventory?.lowStockCount ?? 0} / ${inventory?.outOfStockCount ?? 0}`}
          icon={AlertCircle}
          gradient={(inventory?.lowStockCount ?? 0) > 0 ? 'bg-linear-to-br from-amber-500 to-orange-500' : 'bg-linear-to-br from-gray-500 to-gray-600'}
          iconBg="bg-white/20" />
        <KPI label="Customers" value={(customers?.total ?? 0).toString()}
          sub={`${customers?.newThisMonth ?? 0} new this month`}
          icon={Users}
          gradient="bg-linear-to-br from-primary-400 to-primary-600"
          iconBg="bg-white/20" />
        <KPI label="Expenses" value={fmt(thisMonth?.expensesTotal ?? 0)}
          sub={`${thisMonth?.expensesCount ?? 0} entries`}
          change={changes?.expensesChange ?? null}
          icon={TrendingDown}
          gradient="bg-linear-to-br from-rose-500 to-red-600"
          iconBg="bg-white/20" />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Revenue Trend</h2>
          <div className="flex gap-1">
            {(['daily', 'monthly'] as const).map(v => (
              <button key={v} onClick={() => setChartView(v)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${chartView === v ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {v === 'daily' ? '7 Days' : '12 Months'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#281c59" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#281c59" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
            <Tooltip content={<ChartTip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Sales" stroke="#0f766e" strokeWidth={2} fill="url(#gSales)" dot={false} />
            <Area type="monotone" dataKey="Purchases" stroke="#281c59" strokeWidth={2} fill="url(#gPurchases)" dot={false} />
            <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Monthly P&L summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">This Month</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: `Sales (${thisMonth?.salesCount ?? 0})`, value: thisMonth?.salesTotal ?? 0, color: 'text-gray-900 dark:text-gray-100' },
              { label: `Purchases (${thisMonth?.purchasesCount ?? 0})`, value: thisMonth?.purchasesTotal ?? 0, color: 'text-gray-900 dark:text-gray-100' },
              { label: `Expenses (${thisMonth?.expensesCount ?? 0})`, value: thisMonth?.expensesTotal ?? 0, color: 'text-gray-900 dark:text-gray-100' },
              { label: 'Discount', value: thisMonth?.discount ?? 0, color: 'text-orange-600' },
              { label: 'COGS', value: thisMonth?.cogs ?? 0, color: 'text-gray-500' },
              { label: 'Gross Profit', value: thisMonth?.grossProfit ?? 0, color: 'text-green-600 font-semibold' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className={color}>{fmt(value)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between font-bold">
              <span className="text-gray-700 dark:text-gray-200">Net Profit</span>
              <span className={(thisMonth?.netProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                {fmt(thisMonth?.netProfit ?? 0)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <p className="text-gray-400">Customers</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{customers?.total ?? 0}</p>
              <p className="text-gray-400">+{customers?.newThisMonth ?? 0} new</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
              <p className="text-gray-400">Suppliers</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{suppliers?.total ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-1.5">
            <Star size={13} className="text-amber-400" /> Top Products
          </h2>
          {(topProducts?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-2.5">
              {(topProducts ?? []).map((p, i) => (
                <div key={p.variantId}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                      <span className="truncate text-gray-700 dark:text-gray-300 font-medium">{p.productName}</span>
                      <span className="text-gray-400 shrink-0">{p.variantName}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtK(p.totalRevenue)}</span>
                      <span className="text-gray-400 ml-1">× {p.totalQty}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${(p.totalRevenue / maxTopRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-1.5">
            <Clock size={13} className="text-gray-400" /> Recent Sales
          </h2>
          {(recentSales?.length ?? 0) === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {(recentSales ?? []).map(s => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      #{s.id} — {s.customer}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.date).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{fmt(s.total)}</p>
                    {s.due > 0
                      ? <p className="text-xs text-red-500">Due {fmt(s.due)}</p>
                      : <p className="text-xs text-green-600">Paid ✓</p>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
