import { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, Printer, RotateCcw, CheckCircle, XCircle,
  PlayCircle, Loader2, X,
} from 'lucide-react';
import { saleService, accountService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import type { Sale, SaleReturn, Account } from '../types/pos';

type Tab = 'history' | 'returns';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const today = new Date().toISOString().slice(0, 10);
const mon = today.slice(0, 8) + '01';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  REJECTED: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  PROCESSED: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400',
};

function printSaleReceipt(s: Sale) {
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;
  const due = Math.max(0, s.totalAmount - s.paidAmount);
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
    body{font-family:monospace;font-size:12px;width:300px;margin:10px auto}
    h2{text-align:center;margin:0} hr{border-top:1px dashed #000}
    .row{display:flex;justify-content:space-between} .bold{font-weight:bold}
  </style></head><body>
    <h2>SALE RECEIPT</h2>
    <p style="text-align:center">#${s.taxInvoiceId ?? s.id}</p><hr/>
    <div class="row"><span>Date:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
    ${s.customer ? `<div class="row"><span>Customer:</span><span>${s.customer.name}</span></div>` : ''}
    <hr/>
    <div class="row"><span>Total:</span><span>${fmt(s.totalAmount)}</span></div>
    <div class="row"><span>Discount:</span><span>${fmt(s.discount)}</span></div>
    <div class="row"><span>Tax:</span><span>${fmt(s.taxAmount)}</span></div>
    <div class="row bold"><span>Grand Total:</span><span>${fmt(s.totalAmount)}</span></div>
    <hr/>
    <div class="row"><span>Paid:</span><span>${fmt(s.paidAmount)}</span></div>
    ${due > 0 ? `<div class="row"><span>Due:</span><span>${fmt(due)}</span></div>` : ''}
    <hr/><p style="text-align:center">Thank you!</p>
  </body></html>`);
  w.print();
  w.close();
}

export function SaleReturns() {
  const [tab, setTab] = useState<Tab>('history');

  // ── Sales history state ────────────────────────────────────────────────
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesFrom, setSalesFrom] = useState(mon);
  const [salesTo, setSalesTo] = useState(today);
  const [salesQ, setSalesQ] = useState('');
  const [salesLoading, setSalesLoading] = useState(false);

  // ── Returns state ──────────────────────────────────────────────────────
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsTotalPages, setReturnsTotalPages] = useState(1);
  const [returnsTotal, setReturnsTotal] = useState(0);
  const [returnsLoading, setReturnsLoading] = useState(false);

  // ── Accounts ────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);

  // ── View modal ─────────────────────────────────────────────────────────
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ── Return modal ───────────────────────────────────────────────────────
  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<
    { variantId: number; qty: number; maxQty: number; unitPrice: number; discount: number; name: string }[]
  >([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load asset accounts once
  useEffect(() => {
    accountService.list({ pageSize: 100 })
      .then(r => setAccounts(r.data.filter(a => a.type === 'ASSET')))
      .catch(() => { });
  }, []);

  // ── Load sales ─────────────────────────────────────────────────────────
  const loadSales = useCallback(async (
    page: number,
    from = salesFrom,
    to = salesTo,
    q = salesQ,
  ) => {
    setSalesLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 15, from, to };
      if (q.trim()) params.q = q.trim();
      const r = await saleService.list(params);
      console.log(r);
      setSales(r.data);
      setSalesPage(r.pagination.page);
      setSalesTotalPages(r.pagination.totalPages);
      setSalesTotal(r.pagination.total);
    } catch { setSales([]); } finally { setSalesLoading(false); }
  }, [salesFrom, salesTo, salesQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load returns
  const loadReturns = useCallback(async (page: number) => {
    setReturnsLoading(true);
    try {
      const r = await saleService.listReturns({ page, pageSize: 15 });
      setReturns(r.data);
      setReturnsPage(r.pagination.page);
      setReturnsTotalPages(r.pagination.totalPages);
      setReturnsTotal(r.pagination.total);
    } catch { setReturns([]); } finally { setReturnsLoading(false); }
  }, []);

  // Initial load
  useEffect(() => { loadSales(1, mon, today, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'returns') loadReturns(1); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── View sale details ──────────────────────────────────────────────────
  const openView = async (sale: Sale) => {
    setViewLoading(true);
    try {
      const detail = await saleService.get(sale.id);
      setViewSale(detail);
    } catch { showToast('error', 'Failed to load sale details'); }
    finally { setViewLoading(false); }
  };

  // ── Open return modal ──────────────────────────────────────────────────
  const openReturn = async (sale: Sale) => {
    setReturnLoading(true);
    try {
      const detail = await saleService.get(sale.id);
      setReturnSale(detail);
      setReturnItems(
        (detail.items ?? []).map(i => ({
          variantId: i.variantId,
          qty: 0,
          maxQty: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          name: i.variant?.product?.name ?? `#${i.variant?.barcode}`,
        }))
      );
      setReturnReason('');
    } catch { showToast('error', 'Failed to load sale details'); }
    finally { setReturnLoading(false); }
  };

  // ── Submit return ──────────────────────────────────────────────────────
  const submitReturn = async () => {
    if (!returnSale) return;
    const items = returnItems
      .filter(i => i.qty > 0)
      .map(i => ({ variantId: i.variantId, quantity: i.qty, unitPrice: i.unitPrice, discount: i.discount }));
    if (!items.length) { showToast('error', 'Select at least one item to return'); return; }
    setReturnLoading(true);
    try {
      await saleService.createReturn({ saleId: returnSale.id, items, reason: returnReason || undefined });
      setReturnSale(null);
      showToast('success', 'Return created successfully');
      loadReturns(1);
    } catch (e: unknown) {
      const ae = e as { error?: { message?: string } };
      showToast('error', ae?.error?.message ?? 'Failed to create return');
    } finally { setReturnLoading(false); }
  };

  // ── Return workflow ────────────────────────────────────────────────────
  const approveReturn = async (id: number) => {
    try { await saleService.approveReturn(id); loadReturns(returnsPage); showToast('success', 'Approved'); }
    catch { showToast('error', 'Failed to approve'); }
  };
  const rejectReturn = async (id: number) => {
    try { await saleService.rejectReturn(id); loadReturns(returnsPage); showToast('success', 'Rejected'); }
    catch { showToast('error', 'Failed to reject'); }
  };
  const processReturn = async (id: number, accountId?: number) => {
    try {
      await saleService.processReturn(id, accountId ? { accountId } : undefined);
      loadReturns(returnsPage);
      showToast('success', 'Processed');
    } catch { showToast('error', 'Failed to process'); }
  };

  // ── Input helpers ──────────────────────────────────────────────────────
  const handleFromChange = (v: string) => { setSalesFrom(v); loadSales(1, v, salesTo, salesQ); };
  const handleToChange = (v: string) => { setSalesTo(v); loadSales(1, salesFrom, v, salesQ); };
  const handleSearch = () => loadSales(1, salesFrom, salesTo, salesQ);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sales</h1>
        <div className="flex gap-1">
          {(['history', 'returns'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                }`}>
              {t === 'history' ? 'Sales History' : 'Returns'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sales History tab ── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <input type="date" value={salesFrom} onChange={e => handleFromChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={salesTo} onChange={e => handleToChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
            <div className="relative flex-1 min-w-40">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={salesQ}
                onChange={e => setSalesQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search customer..."
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
              />
            </div>
            <button onClick={handleSearch}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Search</button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {salesLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
            ) : sales.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No sales found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Due</th>
                    <th className="px-4 py-2.5 text-right">Items</th>
                    <th className="px-4 py-2.5 text-right">Cahier</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sales.map(s => {
                    const due = Math.max(0, s.totalAmount - s.paidAmount);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                        <td className="px-4 py-1.5 font-medium text-gray-900 dark:text-gray-100">
                          {s.taxInvoiceId ?? `#${s.id}`}
                        </td>
                        <td className="px-4 py-1.5 text-gray-500">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300">
                          {s.customer?.name ?? 'Walk-in'}
                        </td>
                        <td className="px-4 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">
                          {fmt(s.totalAmount)}
                        </td>
                        <td className="px-4 py-1.5 text-right text-green-600">{fmt(s.paidAmount)}</td>
                        <td className={`px-4 py-1.5 text-right font-medium ${due > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>{due > 0 ? fmt(due) : '—'}</td>
                        <td className="px-4 py-1.5 text-right">{s.items?.length} items</td>
                        <td className="px-4 py-1.5 text-right">{s.user?.name ?? '—'}</td>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-0.5 justify-end">
                            <button
                              onClick={() => openView(s)}
                              disabled={viewLoading}
                              title="View details"
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors disabled:opacity-40"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => printSaleReceipt(s)}
                              title="Print receipt"
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => openReturn(s)}
                              title="Create return"
                              className="p-1.5 text-gray-400 hover:text-orange-500 rounded transition-colors"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!salesLoading && salesTotalPages > 1 && (
              <Pagination
                currentPage={salesPage}
                totalPages={salesTotalPages}
                totalItems={salesTotal}
                itemsPerPage={15}
                onPageChange={p => loadSales(p, salesFrom, salesTo, salesQ)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Returns tab ── */}
      {tab === 'returns' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {returnsLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          ) : returns.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No returns found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5">Return #</th>
                  <th className="px-4 py-2.5">Sale #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Refund</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {returns.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">#{r.id}</td>
                    <td className="px-4 py-2.5 text-gray-500">#{r.saleId}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmt(r.totalRefund)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-700'
                        }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-32.5 truncate" title={r.reason ?? ''}>
                      {r.reason ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        {r.status === 'PENDING' && (
                          <>
                            <button onClick={() => approveReturn(r.id)} title="Approve"
                              className="p-1.5 text-green-500 hover:text-green-700 rounded">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => rejectReturn(r.id)} title="Reject"
                              className="p-1.5 text-red-500 hover:text-red-700 rounded">
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {r.status === 'APPROVED' && (
                          <ProcessButton
                            id={r.id}
                            accounts={accounts}
                            onProcess={processReturn}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!returnsLoading && returnsTotalPages > 1 && (
            <Pagination
              currentPage={returnsPage}
              totalPages={returnsTotalPages}
              totalItems={returnsTotal}
              itemsPerPage={15}
              onPageChange={loadReturns}
            />
          )}
        </div>
      )}

      {/* ── View sale modal ── */}
      {viewSale && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setViewSale(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Sale {viewSale.taxInvoiceId ?? `#${viewSale.id}`}
              </h3>
              <button onClick={() => setViewSale(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Date: </span>{new Date(viewSale.createdAt).toLocaleString()}</div>
                <div><span className="text-gray-500">Customer: </span>{viewSale.customer?.name ?? 'Walk-in'}</div>
                <div><span className="text-gray-500">Cashier: </span>{viewSale.user?.name ?? '—'}</div>
                {viewSale.taxInvoiceId && (
                  <div><span className="text-gray-500">FBR Invoice: </span>{viewSale.taxInvoiceId}</div>
                )}
              </div>
              {/* Items */}
              {(viewSale.items ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Price</th>
                        <th className="text-right py-1">Disc%</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewSale.items ?? []).map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                          <td className="py-1.5">{item.variant?.product?.name ?? `#${item.variant?.barcode}`}</td>
                          <td className="py-1.5 text-right">{item.quantity}</td>
                          <td className="py-1.5 text-right">{fmt(item.unitPrice)}</td>
                          <td className="py-1.5 text-right">{item.discount}%</td>
                          <td className="py-1.5 text-right font-medium">
                            {fmt(item.totalPrice ?? item.quantity * item.unitPrice * (1 - item.discount / 100))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Totals */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                <div><p className="text-xs text-gray-500">Total</p><p className="font-semibold">{fmt(viewSale.totalAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Discount</p><p className="font-semibold text-orange-600">{fmt(viewSale.discount)}</p></div>
                <div><p className="text-xs text-gray-500">Tax</p><p className="font-semibold">{fmt(viewSale.taxAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Paid</p><p className="font-semibold text-green-600">{fmt(viewSale.paidAmount)}</p></div>
                <div>
                  <p className="text-xs text-gray-500">Due</p>
                  <p className={`font-semibold ${Math.max(0, viewSale.totalAmount - viewSale.paidAmount) > 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>{fmt(Math.max(0, viewSale.totalAmount - viewSale.paidAmount))}</p>
                </div>
              </div>
              {/* Payments */}
              {(viewSale.payments ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Payments</p>
                  {(viewSale.payments ?? []).map((p, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400">{p.account?.name ?? 'Cash'}</span>
                      <span className="font-medium">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => printSaleReceipt(viewSale)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                <Printer size={13} /> Print
              </button>
              <button
                onClick={() => { setViewSale(null); openReturn(viewSale); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm rounded-lg">
                <RotateCcw size={13} /> Return
              </button>
              <button onClick={() => setViewSale(null)}
                className="ml-auto px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return modal ── */}
      {returnSale && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Create Return — Sale #{returnSale.id}
              </h3>
              <button onClick={() => setReturnSale(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              <p className="text-xs text-gray-500">Select items and quantities to return:</p>
              {returnItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">max {item.maxQty}</span>
                  <input
                    type="number"
                    min={0}
                    max={item.maxQty}
                    value={item.qty}
                    onChange={e => {
                      const v = Math.min(item.maxQty, Math.max(0, parseInt(e.target.value) || 0));
                      setReturnItems(prev => prev.map((x, n) => n === i ? { ...x, qty: v } : x));
                    }}
                    className="w-16 text-center px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                  />
                </div>
              ))}
              <textarea
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                placeholder="Reason for return (optional)"
                rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none resize-none"
              />
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setReturnSale(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={returnLoading || !returnItems.some(i => i.qty > 0)}
                className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {returnLoading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <RotateCcw size={13} />}
                Submit Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Process button with account selector ────────────────────────────────────
function ProcessButton({
  id, accounts, onProcess,
}: {
  id: number;
  accounts: Account[];
  onProcess: (id: number, accountId?: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<number | undefined>();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        title="Process refund"
        className="p-1.5 text-blue-500 hover:text-blue-700 rounded"
      >
        <PlayCircle size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 w-48">
          <p className="text-xs text-gray-500 mb-1.5">Refund account (optional)</p>
          <select
            value={accountId ?? ''}
            onChange={e => setAccountId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1 py-1 mb-2 outline-none"
          >
            <option value="">None</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button
            onClick={() => { setOpen(false); onProcess(id, accountId); }}
            className="w-full text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Process Refund
          </button>
        </div>
      )}
    </div>
  );
}
