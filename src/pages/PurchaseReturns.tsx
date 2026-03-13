import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Printer, RotateCcw, Loader2, X } from 'lucide-react';
import { purchaseService, accountService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import type { Purchase, PurchaseReturn, Account } from '../types/pos';

type Tab = 'history' | 'returns';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const today = new Date().toISOString().slice(0, 10);
const mon = today.slice(0, 8) + '01';

function printPurchaseReceipt(p: Purchase) {
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;
  const due = Math.max(0, p.totalAmount - p.paidAmount);
  w.document.write(`<!DOCTYPE html><html><head><title>Purchase</title><style>
    body{font-family:monospace;font-size:12px;width:300px;margin:10px auto}
    h2{text-align:center;margin:0} hr{border-top:1px dashed #000}
    .row{display:flex;justify-content:space-between} .bold{font-weight:bold}
  </style></head><body>
    <h2>PURCHASE ORDER</h2>
    <p style="text-align:center">PO-${p.id}${p.invoiceNo ? ` / ${p.invoiceNo}` : ''}</p><hr/>
    <div class="row"><span>Date:</span><span>${new Date(p.date ?? p.createdAt).toLocaleString()}</span></div>
    ${p.supplier ? `<div class="row"><span>Supplier:</span><span>${p.supplier.name}</span></div>` : ''}
    <hr/>
    <div class="row bold"><span>Total:</span><span>${fmt(p.totalAmount)}</span></div>
    <hr/>
    <div class="row"><span>Paid:</span><span>${fmt(p.paidAmount)}</span></div>
    ${due > 0 ? `<div class="row"><span>Due:</span><span>${fmt(due)}</span></div>` : ''}
    <hr/><p style="text-align:center">Thank you!</p>
  </body></html>`);
  w.print();
  w.close();
}

export function PurchaseReturns() {
  const [tab, setTab] = useState<Tab>('history');

  // ── Purchases history state ──────────────────────────────────────────────
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purPage, setPurPage] = useState(1);
  const [purTotalPages, setPurTotalPages] = useState(1);
  const [purTotal, setPurTotal] = useState(0);
  const [purFrom, setPurFrom] = useState(mon);
  const [purTo, setPurTo] = useState(today);
  const [purQ, setPurQ] = useState('');
  const [purLoading, setPurLoading] = useState(false);

  // ── Returns state ────────────────────────────────────────────────────────
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [retPage, setRetPage] = useState(1);
  const [retTotalPages, setRetTotalPages] = useState(1);
  const [retTotal, setRetTotal] = useState(0);
  const [retLoading, setRetLoading] = useState(false);

  // ── Accounts ─────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);

  // ── View modal ───────────────────────────────────────────────────────────
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ── Return modal ─────────────────────────────────────────────────────────
  const [returnPurchase, setReturnPurchase] = useState<Purchase | null>(null);
  const [returnItems, setReturnItems] = useState<
    { variantId: number; qty: number; maxQty: number; unitCost: number; name: string }[]
  >([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnAccountId, setReturnAccountId] = useState<number | undefined>();
  const [returnLoading, setReturnLoading] = useState(false);

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load asset accounts once
  useEffect(() => {
    accountService.list({ pageSize: 100 })
      .then(r => setAccounts(r.data.filter((a: Account) => a.type === 'ASSET')))
      .catch(() => { });
  }, []);

  // ── Load purchases ───────────────────────────────────────────────────────
  const loadPurchases = useCallback(async (
    page: number,
    from = purFrom,
    to = purTo,
    q = purQ,
  ) => {
    setPurLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 15, from, to };
      if (q.trim()) params.q = q.trim();
      const r = await purchaseService.list(params);
      setPurchases(r.data);
      setPurPage(r.pagination.page);
      setPurTotalPages(r.pagination.totalPages);
      setPurTotal(r.pagination.total);
    } catch { setPurchases([]); } finally { setPurLoading(false); }
  }, [purFrom, purTo, purQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load returns
  const loadReturns = useCallback(async (page: number) => {
    setRetLoading(true);
    try {
      const r = await purchaseService.listReturns({ page, pageSize: 15 });
      setReturns(r.data);
      setRetPage(r.pagination.page);
      setRetTotalPages(r.pagination.totalPages);
      setRetTotal(r.pagination.total);
    } catch { setReturns([]); } finally { setRetLoading(false); }
  }, []);

  // Initial load
  useEffect(() => { loadPurchases(1, mon, today, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'returns') loadReturns(1); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── View purchase details ────────────────────────────────────────────────
  const openView = async (p: Purchase) => {
    setViewLoading(true);
    try {
      const detail = await purchaseService.get(p.id);
      setViewPurchase(detail);
    } catch { showToast('error', 'Failed to load purchase details'); }
    finally { setViewLoading(false); }
  };

  // ── Open return modal ────────────────────────────────────────────────────
  const openReturn = async (p: Purchase) => {
    setReturnLoading(true);
    try {
      const detail = await purchaseService.get(p.id);
      setReturnPurchase(detail);
      setReturnItems(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (detail.items ?? []).map((i: any) => ({
          variantId: i.variantId ?? i.productId,
          qty: 0,
          maxQty: i.quantity,
          unitCost: i.unitCost ?? i.cost ?? 0,
          name: i.variant?.name ?? i.product?.name ?? `#${i.variantId ?? i.productId}`,
        }))
      );
      setReturnReason('');
      setReturnAccountId(undefined);
    } catch { showToast('error', 'Failed to load purchase details'); }
    finally { setReturnLoading(false); }
  };

  // ── Submit return ────────────────────────────────────────────────────────
  const submitReturn = async () => {
    if (!returnPurchase) return;
    const items = returnItems
      .filter(i => i.qty > 0)
      .map(i => ({ variantId: i.variantId, quantity: i.qty, unitCost: i.unitCost }));
    if (!items.length) { showToast('error', 'Select at least one item to return'); return; }
    setReturnLoading(true);
    try {
      await purchaseService.createReturn({
        purchaseId: returnPurchase.id,
        items,
        reason: returnReason || undefined,
        accountId: returnAccountId,
      });
      setReturnPurchase(null);
      showToast('success', 'Return created successfully');
      loadReturns(1);
    } catch (e: unknown) {
      const ae = e as { error?: { message?: string } };
      showToast('error', ae?.error?.message ?? 'Failed to create return');
    } finally { setReturnLoading(false); }
  };

  // ── Input helpers ────────────────────────────────────────────────────────
  const handleFromChange = (v: string) => { setPurFrom(v); loadPurchases(1, v, purTo, purQ); };
  const handleToChange = (v: string) => { setPurTo(v); loadPurchases(1, purFrom, v, purQ); };
  const handleSearch = () => loadPurchases(1, purFrom, purTo, purQ);

  // ── Render ───────────────────────────────────────────────────────────────
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Purchases</h1>
        <div className="flex gap-1">
          {(['history', 'returns'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${tab === t
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                }`}>
              {t === 'history' ? 'Purchase History' : 'Returns'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Purchase History tab ── */}
      {tab === 'history' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <input type="date" value={purFrom} onChange={e => handleFromChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={purTo} onChange={e => handleToChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
            <div className="relative flex-1 min-w-40">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={purQ}
                onChange={e => setPurQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search supplier or invoice..."
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
              />
            </div>
            <button onClick={handleSearch}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Search</button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {purLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
            ) : purchases.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No purchases found</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5">Invoice No</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Due</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {purchases.map(p => {
                    const due = Math.max(0, p.totalAmount - p.paidAmount);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">PO-{p.id}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {new Date(p.date ?? p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {p.supplier?.name ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{p.invoiceNo ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                          {fmt(p.totalAmount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-600">{fmt(p.paidAmount)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${due > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>{due > 0 ? fmt(due) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-0.5 justify-end">
                            <button
                              onClick={() => openView(p)}
                              disabled={viewLoading}
                              title="View details"
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors disabled:opacity-40"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => printPurchaseReceipt(p)}
                              title="Print"
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              onClick={() => openReturn(p)}
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
            {!purLoading && purTotalPages > 1 && (
              <Pagination
                currentPage={purPage}
                totalPages={purTotalPages}
                totalItems={purTotal}
                itemsPerPage={15}
                onPageChange={p => loadPurchases(p, purFrom, purTo, purQ)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Returns tab ── */}
      {tab === 'returns' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {retLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          ) : returns.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No returns found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5">Return #</th>
                  <th className="px-4 py-2.5">Purchase #</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Refund</th>
                  <th className="px-4 py-2.5">Account</th>
                  <th className="px-4 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {returns.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">#{r.id}</td>
                    <td className="px-4 py-2.5 text-gray-500">PO-{r.purchaseId}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(r.date ?? r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-600">
                      {fmt(r.totalRefund)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{r.account?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[150px] truncate" title={r.reason ?? ''}>
                      {r.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!retLoading && retTotalPages > 1 && (
            <Pagination
              currentPage={retPage}
              totalPages={retTotalPages}
              totalItems={retTotal}
              itemsPerPage={15}
              onPageChange={loadReturns}
            />
          )}
        </div>
      )}

      {/* ── View purchase modal ── */}
      {viewPurchase && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setViewPurchase(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Purchase PO-{viewPurchase.id}{viewPurchase.invoiceNo ? ` / ${viewPurchase.invoiceNo}` : ''}
              </h3>
              <button onClick={() => setViewPurchase(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Date: </span>{new Date(viewPurchase.date ?? viewPurchase.createdAt).toLocaleString()}</div>
                <div><span className="text-gray-500">Supplier: </span>{viewPurchase.supplier?.name ?? '—'}</div>
                {viewPurchase.invoiceNo && <div><span className="text-gray-500">Invoice No: </span>{viewPurchase.invoiceNo}</div>}
              </div>
              {/* Items */}
              {(viewPurchase.items ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Cost</th>
                        <th className="text-right py-1">Disc%</th>
                        <th className="text-right py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(viewPurchase.items ?? []).map((item: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                          <td className="py-1.5">{item.variant?.name ?? item.product?.name ?? `#${item.variantId ?? item.productId}`}</td>
                          <td className="py-1.5 text-right">{item.quantity}</td>
                          <td className="py-1.5 text-right">{fmt(item.unitCost ?? item.cost ?? 0)}</td>
                          <td className="py-1.5 text-right">{item.discount ?? 0}%</td>
                          <td className="py-1.5 text-right font-medium">
                            {fmt(item.totalCost ?? item.quantity * (item.unitCost ?? 0) * (1 - (item.discount ?? 0) / 100))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Totals */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                <div><p className="text-xs text-gray-500">Total</p><p className="font-semibold">{fmt(viewPurchase.totalAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Discount</p><p className="font-semibold text-orange-600">{fmt(viewPurchase.discount)}</p></div>
                <div><p className="text-xs text-gray-500">Tax</p><p className="font-semibold">{fmt(viewPurchase.taxAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Paid</p><p className="font-semibold text-green-600">{fmt(viewPurchase.paidAmount)}</p></div>
                <div>
                  <p className="text-xs text-gray-500">Due</p>
                  <p className={`font-semibold ${Math.max(0, viewPurchase.totalAmount - viewPurchase.paidAmount) > 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>{fmt(Math.max(0, viewPurchase.totalAmount - viewPurchase.paidAmount))}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => printPurchaseReceipt(viewPurchase)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                <Printer size={13} /> Print
              </button>
              <button
                onClick={() => { setViewPurchase(null); openReturn(viewPurchase); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm rounded-lg">
                <RotateCcw size={13} /> Return
              </button>
              <button onClick={() => setViewPurchase(null)}
                className="ml-auto px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return modal ── */}
      {returnPurchase && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Create Return — PO-{returnPurchase.id}
              </h3>
              <button onClick={() => setReturnPurchase(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3 flex-1">
              <p className="text-xs text-gray-500">Select items to return:</p>
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
              <div>
                <label className="text-xs text-gray-500 block mb-1">Refund Account</label>
                <select
                  value={returnAccountId ?? ''}
                  onChange={e => setReturnAccountId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                >
                  <option value="">Select account (optional)</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setReturnPurchase(null)}
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
