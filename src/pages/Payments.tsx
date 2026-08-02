import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Loader2, ChevronLeft, ChevronRight,
    Wallet, Printer,
} from 'lucide-react';
import { customerService, supplierService } from '../services/pos.service';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { SupplierSearch } from '../components/ui/SupplierSearch';
import { AccountSelect } from '../components/ui/AccountSelect';
import { Modal } from '../components/ui/Modal';
import type { Customer, Supplier, CustomerPayment, SupplierPayment } from '../types/pos';
import { printCustomerPayment, printSupplierPayment } from '../utils/invoices';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPaymentDate = (dateVal?: string | Date | null, createdAtVal?: string | Date | null) => {
    if (!dateVal && !createdAtVal) return '—';
    const d = dateVal ? new Date(dateVal) : null;
    const c = createdAtVal ? new Date(createdAtVal) : null;

    let target = d && !isNaN(d.getTime()) ? d : c;
    if (!target || isNaN(target.getTime())) return '—';

    if (c && !isNaN(c.getTime()) && d && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
        const combined = new Date(d);
        combined.setHours(c.getHours(), c.getMinutes(), c.getSeconds());
        target = combined;
    }

    const dateStr = target.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = target.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
};

type Tab = 'customer' | 'supplier';

interface CustomerPaymentForm {
    amount: string;
    accountId: number | null;
    note: string;
    date: string;
    customer: Customer | null;
    type: 'RECEIVED' | 'SENT';
}

interface SupplierPaymentForm {
    amount: string;
    accountId: number | null;
    note: string;
    date: string;
    supplier: Supplier | null;
    type: 'SENT' | 'RECEIVED';
}

export function Payments() {
    const [tab, setTab] = useState<Tab>('customer');

    // Customer payments state
    const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
    const [custTotal, setCustTotal] = useState(0);
    const [custPage, setCustPage] = useState(1);
    const [custLoading, setCustLoading] = useState(false);
    const [custModal, setCustModal] = useState(false);
    const [custForm, setCustForm] = useState<CustomerPaymentForm>({
        amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), customer: null, type: 'RECEIVED',
    });
    const [custSaving, setCustSaving] = useState(false);
    const [custSaveError, setCustSaveError] = useState('');

    // Supplier payments state
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [supTotal, setSupTotal] = useState(0);
    const [supPage, setSupPage] = useState(1);
    const [supLoading, setSupLoading] = useState(false);
    const [supModal, setSupModal] = useState(false);
    const [supForm, setSupForm] = useState<SupplierPaymentForm>({
        amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), supplier: null, type: 'SENT',
    });
    const [supSaving, setSupSaving] = useState(false);
    const [supSaveError, setSupSaveError] = useState('');

    const PAGE_SIZE = 20;

    // ── Customer Payment Functions ──
    const loadCustomerPayments = useCallback(async () => {
        setCustLoading(true);
        try {
            const r = await customerService.getAllPayments({ page: custPage, pageSize: PAGE_SIZE });
            setCustomerPayments(r.data ?? []);
            setCustTotal(r.pagination?.total ?? 0);
        } catch {
            setCustomerPayments([]);
        } finally {
            setCustLoading(false);
        }
    }, [custPage]);

    useEffect(() => {
        loadCustomerPayments();
    }, [loadCustomerPayments]);

    const openCustModal = () => {
        setCustSaveError('');
        setCustForm({ amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), customer: null, type: 'RECEIVED' });
        setCustModal(true);
    };

    const saveCustPayment = async () => {
        setCustSaveError('');
        const target = custForm.customer;
        if (!target) { setCustSaveError('Please select a customer.'); return; }
        const amount = Number(custForm.amount);
        if (!custForm.amount || amount <= 0) { setCustSaveError('Enter a valid amount greater than 0.'); return; }
        if (!custForm.accountId) { setCustSaveError('Please select an account.'); return; }
        setCustSaving(true);
        try {
            await customerService.createPayment(target.id, {
                amount, accountId: custForm.accountId,
                note: custForm.note.trim() || undefined, date: custForm.date || undefined,
                type: custForm.type,
            });
            setCustModal(false);
            loadCustomerPayments();
        } catch (e: unknown) {
            const msg = (e as { error?: { message?: string } })?.error?.message
                ?? (e instanceof Error ? e.message : 'Failed to save payment.');
            setCustSaveError(msg);
        } finally {
            setCustSaving(false);
        }
    };

    // ── Supplier Payment Functions ──
    const loadSupplierPayments = useCallback(async () => {
        setSupLoading(true);
        try {
            const r = await supplierService.getAllPayments({ page: supPage, pageSize: PAGE_SIZE });
            setSupplierPayments(r.data ?? []);
            setSupTotal(r.pagination?.total ?? 0);
        } catch {
            setSupplierPayments([]);
        } finally {
            setSupLoading(false);
        }
    }, [supPage]);

    useEffect(() => {
        loadSupplierPayments();
    }, [loadSupplierPayments]);

    const openSupModal = () => {
        setSupSaveError('');
        setSupForm({ amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), supplier: null, type: 'SENT' });
        setSupModal(true);
    };

    const saveSupPayment = async () => {
        setSupSaveError('');
        const target = supForm.supplier;
        if (!target) { setSupSaveError('Please select a supplier.'); return; }
        const amount = Number(supForm.amount);
        if (!supForm.amount || amount <= 0) { setSupSaveError('Enter a valid amount greater than 0.'); return; }
        if (!supForm.accountId) { setSupSaveError('Please select an account to pay from.'); return; }
        setSupSaving(true);
        try {
            await supplierService.createPayment(target.id, {
                amount, accountId: supForm.accountId,
                note: supForm.note.trim() || undefined, date: supForm.date || undefined,
                type: supForm.type,
            });
            setSupModal(false);
            loadSupplierPayments();
        } catch (e: unknown) {
            const msg = (e as { error?: { message?: string } })?.error?.message
                ?? (e instanceof Error ? e.message : 'Failed to save payment.');
            setSupSaveError(msg);
        } finally {
            setSupSaving(false);
        }
    };

    const handlePrintCustPayment = async (p: CustomerPayment) => {
        const cust = p.customer;
        if (!cust) return;
        try {
            await printCustomerPayment({
                payment: p,
                customer: cust
            });
        } catch (e: any) {
            alert(`Failed to print payment receipt: ${e.message || 'Unknown error'}`);
        }
    };

    const handlePrintSupPayment = async (p: SupplierPayment) => {
        const sup = p.supplier;
        if (!sup) return;
        try {
            await printSupplierPayment({
                payment: p,
                supplier: sup
            });
        } catch (e: any) {
            alert(`Failed to print payment voucher: ${e.message || 'Unknown error'}`);
        }
    };

    const custTotalPages = Math.ceil(custTotal / PAGE_SIZE);
    const supTotalPages = Math.ceil(supTotal / PAGE_SIZE);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Wallet size={20} className="text-primary-500" />
                    Payments
                </h1>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                        {([{ key: 'customer' as Tab, label: 'Customer Payments' }, { key: 'supplier' as Tab, label: 'Supplier Payments' }]).map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${tab === t.key
                                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    {tab === 'customer' && (
                        <button onClick={openCustModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                            <Plus size={14} /> New Payment
                        </button>
                    )}
                    {tab === 'supplier' && (
                        <button onClick={openSupModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors">
                            <Plus size={14} /> New Payment
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ CUSTOMER PAYMENTS TAB ═══ */}
            {tab === 'customer' && (
                <>
                    {/* Customer Payments Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        {custLoading ? (
                            <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                        ) : customerPayments.length === 0 ? (
                            <p className="text-center text-gray-400 py-12 text-sm">No payments found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Date & Time</th>
                                            <th className="px-4 py-3">Customer</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Account</th>
                                            <th className="px-4 py-3">Note</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {customerPayments.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                                                <td className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">{(custPage - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatPaymentDate(p.date, p.createdAt)}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{p.customer?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.type === 'SENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                        {p.type === 'SENT' ? 'Refund' : 'Received'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300">{p.account?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{p.note ?? '—'}</td>
                                                <td className={`px-4 py-3 text-sm text-right font-bold ${p.type === 'SENT' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                    {p.type === 'SENT' ? `- ${fmt(p.amount)}` : fmt(p.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handlePrintCustPayment(p)}
                                                        title="Print Receipt"
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {custTotalPages > 1 && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                                <span className="text-gray-500">{custTotal} total payments</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCustPage(p => Math.max(1, p - 1))} disabled={custPage === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
                                    <span className="text-gray-600 dark:text-gray-400">{custPage} / {custTotalPages}</span>
                                    <button onClick={() => setCustPage(p => Math.min(custTotalPages, p + 1))} disabled={custPage === custTotalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Customer Payment Modal */}
                    <Modal open={custModal} onClose={() => setCustModal(false)} title="Customer Payment">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Customer <span className="text-red-500">*</span></label>
                                <CustomerSearch value={custForm.customer} onSelect={c => setCustForm(prev => ({ ...prev, customer: c }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Payment Type <span className="text-red-500">*</span></label>
                                <select value={custForm.type} onChange={e => setCustForm(prev => ({ ...prev, type: e.target.value as 'RECEIVED' | 'SENT' }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="RECEIVED">Received from Customer</option>
                                    <option value="SENT">Paid to Customer (Refund)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Amount (Rs) <span className="text-red-500">*</span></label>
                                <input type="number" min="0.01" step="0.01" value={custForm.amount} onChange={e => setCustForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{custForm.type === 'RECEIVED' ? 'Receive Into Account' : 'Pay From Account'} <span className="text-red-500">*</span></label>
                                <AccountSelect value={custForm.accountId} onChange={id => setCustForm(prev => ({ ...prev, accountId: id }))} placeholder="Select account..." />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Payment Date</label>
                                <input type="date" value={custForm.date} onChange={e => setCustForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Note</label>
                                <textarea value={custForm.note} onChange={e => setCustForm(prev => ({ ...prev, note: e.target.value }))} rows={2} placeholder="Optional note..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                            </div>
                            {custSaveError && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{custSaveError}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setCustModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                                <button type="button" onClick={saveCustPayment} disabled={custSaving}
                                    className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                                    {custSaving && <Loader2 size={13} className="animate-spin" />} Save Payment
                                </button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}

            {/* ═══ SUPPLIER PAYMENTS TAB ═══ */}
            {tab === 'supplier' && (
                <>
                    {/* Supplier Payments Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        {supLoading ? (
                            <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                        ) : supplierPayments.length === 0 ? (
                            <p className="text-center text-gray-400 py-12 text-sm">No payments found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Date & Time</th>
                                            <th className="px-4 py-3">Supplier</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3">Account</th>
                                            <th className="px-4 py-3">Note</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                        {supplierPayments.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                                                <td className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">{(supPage - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatPaymentDate(p.date, p.createdAt)}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{p.supplier?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.type === 'RECEIVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                                        {p.type === 'RECEIVED' ? 'Refund' : 'Paid'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300">{p.account?.name ?? '—'}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{p.note ?? '—'}</td>
                                                <td className={`px-4 py-3 text-sm text-right font-bold ${p.type === 'RECEIVED' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {p.type === 'RECEIVED' ? `- ${fmt(p.amount)}` : fmt(p.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handlePrintSupPayment(p)}
                                                        title="Print Receipt"
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {supTotalPages > 1 && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                                <span className="text-gray-500">{supTotal} total payments</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setSupPage(p => Math.max(1, p - 1))} disabled={supPage === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
                                    <span className="text-gray-600 dark:text-gray-400">{supPage} / {supTotalPages}</span>
                                    <button onClick={() => setSupPage(p => Math.min(supTotalPages, p + 1))} disabled={supPage === supTotalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Supplier Payment Modal */}
                    <Modal open={supModal} onClose={() => setSupModal(false)} title="Supplier Payment">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Supplier <span className="text-red-500">*</span></label>
                                <SupplierSearch value={supForm.supplier} onSelect={s => setSupForm(prev => ({ ...prev, supplier: s }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Payment Type <span className="text-red-500">*</span></label>
                                <select value={supForm.type} onChange={e => setSupForm(prev => ({ ...prev, type: e.target.value as 'SENT' | 'RECEIVED' }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value="SENT">Paid to Supplier</option>
                                    <option value="RECEIVED">Received from Supplier (Refund)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Amount (Rs) <span className="text-red-500">*</span></label>
                                <input type="number" min="0.01" step="0.01" value={supForm.amount} onChange={e => setSupForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">{supForm.type === 'SENT' ? 'Pay From Account' : 'Receive Into Account'} <span className="text-red-500">*</span></label>
                                <AccountSelect value={supForm.accountId} onChange={id => setSupForm(prev => ({ ...prev, accountId: id }))} placeholder="Select account..." />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Payment Date</label>
                                <input type="date" value={supForm.date} onChange={e => setSupForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Note</label>
                                <textarea value={supForm.note} onChange={e => setSupForm(prev => ({ ...prev, note: e.target.value }))} rows={2} placeholder="Optional note..."
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                            </div>
                            {supSaveError && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{supSaveError}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setSupModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                                <button type="button" onClick={saveSupPayment} disabled={supSaving}
                                    className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                                    {supSaving && <Loader2 size={13} className="animate-spin" />} Save Payment
                                </button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
}
