import { useState, useCallback, useEffect } from 'react';
import { Loader2, FileText, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { SupplierSearch } from '../components/ui/SupplierSearch';
import { AccountSelect } from '../components/ui/AccountSelect';
import { userService, categoryService, brandService } from '../services/pos.service';
import type { Customer, Supplier, User, Category, Brand } from '../types/pos';
import { REPORTS, REPORT_GROUPS, findReport, reportPath, type ReportId } from '../config/reports';
import { buildCategoryTree, renderCategorySelectOptions } from '../utils/categories';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';
const inputCls = 'px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

export function Reports() {
  const location = useLocation();
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  // The open report is whatever the URL names — /reports is the index.
  const active = findReport(reportId);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [date, setDate] = useState(today);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | ''>('');
  const [userIdList, setUsersList] = useState<User[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [brandsList, setBrandsList] = useState<Brand[]>([]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch users list for cashier sales report filter
  useEffect(() => {
    if (active?.params.includes('user')) {
      userService.list({ pageSize: 500 }).then(r => setUsersList(r.data)).catch(() => {});
    }
  }, [active]);

  // Fetch categories and brands list for inventory reports filters
  useEffect(() => {
    if (active?.params.includes('category') && categoriesList.length === 0) {
      categoryService.listAll({}).then(cats => setCategoriesList(buildCategoryTree(cats))).catch(() => {});
    }
    if (active?.params.includes('brand') && brandsList.length === 0) {
      brandService.listAll({}).then(b => setBrandsList(b)).catch(() => {});
    }
  }, [active, categoriesList.length, brandsList.length]);

  // The Accounts page hands off an account id when it links to the statement.
  useEffect(() => {
    const st = location.state as { accountId?: number } | null;
    if (st?.accountId) setAccountId(st.accountId);
  }, [location.key, location.state]);

  // Reset filters and any generated PDF whenever the report changes.
  useEffect(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setError('');
    setCustomer(null);
    setSupplier(null);
    setUserId('');
    setCategoryId('');
    setBrandId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

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
      if (active.params.includes('customer') && customer) { params.customerId = String(customer.id); }
      if (active.params.includes('supplier') && supplier) { params.supplierId = String(supplier.id); }
      if (active.params.includes('user') && userId) { params.userId = String(userId); }
      if (active.params.includes('category') && categoryId) { params.categoryId = String(categoryId); }
      if (active.params.includes('brand') && brandId) { params.brandId = String(brandId); }

      const blob = await apiClient.getBlob(endpoint, { params, timeout: 120_000 });
      setPdfUrl(URL.createObjectURL(blob));
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [active, from, to, date, customer, supplier, accountId, userId, categoryId, brandId, pdfUrl]);

  const openReport = (id: ReportId) => navigate(reportPath(id));

  const backToDashboard = () => navigate('/reports');

  const canGenerate = active &&
    (!active.params.includes('customer') || !!customer) &&
    (!active.params.includes('supplier') || !!supplier) &&
    (!active.params.includes('account') || !!accountId);

  // ── Index view ──────────────────────────────────────────────────────────
  // Grouped exactly like the Reports menu in the top bar, so the two teach the
  // same map of the system.
  if (!active) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {REPORTS.length} reports — also reachable directly from the Reports menu above.
          </p>
        </div>
        {REPORT_GROUPS.map(group => (
          <div key={group.heading}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              {group.heading}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {group.reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => openReport(r.id)}
                  className="group flex items-center gap-3 p-3 rounded-lg border text-left transition-colors bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-750 hover:border-primary-400 dark:hover:border-primary-700"
                >
                  <div className={`p-2 rounded-md border ${r.color} shrink-0`}>
                    <r.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-[13px] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{r.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 truncate">{r.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Report detail view ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-4">
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
        {active.params.includes('user') && (
          <select
            value={userId}
            onChange={e => setUserId(e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">All Cashiers/Admins</option>
            {userIdList.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        )}

        {active.params.includes('category') && (
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">All Categories</option>
            {renderCategorySelectOptions(categoriesList)}
          </select>
        )}

        {active.params.includes('brand') && (
          <select
            value={brandId}
            onChange={e => setBrandId(e.target.value ? Number(e.target.value) : '')}
            className={inputCls}
          >
            <option value="">All Brands</option>
            {brandsList.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
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

