import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Printer, RotateCcw, Loader2, X } from 'lucide-react';
import { saleService, accountService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import { printSaleInvoice, type SaleInvoiceData } from '../utils/invoices';
import type { Sale, Account } from '../types/pos';

const fmt = (n: number) => `Rs ${Math.abs(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string | Date) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) + " " + dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};
const today = new Date().toISOString().slice(0, 10);
const mon = today.slice(0, 8) + '01';

async function printSaleReceipt(saleId: number) {
  try {
    const s = await saleService.get(saleId);
    const items = (s.items ?? []).map(i => ({
      name: i.variant?.product?.name ?? `#${i.variant?.barcode ?? i.variantId}`,
      qty: i.quantity,
      price: i.unitPrice,
      discount: Math.round(((i.discount * Math.abs(i.quantity)) + Number.EPSILON) * 100) / 100,
      total: i.totalPrice ?? i.quantity * i.unitPrice,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const printData: SaleInvoiceData = {
      sale: s,
      items,
      customer: s.customer,
      subtotal,
      discountAmount: s.discount,
      taxAmount: s.taxAmount,
      grandTotal: s.totalAmount,
      paidAmount: s.paidAmount,
      changeAmount: s.changeAmount,
      fbrInvoiceId: s.taxInvoiceId,
      fbrQrUrl: s.taxInvoiceId ? `https://tp.fbr.gov.pk/InvoiceVerification?InvoiceNo=${encodeURIComponent(s.taxInvoiceId)}` : null,
    };
    await printSaleInvoice(printData);
  } catch (e) {
    console.error('Failed to print sale receipt:', e);
  }
}

export function SaleReturns() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesFrom, setSalesFrom] = useState(mon);
  const [salesTo, setSalesTo] = useState(today);
  const [salesQ, setSalesQ] = useState('');
  const [salesLoading, setSalesLoading] = useState(false);

  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [returnSale, setReturnSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<
    { variantId: number; qty: number; maxQty: number; unitPrice: number; discount: number; unitTax: number; taxMethod: string; name: string }[]
  >([]);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSales = useCallback(async (page: number, from = salesFrom, to = salesTo, q = salesQ) => {
    setSalesLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize: 15, from, to, type: 'SALE' };
      if (q.trim()) params.q = q.trim();
      const r = await saleService.list(params);
      setSales(r.data); setSalesPage(r.pagination.page);
      setSalesTotalPages(r.pagination.totalPages); setSalesTotal(r.pagination.total);
    } catch { setSales([]); } finally { setSalesLoading(false); }
  }, [salesFrom, salesTo, salesQ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSales(1, mon, today, '');
    accountService.list({ active: true })
      .then(r => setAccounts(r.data || []))
      .catch(e => console.error('Failed to load accounts:', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openView = async (sale: Sale) => {
    setViewLoading(true);
    try { const detail = await saleService.get(sale.id); setViewSale(detail); }
    catch { showToast('error', 'Failed to load sale details'); }
    finally { setViewLoading(false); }
  };

  const openReturn = async (sale: Sale) => {
    setReturnLoading(true);
    try {
      const detail = await saleService.get(sale.id);
      const positiveItems = (detail.items ?? []).filter(i => i.quantity > 0);
      
      const originalSubtotal = positiveItems.reduce(
        (sum, item) => sum + (item.unitPrice - item.discount) * item.quantity,
        0
      );
      const invoiceDiscountRatio = originalSubtotal > 0 ? (detail.discount / originalSubtotal) : 0;

      setReturnSale(detail);
      setReturnItems(positiveItems.map(i => {
        const propInvoiceDiscount = (i.unitPrice - i.discount) * invoiceDiscountRatio;
        const totalUnitDiscount = i.discount + propInvoiceDiscount;

        const netPrice = i.unitPrice - i.discount;
        const taxRate = i.variant?.product?.taxRate ?? 0;
        const taxMethod = i.variant?.product?.taxMethod ?? 'EXCLUSIVE';
        const unitTax = taxMethod === 'INCLUSIVE'
            ? (netPrice * taxRate) / (100 + taxRate)
            : (netPrice * taxRate) / 100;

        // Calculate already returned quantity for this variant in previous returns of this sale
        const alreadyReturned = (detail.returns ?? []).reduce((sum: number, ret: any) => {
          const retItem = (ret.items ?? []).find((ri: any) => ri.variantId === i.variantId);
          if (retItem) {
            return sum + Math.abs(retItem.quantity);
          }
          return sum;
        }, 0);

        const remainingQty = Math.max(0, i.quantity - alreadyReturned);

        return {
          variantId: i.variantId,
          qty: 0,
          maxQty: remainingQty,
          unitPrice: i.unitPrice,
          discount: totalUnitDiscount,
          unitTax,
          taxMethod,
          name: i.variant?.product?.name ?? `#${i.variant?.barcode ?? i.variantId}`,
        };
      }));
      setReturnReason('');
      setSelectedAccountId('');
    } catch { showToast('error', 'Failed to load sale details'); }
    finally { setReturnLoading(false); }
  };

  const submitReturn = async () => {
    if (!returnSale) return;
    const selectedItems = returnItems.filter(i => i.qty > 0);
    if (!selectedItems.length) { showToast('error', 'Select at least one item to return'); return; }

    const isWalking = !returnSale.customerId;
    if (isWalking && !selectedAccountId) {
      showToast('error', 'Please select a refund account');
      return;
    }

    setReturnLoading(true);

    const refundTaxAmount = selectedItems.reduce((sum, item) => sum + item.unitTax * item.qty, 0);
    const totalRefund = selectedItems.reduce((s, i) => s + i.qty * (i.unitPrice - i.discount + (i.taxMethod === 'EXCLUSIVE' ? i.unitTax : 0)), 0);

    try {
      await saleService.create({
        parentSaleId: returnSale.id,
        customerId: returnSale.customerId ?? undefined,
        items: selectedItems.map(i => ({
          variantId: i.variantId,
          qty: -i.qty,
          unitPrice: i.unitPrice,
          discount: Number(i.discount.toFixed(4)),
        })),
        payments: selectedAccountId ? [
          {
            accountId: Number(selectedAccountId),
            amount: -Number(totalRefund.toFixed(4)),
          }
        ] : [],
        discount: 0,
        taxAmount: -Number(refundTaxAmount.toFixed(4)),
        note: returnReason || undefined,
      });
      setReturnSale(null);
      setSelectedAccountId('');
      showToast('success', 'Return processed successfully');
      loadSales(salesPage, salesFrom, salesTo, salesQ);
    } catch (e: unknown) {
      const ae = e as { error?: { message?: string } };
      showToast('error', ae?.error?.message ?? 'Failed to process return');
    } finally { setReturnLoading(false); }
  };

  const handleFromChange = (v: string) => { setSalesFrom(v); loadSales(1, v, salesTo, salesQ); };
  const handleToChange = (v: string) => { setSalesTo(v); loadSales(1, salesFrom, v, salesQ); };
  const handleSearch = () => loadSales(1, salesFrom, salesTo, salesQ);

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sales History</h1>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <input type="date" value={salesFrom} onChange={e => handleFromChange(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={salesTo} onChange={e => handleToChange(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={salesQ} onChange={e => setSalesQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Search customer..." className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
          </div>
          <button onClick={handleSearch} className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Search</button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {salesLoading ? <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
            : sales.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No sales found</p>
              : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5 text-right">Paid</th>
                    <th className="px-4 py-2.5 text-right">Due</th><th className="px-4 py-2.5 text-right">Items</th>
                    <th className="px-4 py-2.5 text-right">Cashier</th><th className="px-4 py-2.5 text-center">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sales.map(s => {
                      const due = Math.max(0, s.totalAmount - s.paidAmount);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm">
                          <td className="px-4 py-1.5 font-medium text-gray-900 dark:text-gray-100">{s.id ?? `#${s.id}`}</td>
                          <td className="px-4 py-1.5 text-gray-500">{fmtDate(s.createdAt)}</td>
                          <td className="px-4 py-1.5 text-gray-700 dark:text-gray-300">{s.customer?.name ?? 'Walk-in'}</td>
                          <td className="px-4 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(s.totalAmount)}</td>
                          <td className="px-4 py-1.5 text-right text-green-600">{fmt(s.paidAmount)}</td>
                          <td className={`px-4 py-1.5 text-right font-medium ${due > 0 ? 'text-red-600' : 'text-gray-400'}`}>{due > 0 ? fmt(due) : ''}</td>
                          <td className="px-4 py-1.5 text-right">{s.items?.length ?? 0}</td>
                          <td className="px-4 py-1.5 text-right">{s.user?.name ?? ''}</td>
                          <td className="px-4 py-1.5">
                            <div className="flex items-center gap-0.5 justify-end">
                              <button onClick={() => openView(s)} disabled={viewLoading} title="View" className="p-1.5 text-gray-400 hover:text-primary-600 rounded disabled:opacity-40"><Eye size={14} /></button>
                              <button onClick={() => printSaleReceipt(s.id)} title="Print" className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Printer size={14} /></button>
                              <button onClick={() => openReturn(s)} title="Create return" className="p-1.5 text-gray-400 hover:text-orange-500 rounded"><RotateCcw size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          {!salesLoading && salesTotalPages > 1 && (
            <Pagination currentPage={salesPage} totalPages={salesTotalPages} totalItems={salesTotal} itemsPerPage={15} onPageChange={p => loadSales(p, salesFrom, salesTo, salesQ)} />
          )}
        </div>
      </div>

      {
        viewSale && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewSale(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {viewSale.totalAmount < 0 ? 'Return' : 'Sale'} {viewSale.taxInvoiceId ?? `#${viewSale.id}`}
                  {viewSale.totalAmount < 0 && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">RETURN</span>}
                </h3>
                <button onClick={() => setViewSale(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto p-5 space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Date: </span>{new Date(viewSale.createdAt).toLocaleString()}</div>
                  <div><span className="text-gray-500">Customer: </span>{viewSale.customer?.name ?? 'Walk-in'}</div>
                  <div><span className="text-gray-500">Cashier: </span>{viewSale.user?.name ?? ''}</div>
                  {viewSale.taxInvoiceId && <div><span className="text-gray-500">FBR Invoice: </span>{viewSale.taxInvoiceId}</div>}
                </div>
                {(viewSale.items ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left py-1">Product</th>
                        <th className="text-right py-1">Qty</th>
                        <th className="text-right py-1">Price</th>
                        <th className="text-right py-1">Cost</th>
                        <th className="text-right py-1">Total</th>
                        <th className="text-right py-1">Profit</th>
                      </tr></thead>
                      <tbody>
                        {(viewSale.items ?? []).map((item, i) => {
                          const itemTotal = item.totalPrice ?? (item.quantity * item.unitPrice);
                          const itemCost = (item.avgCostPrice ?? 0) * item.quantity;
                          const itemProfit = itemTotal - itemCost;
                          return (
                            <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                              <td className="py-1.5">{item.variant?.product?.name ?? `#${item.variant?.barcode}`}</td>
                              <td className={`py-1.5 text-right ${item.quantity < 0 ? 'text-orange-600 font-semibold' : ''}`}>{item.quantity}</td>
                              <td className="py-1.5 text-right">{fmt(item.unitPrice)}</td>
                              <td className="py-1.5 text-right text-gray-500">{fmt(item.avgCostPrice ?? 0)}</td>
                              <td className={`py-1.5 text-right font-medium ${(itemTotal) < 0 ? 'text-orange-600' : ''}`}>
                                {fmt(itemTotal)}
                              </td>
                              <td className={`py-1.5 text-right font-medium ${itemProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {fmt(itemProfit)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                  <div><p className="text-xs text-gray-500">{viewSale.totalAmount < 0 ? 'Refund' : 'Total'}</p>
                    <p className={`font-semibold ${viewSale.totalAmount < 0 ? 'text-orange-600' : ''}`}>{fmt(viewSale.totalAmount)}</p>
                  </div>
                  <div><p className="text-xs text-gray-500">Discount</p><p className="font-semibold text-orange-600">{fmt(viewSale.discount)}</p></div>
                  <div><p className="text-xs text-gray-500">Tax</p><p className="font-semibold">{fmt(viewSale.taxAmount)}</p></div>
                  <div>
                    <p className="text-xs text-gray-500">Profit</p>
                    <p className={`font-bold ${
                      (() => {
                        const totalCost = (viewSale.items ?? []).reduce((acc, item) => acc + (item.avgCostPrice ?? 0) * item.quantity, 0);
                        const grossProfit = (viewSale.totalAmount - viewSale.taxAmount) - totalCost;
                        return grossProfit < 0 ? 'text-red-500' : 'text-green-600';
                      })()
                    }`}>
                      {(() => {
                        const totalCost = (viewSale.items ?? []).reduce((acc, item) => acc + (item.avgCostPrice ?? 0) * item.quantity, 0);
                        const grossProfit = (viewSale.totalAmount - viewSale.taxAmount) - totalCost;
                        return fmt(grossProfit);
                      })()}
                    </p>
                  </div>
                </div>
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
                <button onClick={() => printSaleReceipt(viewSale.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                  <Printer size={13} /> Print
                </button>
                {(viewSale.totalAmount ?? 0) >= 0 && (
                  <button onClick={() => { setViewSale(null); openReturn(viewSale); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-sm rounded-lg">
                    <RotateCcw size={13} /> Return
                  </button>
                )}
                <button onClick={() => setViewSale(null)} className="ml-auto px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )
      }

      {
        returnSale && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Return  Sale #{returnSale.id}
                  {returnSale.customer && <span className="ml-2 text-sm font-normal text-gray-500">({returnSale.customer.name})</span>}
                </h3>
                <button onClick={() => setReturnSale(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto p-5 space-y-3 flex-1">
                <p className="text-xs text-gray-500">Enter quantity to return (0 = skip):</p>
                {returnItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.discount > 0 ? (
                          <>
                            Rs {(item.unitPrice - item.discount).toFixed(2)} <span className="line-through text-red-400 text-[10px]">Rs {item.unitPrice}</span>
                          </>
                        ) : (
                          `Rs ${item.unitPrice}`
                        )}
                        {" "} &times; max {item.maxQty}
                      </p>
                    </div>
                    <input type="number" min={0} max={item.maxQty} value={item.qty}
                      onChange={e => {
                        const v = Math.min(item.maxQty, Math.max(0, parseInt(e.target.value) || 0));
                        setReturnItems(prev => prev.map((x, n) => n === i ? { ...x, qty: v } : x));
                      }}
                      className="w-16 text-center px-1 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                    />
                  </div>
                ))}
                {returnItems.some(i => i.qty > 0) && (
                  <div className="space-y-3">
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm">
                      <div className="flex justify-between font-semibold text-orange-700 dark:text-orange-400">
                        <span>Total Refund</span>
                        <span>Rs {returnItems.reduce((s, i) => s + i.qty * (i.unitPrice - i.discount + (i.taxMethod === 'EXCLUSIVE' ? i.unitTax : 0)), 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">
                        {returnSale.customerId ? 'Will be credited to customer account (or select refund account below to pay cash/bank)' : 'Walk-in return: select refund account below to issue refund'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Refund Account {!returnSale.customerId && <span className="text-red-500">*</span>}</label>
                      <select
                        value={selectedAccountId}
                        onChange={e => setSelectedAccountId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                      >
                        <option value="">{returnSale.customerId ? '-- Credit to Ledger (Store Credit) --' : '-- Select Payment Account --'}</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                        ))}
                      </select>
                    </div>

                    {selectedAccountId && (
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Refund Amount (Autofilled)</label>
                        <input
                          type="text"
                          readOnly
                          value={`Rs ${returnItems.reduce((s, i) => s + i.qty * (i.unitPrice - i.discount + (i.taxMethod === 'EXCLUSIVE' ? i.unitTax : 0)), 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}
                <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)}
                  placeholder="Reason for return (optional)" rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none resize-none" />
              </div>
              <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setReturnSale(null)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={submitReturn} disabled={returnLoading || !returnItems.some(i => i.qty > 0)}
                  className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg">
                  {returnLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  Process Return
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
