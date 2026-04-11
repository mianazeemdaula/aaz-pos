import { useState, useCallback } from 'react';
import type { ElementType } from 'react';
import { BarChart2, ShoppingCart, Package, Users, DollarSign, Loader2, FileText, TrendingDown, BookOpen, Wallet, ArrowLeft, Calendar, AlertTriangle, Sun } from 'lucide-react';
import { apiClient } from '../services/api';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { SupplierSearch } from '../components/ui/SupplierSearch';
import { AccountSelect } from '../components/ui/AccountSelect';
import type { Customer, Supplier } from '../types/pos';

type ReportId = 'sales' | 'purchases' | 'inventory' | 'customers' | 'suppliers' | 'expenses' | 'customer-ledger' | 'supplier-ledger' | 'account-statement' | 'stock-alert' | 'stock-negative' | 'stock-low' | 'daily';

interface ReportDef {
  id: ReportId;
  label: string;
  description: string;
  icon: ElementType;
  color: string;
  params: ('dates' | 'customer' | 'supplier' | 'account' | 'date' | 'stockFilter')[];
  endpoint: string | ((id: number) => string);
  extraParams?: Record<string, string>;
}

const REPORTS: ReportDef[] = [
  { id: 'daily', label: 'Daily Report', description: 'Comprehensive daily P&L: sales, purchases, expenses, salaries, payments', icon: Sun, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800', params: ['date'], endpoint: '/reports/daily' },
  { id: 'sales', label: 'Sales Report', description: 'Revenue, COGS, gross profit & all invoices', icon: ShoppingCart, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800', params: ['dates'], endpoint: '/reports/sales' },
  { id: 'purchases', label: 'Purchases Report', description: 'Purchase orders, total costs & due amounts', icon: Package, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800', params: ['dates'], endpoint: '/reports/purchases' },
  { id: 'inventory', label: 'Inventory Report', description: 'Stock levels, inventory value & reorder alerts', icon: BarChart2, color: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800', params: [], endpoint: '/reports/inventory' },
  { id: 'stock-alert', label: 'Stock Alert Report', description: 'All products with negative or low stock levels', icon: AlertTriangle, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800', params: ['stockFilter'], endpoint: '/reports/stock', extraParams: { filter: 'alert' } },
  { id: 'stock-negative', label: 'Negative Stock', description: 'Products with stock below zero (data integrity issue)', icon: AlertTriangle, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800', params: ['stockFilter'], endpoint: '/reports/stock', extraParams: { filter: 'negative' } },
  { id: 'stock-low', label: 'Low Stock Report', description: 'Products at or below their reorder level', icon: AlertTriangle, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800', params: ['stockFilter'], endpoint: '/reports/stock', extraParams: { filter: 'low' } },
  { id: 'customers', label: 'Customer Balances', description: 'Outstanding receivables per customer', icon: Users, color: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800', params: [], endpoint: '/reports/customer-balances' },
  { id: 'suppliers', label: 'Supplier Balances', description: 'Outstanding payables per supplier', icon: TrendingDown, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800', params: [], endpoint: '/reports/supplier-balances' },
  { id: 'expenses', label: 'Expenses Report', description: 'All expenses by category & account', icon: DollarSign, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800', params: ['dates'], endpoint: '/reports/expenses' },
  { id: 'customer-ledger', label: 'Customer Ledger', description: 'Full transaction ledger for a customer', icon: BookOpen, color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-800', params: ['customer', 'dates'], endpoint: (id: number) => `/reports/customer-ledger/${id}` },
  { id: 'supplier-ledger', label: 'Supplier Ledger', description: 'Full transaction ledger for a supplier', icon: BookOpen, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800', params: ['supplier', 'dates'], endpoint: (id: number) => `/reports/supplier-ledger/${id}` },
  { id: 'account-statement', label: 'Account Statement', description: 'Transaction statement for an account', icon: Wallet, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800', params: ['account', 'dates'], endpoint: (id: number) => `/reports/account-statement/${id}` },
];

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';
const inputCls = 'px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

export function Reports() {
  const [activeId, setActiveId] = useState<ReportId | null>(null);
  const active = REPORTS.find(r => r.id === activeId) ?? null;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [date, setDate] = useState(today);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    if (!active) return;
    if (active.params.includes('customer') && !customer) return;
    if (active.params.includes('supplier') && !supplier) return;
    if (active.params.includes('account') && !accountId) return;

    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setError('');
    setLoading(true);

    try {
      let endpoint: string;
      if (typeof active.endpoint === 'function') {
        if (active.params.includes('customer')) endpoint = active.endpoint(customer!.id);
        else if (active.params.includes('supplier')) endpoint = active.endpoint(supplier!.id);
        else if (active.params.includes('account')) endpoint = active.endpoint(accountId!);
        else endpoint = active.endpoint(0);
      } else {
        endpoint = active.endpoint;
      }

      const params: Record<string, string> = { ...(active.extraParams ?? {}) };
      if (active.params.includes('dates')) { params.from = from; params.to = to; }
      if (active.params.includes('date')) { params.date = date; }

      const blob = await apiClient.getBlob(endpoint, { params });
      setPdfUrl(URL.createObjectURL(blob));
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [active, from, to, date, customer, supplier, accountId, pdfUrl]);

  const openReport = (id: ReportId) => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setError('');
    setActiveId(id);
    setCustomer(null);
    setSupplier(null);
    setAccountId(null);
  };

  const backToDashboard = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setError('');
    setActiveId(null);
  };

  const canGenerate = active &&
    (!active.params.includes('customer') || !!customer) &&
    (!active.params.includes('supplier') || !!supplier) &&
    (!active.params.includes('account') || !!accountId);

  // ── Dashboard view ──────────────────────────────────────────────────────
  if (!active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Select a report to generate</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map(r => (
            <button
              key={r.id}
              onClick={() => openReport(r.id)}
              className={`group flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700`}
            >
              <div className={`p-3 rounded-xl border ${r.color} shrink-0`}>
                <r.icon size={22} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{r.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{r.description}</p>
                {r.params.includes('dates') && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Calendar size={10} /> Date range
                  </span>
                )}
                {r.params.includes('date') && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Calendar size={10} /> Single date
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Report detail view ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4">
      {/* Header bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-wrap">
        <button
          onClick={backToDashboard}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mr-1"
        >
          <ArrowLeft size={14} /> Reports
        </button>
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
        <div className={`p-1.5 rounded-lg border ${active.color}`}>
          <active.icon size={14} />
        </div>
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{active.label}</span>
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

        {active.params.includes('customer') && (
          <div className="w-52">
            <CustomerSearch value={customer} onSelect={setCustomer} placeholder="Select customer…" />
          </div>
        )}
        {active.params.includes('supplier') && (
          <div className="w-52">
            <SupplierSearch value={supplier} onSelect={setSupplier} placeholder="Select supplier…" />
          </div>
        )}
        {active.params.includes('account') && (
          <AccountSelect value={accountId} onChange={id => setAccountId(id)} className="w-52" filter="all" />
        )}

        {active.params.includes('dates') && (
          <>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls} />
          </>
        )}
        {active.params.includes('date') && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        )}

        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-40 transition-colors font-medium"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Generate
        </button>
      </div>

      {/* PDF viewer area */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-primary-600 animate-spin" />
              <p className="text-sm text-gray-500">Generating report…</p>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}
        {!loading && !error && !pdfUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className={`p-4 rounded-2xl border mx-auto w-fit ${active.color}`}>
                <active.icon size={36} />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-3">{active.description}</p>
              <p className="text-xs text-gray-400">Configure parameters above and click Generate</p>
            </div>
          </div>
        )}
        {pdfUrl && (
          <iframe src={pdfUrl} className="w-full h-full border-0" title={active.label} />
        )}
      </div>
    </div>
  );
}

