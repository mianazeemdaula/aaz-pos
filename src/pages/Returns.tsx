import { useState, useEffect, useCallback } from 'react';
import { Eye, Printer, RotateCcw, Loader2, X } from 'lucide-react';
import { saleService, purchaseService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import type { Sale, Purchase } from '../types/pos';

type Tab = 'sale-returns' | 'purchase-returns';

const fmt = (n: number) => `Rs ${Math.abs(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = new Date().toISOString().slice(0, 10);
const mon = today.slice(0, 8) + '01';

function printSaleReceipt(s: Sale) {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
    body{font-family:monospace;font-size:12px;width:300px;margin:10px auto}
    h2{text-align:center;margin:0} hr{border-top:1px dashed #000}
    .row{display:flex;justify-content:space-between} .bold{font-weight:bold}
  </style></head><body>
    <h2>RETURN RECEIPT</h2>
    <p style="text-align:center">#${s.taxInvoiceId ?? s.id}</p><hr/>
    <div class="row"><span>Date:</span><span>${new Date(s.createdAt).toLocaleString()}</span></div>
    ${s.customer ? `<div class="row"><span>Customer:</span><span>${s.customer.name}</span></div>` : ''}
    <hr/>
    <div class="row bold"><span>Refund Amount:</span><span>${fmt(s.totalAmount)}</span></div>
    <hr/><p style="text-align:center">Thank you!</p>
  </body></html>`);
    w.print();
    w.close();
}

function printPurchaseReceipt(p: Purchase) {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Purchase</title><style>
    body{font-family:monospace;font-size:12px;width:300px;margin:10px auto}
    h2{text-align:center;margin:0} hr{border-top:1px dashed #000}
    .row{display:flex;justify-content:space-between} .bold{font-weight:bold}
  </style></head><body>
    <h2>PURCHASE RETURN</h2>
    <p style="text-align:center">PRTN-${p.id}${p.invoiceNo ? ` / ${p.invoiceNo}` : ''}</p><hr/>
    <div class="row"><span>Date:</span><span>${new Date(p.date ?? p.createdAt).toLocaleString()}</span></div>
    ${p.supplier ? `<div class="row"><span>Supplier:</span><span>${p.supplier.name}</span></div>` : ''}
    <hr/>
    <div class="row bold"><span>Return Amount:</span><span>${fmt(p.totalAmount)}</span></div>
    <hr/><p style="text-align:center">Thank you!</p>
  </body></html>`);
    w.print();
    w.close();
}

export function Returns() {
    const [tab, setTab] = useState<Tab>('sale-returns');

    // Sale returns state
    const [saleReturns, setSaleReturns] = useState<Sale[]>([]);
    const [srPage, setSrPage] = useState(1);
    const [srTotalPages, setSrTotalPages] = useState(1);
    const [srTotal, setSrTotal] = useState(0);
    const [srFrom, setSrFrom] = useState(mon);
    const [srTo, setSrTo] = useState(today);
    const [srLoading, setSrLoading] = useState(false);

    // Purchase returns state
    const [purchaseReturns, setPurchaseReturns] = useState<Purchase[]>([]);
    const [prPage, setPrPage] = useState(1);
    const [prTotalPages, setPrTotalPages] = useState(1);
    const [prTotal, setPrTotal] = useState(0);
    const [prFrom, setPrFrom] = useState(mon);
    const [prTo, setPrTo] = useState(today);
    const [prLoading, setPrLoading] = useState(false);

    // View detail state
    const [viewSale, setViewSale] = useState<Sale | null>(null);
    const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Load sale returns
    const loadSaleReturns = useCallback(async (page: number, from = srFrom, to = srTo) => {
        setSrLoading(true);
        try {
            const r = await saleService.list({ page, pageSize: 15, from, to, type: 'RETURN' });
            setSaleReturns(r.data); setSrPage(r.pagination.page);
            setSrTotalPages(r.pagination.totalPages); setSrTotal(r.pagination.total);
        } catch { setSaleReturns([]); } finally { setSrLoading(false); }
    }, [srFrom, srTo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load purchase returns
    const loadPurchaseReturns = useCallback(async (page: number, from = prFrom, to = prTo) => {
        setPrLoading(true);
        try {
            const r = await purchaseService.list({ page, pageSize: 15, from, to, type: 'RETURN' });
            setPurchaseReturns(r.data); setPrPage(r.pagination.page);
            setPrTotalPages(r.pagination.totalPages); setPrTotal(r.pagination.total);
        } catch { setPurchaseReturns([]); } finally { setPrLoading(false); }
    }, [prFrom, prTo]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadSaleReturns(1, srFrom, srTo); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { if (tab === 'purchase-returns') loadPurchaseReturns(1, prFrom, prTo); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const openViewSale = async (sale: Sale) => {
        setViewLoading(true);
        try { const detail = await saleService.get(sale.id); setViewSale(detail); }
        catch { showToast('error', 'Failed to load return details'); }
        finally { setViewLoading(false); }
    };

    const openViewPurchase = async (p: Purchase) => {
        setViewLoading(true);
        try { const detail = await purchaseService.get(p.id); setViewPurchase(detail); }
        catch { showToast('error', 'Failed to load return details'); }
        finally { setViewLoading(false); }
    };

    return (
        <div className="space-y-4">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <RotateCcw size={20} className="text-orange-500" />
                    Returns
                </h1>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    {([{ key: 'sale-returns' as Tab, label: 'Sale Returns' }, { key: 'purchase-returns' as Tab, label: 'Purchase Returns' }]).map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${tab === t.key
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sale Returns */}
            {tab === 'sale-returns' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                        <input type="date" value={srFrom} onChange={e => { setSrFrom(e.target.value); loadSaleReturns(1, e.target.value, srTo); }} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
                        <span className="text-gray-400 text-sm">to</span>
                        <input type="date" value={srTo} onChange={e => { setSrTo(e.target.value); loadSaleReturns(1, srFrom, e.target.value); }} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
                        <span className="ml-auto text-xs text-gray-500">{srTotal} return(s) found</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {srLoading ? <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                            : saleReturns.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No sale returns found</p>
                                : (
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                                            <th className="px-4 py-2.5">Return #</th><th className="px-4 py-2.5">Date</th>
                                            <th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5 text-right">Refund</th>
                                            <th className="px-4 py-2.5 text-right">Items</th><th className="px-4 py-2.5 text-center">Actions</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {saleReturns.map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                                                        <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded mr-1.5">RTN</span>#{r.id}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.customer?.name ?? 'Walk-in'}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{fmt(r.totalAmount)}</td>
                                                    <td className="px-4 py-2.5 text-right">{r.items?.length ?? 0}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => openViewSale(r)} disabled={viewLoading} title="View" className="p-1.5 text-gray-400 hover:text-primary-600 rounded disabled:opacity-40"><Eye size={14} /></button>
                                                            <button onClick={() => printSaleReceipt(r)} title="Print" className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Printer size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                        {!srLoading && srTotalPages > 1 && (
                            <Pagination currentPage={srPage} totalPages={srTotalPages} totalItems={srTotal} itemsPerPage={15} onPageChange={p => loadSaleReturns(p, srFrom, srTo)} />
                        )}
                    </div>
                </div>
            )}

            {/* Purchase Returns */}
            {tab === 'purchase-returns' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                        <input type="date" value={prFrom} onChange={e => { setPrFrom(e.target.value); loadPurchaseReturns(1, e.target.value, prTo); }} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
                        <span className="text-gray-400 text-sm">to</span>
                        <input type="date" value={prTo} onChange={e => { setPrTo(e.target.value); loadPurchaseReturns(1, prFrom, e.target.value); }} className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
                        <span className="ml-auto text-xs text-gray-500">{prTotal} return(s) found</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {prLoading ? <div className="flex justify-center py-10"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                            : purchaseReturns.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No purchase returns found</p>
                                : (
                                    <table className="w-full text-sm">
                                        <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-left text-xs text-gray-500">
                                            <th className="px-4 py-2.5">Return #</th><th className="px-4 py-2.5">Date</th>
                                            <th className="px-4 py-2.5">Supplier</th><th className="px-4 py-2.5 text-right">Return Amount</th>
                                            <th className="px-4 py-2.5 text-right">Items</th><th className="px-4 py-2.5 text-center">Actions</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {purchaseReturns.map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                                                        <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded mr-1.5">PRTN</span>#{r.id}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-gray-500">{new Date(r.date ?? r.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.supplier?.name ?? ''}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{fmt(r.totalAmount)}</td>
                                                    <td className="px-4 py-2.5 text-right">{r.items?.length ?? 0}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => openViewPurchase(r)} disabled={viewLoading} title="View" className="p-1.5 text-gray-400 hover:text-primary-600 rounded disabled:opacity-40"><Eye size={14} /></button>
                                                            <button onClick={() => printPurchaseReceipt(r)} title="Print" className="p-1.5 text-gray-400 hover:text-primary-600 rounded"><Printer size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                        {!prLoading && prTotalPages > 1 && (
                            <Pagination currentPage={prPage} totalPages={prTotalPages} totalItems={prTotal} itemsPerPage={15} onPageChange={p => loadPurchaseReturns(p, prFrom, prTo)} />
                        )}
                    </div>
                </div>
            )}

            {/* View Sale Return Detail */}
            {viewSale && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewSale(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Sale Return #{viewSale.id}
                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">RETURN</span>
                            </h3>
                            <button onClick={() => setViewSale(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">Date: </span>{new Date(viewSale.createdAt).toLocaleString()}</div>
                                <div><span className="text-gray-500">Customer: </span>{viewSale.customer?.name ?? 'Walk-in'}</div>
                            </div>
                            {(viewSale.items ?? []).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th>
                                            <th className="text-right py-1">Price</th><th className="text-right py-1">Total</th>
                                        </tr></thead>
                                        <tbody>
                                            {(viewSale.items ?? []).map((item, i) => (
                                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                                                    <td className="py-1.5">{item.variant?.product?.name ?? `#${item.variant?.barcode}`}</td>
                                                    <td className="py-1.5 text-right text-orange-600 font-semibold">{item.quantity}</td>
                                                    <td className="py-1.5 text-right">{fmt(item.unitPrice)}</td>
                                                    <td className="py-1.5 text-right font-medium text-orange-600">
                                                        {fmt(item.totalPrice ?? item.quantity * item.unitPrice)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                                <div><p className="text-xs text-gray-500">Refund</p><p className="font-semibold text-orange-600">{fmt(viewSale.totalAmount)}</p></div>
                                <div><p className="text-xs text-gray-500">Discount</p><p className="font-semibold text-orange-600">{fmt(viewSale.discount)}</p></div>
                                <div><p className="text-xs text-gray-500">Tax</p><p className="font-semibold">{fmt(viewSale.taxAmount)}</p></div>
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={() => printSaleReceipt(viewSale)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                                <Printer size={13} /> Print
                            </button>
                            <button onClick={() => setViewSale(null)} className="ml-auto px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Purchase Return Detail */}
            {viewPurchase && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewPurchase(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                Purchase Return PO-{viewPurchase.id}
                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">RETURN</span>
                            </h3>
                            <button onClick={() => setViewPurchase(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-4 flex-1">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">Date: </span>{new Date(viewPurchase.date ?? viewPurchase.createdAt).toLocaleString()}</div>
                                <div><span className="text-gray-500">Supplier: </span>{viewPurchase.supplier?.name ?? ''}</div>
                                {viewPurchase.invoiceNo && <div><span className="text-gray-500">Invoice No: </span>{viewPurchase.invoiceNo}</div>}
                            </div>
                            {(viewPurchase.items ?? []).length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left py-1">Product</th><th className="text-right py-1">Qty</th>
                                            <th className="text-right py-1">Cost</th><th className="text-right py-1">Total</th>
                                        </tr></thead>
                                        <tbody>
                                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                            {(viewPurchase.items ?? []).map((item: any, i: number) => (
                                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700">
                                                    <td className="py-1.5">{item.product?.name ?? `#${item.productId}`}</td>
                                                    <td className="py-1.5 text-right text-orange-600 font-semibold">{item.quantity}</td>
                                                    <td className="py-1.5 text-right">{fmt(item.unitCost ?? 0)}</td>
                                                    <td className="py-1.5 text-right font-medium text-orange-600">
                                                        {fmt(item.totalCost ?? item.quantity * (item.unitCost ?? 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                                <div><p className="text-xs text-gray-500">Return Amount</p><p className="font-semibold text-orange-600">{fmt(viewPurchase.totalAmount)}</p></div>
                                <div><p className="text-xs text-gray-500">Paid</p><p className="font-semibold text-green-600">{fmt(viewPurchase.paidAmount)}</p></div>
                                <div><p className="text-xs text-gray-500">Due</p>
                                    <p className={`font-semibold ${Math.max(0, viewPurchase.totalAmount - viewPurchase.paidAmount) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                        {fmt(Math.max(0, viewPurchase.totalAmount - viewPurchase.paidAmount))}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={() => printPurchaseReceipt(viewPurchase)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                                <Printer size={13} /> Print
                            </button>
                            <button onClick={() => setViewPurchase(null)} className="ml-auto px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
