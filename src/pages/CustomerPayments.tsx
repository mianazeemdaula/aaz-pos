import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, ChevronLeft, ChevronRight, ArrowDownCircle, Download, FileText } from 'lucide-react';
import { customerService } from '../services/pos.service';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { AccountSelect } from '../components/ui/AccountSelect';
import { Modal } from '../components/ui/Modal';
import type { Customer, CustomerPayment } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentForm {
    amount: string;
    accountId: number | null;
    note: string;
    date: string;
    customer: Customer | null;
}

export function CustomerPayments() {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [payments, setPayments] = useState<CustomerPayment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState<PaymentForm>({
        amount: '',
        accountId: null,
        note: '',
        date: new Date().toISOString().slice(0, 10),
        customer: null,
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [ledgerFrom, setLedgerFrom] = useState(() => new Date().toISOString().slice(0, 8) + '01');
    const [ledgerTo, setLedgerTo] = useState(() => new Date().toISOString().slice(0, 10));
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const PAGE_SIZE = 20;

    const load = useCallback(async () => {
        if (!selectedCustomer) {
            setPayments([]);
            setTotal(0);
            return;
        }
        setLoading(true);
        try {
            const r = await customerService.getPayments(selectedCustomer.id, { page, pageSize: PAGE_SIZE });
            setPayments(r.data ?? []);
            setTotal(r.pagination?.total ?? 0);
        } catch {
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [selectedCustomer, page]);

    useEffect(() => { load(); }, [load]);

    const handleCustomerChange = (c: Customer | null) => {
        setSelectedCustomer(c);
        setPage(1);
    };

    const openModal = () => {
        setSaveError('');
        setForm({
            amount: '',
            accountId: null,
            note: '',
            date: new Date().toISOString().slice(0, 10),
            customer: selectedCustomer,
        });
        setModal(true);
    };

    const save = async () => {
        setSaveError('');
        const target = form.customer;
        if (!target) { setSaveError('Please select a customer.'); return; }
        const amount = Number(form.amount);
        if (!form.amount || amount <= 0) { setSaveError('Enter a valid amount greater than 0.'); return; }
        if (!form.accountId) { setSaveError('Please select an account.'); return; }

        setSaving(true);
        try {
            await customerService.createPayment(target.id, {
                amount,
                accountId: form.accountId,
                note: form.note.trim() || undefined,
                date: form.date || undefined,
            });
            setModal(false);
            // refresh customer balance if the selected one was paid
            if (selectedCustomer && target.id === selectedCustomer.id) {
                const updated = await customerService.get(target.id);
                setSelectedCustomer(updated);
            }
            load();
        } catch (e: unknown) {
            const msg = (e as { error?: { message?: string } })?.error?.message
                ?? (e instanceof Error ? e.message : 'Failed to save payment.');
            setSaveError(msg);
        } finally {
            setSaving(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const downloadLedger = async () => {
        if (!selectedCustomer) return;
        setLedgerLoading(true);
        try {
            const blob = await apiClient.getBlob(
                API_ENDPOINTS.reports.customerLedgerPdf(selectedCustomer.id),
                { params: { from: ledgerFrom, to: ledgerTo } },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customer-ledger-${selectedCustomer.name.replace(/\s+/g, '-')}-${ledgerFrom}-${ledgerTo}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            alert('Failed to generate ledger PDF. Please try again.');
        } finally {
            setLedgerLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ArrowDownCircle size={20} className="text-green-500" />
                    Customer Payments
                </h1>
                <button
                    onClick={openModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                    <Plus size={14} /> Receive Payment
                </button>
            </div>

            {/* Customer Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                    Select Customer to View Payments
                </label>
                <CustomerSearch value={selectedCustomer} onSelect={handleCustomerChange} />
                {selectedCustomer && (
                    <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Outstanding Balance: </span>
                                <span className={`font-semibold ${selectedCustomer.balance > 0 ? 'text-red-600' : selectedCustomer.balance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                    {selectedCustomer.balance > 0
                                        ? `${fmt(selectedCustomer.balance)} (Due)`
                                        : selectedCustomer.balance < 0
                                            ? `${fmt(Math.abs(selectedCustomer.balance))} (Advance)`
                                            : 'Clear'}
                                </span>
                            </div>
                            {selectedCustomer.creditLimit != null && (
                                <div>
                                    <span className="text-gray-500">Credit Limit: </span>
                                    <span className="font-medium">{fmt(selectedCustomer.creditLimit)}</span>
                                </div>
                            )}
                        </div>
                        {/* Ledger PDF download */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                            <FileText size={13} className="text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-500 shrink-0">Ledger PDF:</span>
                            <input
                                type="date"
                                value={ledgerFrom}
                                onChange={e => setLedgerFrom(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <span className="text-gray-400 text-xs">—</span>
                            <input
                                type="date"
                                value={ledgerTo}
                                onChange={e => setLedgerTo(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <button
                                onClick={downloadLedger}
                                disabled={ledgerLoading}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {ledgerLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                                Download
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Payments Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                {!selectedCustomer ? (
                    <p className="text-center text-gray-400 py-12 text-sm">
                        Search and select a customer above to view their payment history
                    </p>
                ) : loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={20} className="text-primary-600 animate-spin" />
                    </div>
                ) : payments.length === 0 ? (
                    <p className="text-center text-gray-400 py-12 text-sm">
                        No payments found for <span className="font-medium text-gray-600 dark:text-gray-300">{selectedCustomer.name}</span>
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-2.5">#</th>
                                    <th className="px-4 py-2.5">Date</th>
                                    <th className="px-4 py-2.5">Account</th>
                                    <th className="px-4 py-2.5">Note</th>
                                    <th className="px-4 py-2.5 text-right">Amount Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                    >
                                        <td className="px-4 py-2.5 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                                            {new Date(p.date ?? p.createdAt).toLocaleDateString('en-PK', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                                            {p.account?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{p.note ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-green-600">
                                            {fmt(p.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                        <span className="text-gray-500">{total} total payments</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Receive Payment Modal */}
            <Modal open={modal} onClose={() => setModal(false)} title="Receive Customer Payment">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Customer <span className="text-red-500">*</span>
                        </label>
                        <CustomerSearch
                            value={form.customer}
                            onSelect={c => setForm(prev => ({ ...prev, customer: c }))}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Amount (Rs) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.amount}
                            onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Receive Into Account <span className="text-red-500">*</span>
                        </label>
                        <AccountSelect
                            value={form.accountId}
                            onChange={id => setForm(prev => ({ ...prev, accountId: id }))}
                            placeholder="Select account..."
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Payment Date
                        </label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                            Note
                        </label>
                        <textarea
                            value={form.note}
                            onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))}
                            rows={2}
                            placeholder="Optional note..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                    </div>

                    {saveError && (
                        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            {saveError}
                        </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setModal(false)}
                            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                        >
                            {saving && <Loader2 size={13} className="animate-spin" />}
                            Save Payment
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
