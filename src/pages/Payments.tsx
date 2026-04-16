import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Loader2, ChevronLeft, ChevronRight,
    Download, FileText, Wallet,
} from 'lucide-react';
import { customerService, supplierService } from '../services/pos.service';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { SupplierSearch } from '../components/ui/SupplierSearch';
import { AccountSelect } from '../components/ui/AccountSelect';
import { Modal } from '../components/ui/Modal';
import type { Customer, Supplier, CustomerPayment, SupplierPayment } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = 'customer' | 'supplier';

interface CustomerPaymentForm {
    amount: string;
    accountId: number | null;
    note: string;
    date: string;
    customer: Customer | null;
}

interface SupplierPaymentForm {
    amount: string;
    accountId: number | null;
    note: string;
    date: string;
    supplier: Supplier | null;
}

export function Payments() {
    const [tab, setTab] = useState<Tab>('customer');

    // Customer payments state
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
    const [custTotal, setCustTotal] = useState(0);
    const [custPage, setCustPage] = useState(1);
    const [custLoading, setCustLoading] = useState(false);
    const [custModal, setCustModal] = useState(false);
    const [custForm, setCustForm] = useState<CustomerPaymentForm>({
        amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), customer: null,
    });
    const [custSaving, setCustSaving] = useState(false);
    const [custSaveError, setCustSaveError] = useState('');
    const [custLedgerFrom, setCustLedgerFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
    const [custLedgerTo, setCustLedgerTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [custLedgerLoading, setCustLedgerLoading] = useState(false);

    // Supplier payments state
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [supTotal, setSupTotal] = useState(0);
    const [supPage, setSupPage] = useState(1);
    const [supLoading, setSupLoading] = useState(false);
    const [supModal, setSupModal] = useState(false);
    const [supForm, setSupForm] = useState<SupplierPaymentForm>({
        amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), supplier: null,
    });
    const [supSaving, setSupSaving] = useState(false);
    const [supSaveError, setSupSaveError] = useState('');
    const [supLedgerFrom, setSupLedgerFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
    const [supLedgerTo, setSupLedgerTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [supLedgerLoading, setSupLedgerLoading] = useState(false);

    const PAGE_SIZE = 20;

    // ── Customer Payment Functions ──
    const loadCustomerPayments = useCallback(async () => {
        if (!selectedCustomer) { setCustomerPayments([]); setCustTotal(0); return; }
        setCustLoading(true);
        try {
            const r = await customerService.getPayments(selectedCustomer.id, { page: custPage, pageSize: PAGE_SIZE });
            setCustomerPayments(r.data ?? []); setCustTotal(r.pagination?.total ?? 0);
        } catch { setCustomerPayments([]); } finally { setCustLoading(false); }
    }, [selectedCustomer, custPage]);

    useEffect(() => { loadCustomerPayments(); }, [loadCustomerPayments]);

    const openCustModal = () => {
        setCustSaveError('');
        setCustForm({ amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), customer: selectedCustomer });
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
            });
            setCustModal(false);
            if (selectedCustomer && target.id === selectedCustomer.id) {
                const updated = await customerService.get(target.id);
                setSelectedCustomer(updated);
            }
            loadCustomerPayments();
        } catch (e: unknown) {
            const msg = (e as { error?: { message?: string } })?.error?.message
                ?? (e instanceof Error ? e.message : 'Failed to save payment.');
            setCustSaveError(msg);
        } finally { setCustSaving(false); }
    };

    const downloadCustLedger = async () => {
        if (!selectedCustomer) return;
        setCustLedgerLoading(true);
        try {
            const blob = await apiClient.getBlob(
                API_ENDPOINTS.reports.customerLedgerPdf(selectedCustomer.id),
                { params: { from: custLedgerFrom, to: custLedgerTo } },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customer-ledger-${selectedCustomer.name.replace(/\s+/g, '-')}-${custLedgerFrom}-${custLedgerTo}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch { alert('Failed to generate ledger PDF.'); } finally { setCustLedgerLoading(false); }
    };

    // ── Supplier Payment Functions ──
    const loadSupplierPayments = useCallback(async () => {
        if (!selectedSupplier) { setSupplierPayments([]); setSupTotal(0); return; }
        setSupLoading(true);
        try {
            const r = await supplierService.getPayments(selectedSupplier.id, { page: supPage, pageSize: PAGE_SIZE });
            setSupplierPayments(r.data ?? []); setSupTotal(r.pagination?.total ?? 0);
        } catch { setSupplierPayments([]); } finally { setSupLoading(false); }
    }, [selectedSupplier, supPage]);

    useEffect(() => { loadSupplierPayments(); }, [loadSupplierPayments]);

    const openSupModal = () => {
        setSupSaveError('');
        setSupForm({ amount: '', accountId: null, note: '', date: new Date().toISOString().slice(0, 10), supplier: selectedSupplier });
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
            });
            setSupModal(false);
            if (selectedSupplier && target.id === selectedSupplier.id) {
                const updated = await supplierService.get(target.id);
                setSelectedSupplier(updated);
            }
            loadSupplierPayments();
        } catch (e: unknown) {
            const msg = (e as { error?: { message?: string } })?.error?.message
                ?? (e instanceof Error ? e.message : 'Failed to save payment.');
            setSupSaveError(msg);
        } finally { setSupSaving(false); }
    };

    const downloadSupLedger = async () => {
        if (!selectedSupplier) return;
        setSupLedgerLoading(true);
        try {
            const blob = await apiClient.getBlob(
                API_ENDPOINTS.reports.supplierLedgerPdf(selectedSupplier.id),
                { params: { from: supLedgerFrom, to: supLedgerTo } },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `supplier-ledger-${selectedSupplier.name.replace(/\s+/g, '-')}-${supLedgerFrom}-${supLedgerTo}.pdf`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch { alert('Failed to generate ledger PDF.'); } finally { setSupLedgerLoading(false); }
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
                            <Plus size={14} /> Receive Payment
                        </button>
                    )}
                    {tab === 'supplier' && (
                        <button onClick={openSupModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors">
                            <Plus size={14} /> Pay Supplier
                        </button>
                    )}
                </div>
            </div>

            {/* ═══ CUSTOMER PAYMENTS TAB ═══ */}
            {tab === 'customer' && (
                <>
                    {/* Customer Filter */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Select Customer to View Payments</label>
                        <CustomerSearch value={selectedCustomer} onSelect={c => { setSelectedCustomer(c); setCustPage(1); }} />
                        {selectedCustomer && (
                            <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Outstanding Balance: </span>
                                        <span className={`font-semibold ${selectedCustomer.balance > 0 ? 'text-red-600' : selectedCustomer.balance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                            {selectedCustomer.balance > 0 ? `${fmt(selectedCustomer.balance)} (Due)` : selectedCustomer.balance < 0 ? `${fmt(Math.abs(selectedCustomer.balance))} (Advance)` : 'Clear'}
                                        </span>
                                    </div>
                                    {selectedCustomer.creditLimit != null && (
                                        <div><span className="text-gray-500">Credit Limit: </span><span className="font-medium">{fmt(selectedCustomer.creditLimit)}</span></div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                                    <FileText size={13} className="text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 shrink-0">Ledger PDF:</span>
                                    <input type="date" value={custLedgerFrom} onChange={e => setCustLedgerFrom(e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500" />
                                    <span className="text-gray-400 text-xs">—</span>
                                    <input type="date" value={custLedgerTo} onChange={e => setCustLedgerTo(e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500" />
                                    <button onClick={downloadCustLedger} disabled={custLedgerLoading}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                                        {custLedgerLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Customer Payments Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        {!selectedCustomer ? (
                            <p className="text-center text-gray-400 py-12 text-sm">Search and select a customer above to view their payment history</p>
                        ) : custLoading ? (
                            <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                        ) : customerPayments.length === 0 ? (
                            <p className="text-center text-gray-400 py-12 text-sm">No payments found for <span className="font-medium text-gray-600 dark:text-gray-300">{selectedCustomer.name}</span></p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wider">
                                            <th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Account</th>
                                            <th className="px-4 py-2.5">Note</th><th className="px-4 py-2.5 text-right">Amount Received</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerPayments.map((p, i) => (
                                            <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{(custPage - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{new Date(p.date ?? p.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.account?.name ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{p.note ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-green-600">{fmt(p.amount)}</td>
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

                    {/* Receive Payment Modal */}
                    <Modal open={custModal} onClose={() => setCustModal(false)} title="Receive Customer Payment">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Customer <span className="text-red-500">*</span></label>
                                <CustomerSearch value={custForm.customer} onSelect={c => setCustForm(prev => ({ ...prev, customer: c }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Amount (Rs) <span className="text-red-500">*</span></label>
                                <input type="number" min="0.01" step="0.01" value={custForm.amount} onChange={e => setCustForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Receive Into Account <span className="text-red-500">*</span></label>
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
                    {/* Supplier Filter */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Select Supplier to View Payments</label>
                        <SupplierSearch value={selectedSupplier} onSelect={s => { setSelectedSupplier(s); setSupPage(1); }} />
                        {selectedSupplier && (
                            <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Outstanding Balance: </span>
                                        <span className={`font-semibold ${selectedSupplier.balance > 0 ? 'text-amber-600' : selectedSupplier.balance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                            {selectedSupplier.balance > 0 ? `${fmt(selectedSupplier.balance)} (Payable)` : selectedSupplier.balance < 0 ? `${fmt(Math.abs(selectedSupplier.balance))} (Advance)` : 'Clear'}
                                        </span>
                                    </div>
                                    {selectedSupplier.paymentTerms && (
                                        <div><span className="text-gray-500">Payment Terms: </span><span className="font-medium">{selectedSupplier.paymentTerms}</span></div>
                                    )}
                                    {selectedSupplier.bankDetails && (
                                        <div><span className="text-gray-500">Bank: </span><span className="font-medium">{selectedSupplier.bankDetails}</span></div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                                    <FileText size={13} className="text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 shrink-0">Ledger PDF:</span>
                                    <input type="date" value={supLedgerFrom} onChange={e => setSupLedgerFrom(e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500" />
                                    <span className="text-gray-400 text-xs">—</span>
                                    <input type="date" value={supLedgerTo} onChange={e => setSupLedgerTo(e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500" />
                                    <button onClick={downloadSupLedger} disabled={supLedgerLoading}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                                        {supLedgerLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Supplier Payments Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        {!selectedSupplier ? (
                            <p className="text-center text-gray-400 py-12 text-sm">Search and select a supplier above to view their payment history</p>
                        ) : supLoading ? (
                            <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                        ) : supplierPayments.length === 0 ? (
                            <p className="text-center text-gray-400 py-12 text-sm">No payments found for <span className="font-medium text-gray-600 dark:text-gray-300">{selectedSupplier.name}</span></p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wider">
                                            <th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Account (Paid From)</th>
                                            <th className="px-4 py-2.5">Note</th><th className="px-4 py-2.5 text-right">Amount Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplierPayments.map((p, i) => (
                                            <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                <td className="px-4 py-2.5 text-gray-400 text-xs">{(supPage - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{new Date(p.date ?? p.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{p.account?.name ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{p.note ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-amber-600">{fmt(p.amount)}</td>
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

                    {/* Pay Supplier Modal */}
                    <Modal open={supModal} onClose={() => setSupModal(false)} title="Pay Supplier">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Supplier <span className="text-red-500">*</span></label>
                                <SupplierSearch value={supForm.supplier} onSelect={s => setSupForm(prev => ({ ...prev, supplier: s }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Amount (Rs) <span className="text-red-500">*</span></label>
                                <input type="number" min="0.01" step="0.01" value={supForm.amount} onChange={e => setSupForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Pay From Account <span className="text-red-500">*</span></label>
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
