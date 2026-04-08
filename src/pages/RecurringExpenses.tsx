import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { recurringExpenseService, accountService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { RecurringExpense, Account } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
const PAGE_SIZE = 20;
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

const FREQ_BADGE: Record<string, string> = {
    DAILY: 'bg-purple-100 text-purple-700',
    WEEKLY: 'bg-blue-100 text-blue-700',
    MONTHLY: 'bg-green-100 text-green-700',
    QUARTERLY: 'bg-amber-100 text-amber-700',
    YEARLY: 'bg-red-100 text-red-700',
};

type FormState = {
    name: string;
    description: string;
    category: string;
    amount: number;
    frequency: RecurringExpense['frequency'];
    startDate: string;
    endDate: string;
    active: boolean;
    accountId: number | undefined;
};

const defaultForm = (): FormState => ({
    name: '',
    description: '',
    category: '',
    amount: 0,
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    active: true,
    accountId: undefined,
});

export function RecurringExpenses() {
    const [items, setItems] = useState<RecurringExpense[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [filterFreq, setFilterFreq] = useState('');
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: RecurringExpense } | null>(null);
    const [confirm, setConfirm] = useState<{ id: number } | null>(null);
    const [form, setForm] = useState<FormState>(defaultForm());
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { q, page, pageSize: PAGE_SIZE };
            if (filterFreq) params.frequency = filterFreq;
            const r = await recurringExpenseService.list(params);
            setItems(r.data);
            setTotal(r.pagination?.total ?? 0);
        } catch { setItems([]); }
        finally { setLoading(false); }
    }, [q, page, filterFreq]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        accountService.list({ pageSize: 200 }).then(r => setAccounts(r.data)).catch(() => { });
    }, []);

    const openAdd = () => {
        setForm(defaultForm());
        setModal({ mode: 'add' });
    };

    const openEdit = (item: RecurringExpense) => {
        setForm({
            name: item.name,
            description: item.description ?? '',
            category: item.category,
            amount: item.amount,
            frequency: item.frequency,
            startDate: item.startDate?.toString().slice(0, 10) ?? '',
            endDate: item.endDate?.toString().slice(0, 10) ?? '',
            active: item.active,
            accountId: item.accountId ?? undefined,
        });
        setModal({ mode: 'edit', item });
    };

    const save = async () => {
        if (!form.name?.trim() || !form.category?.trim() || !form.amount) {
            alert('Name, category, and amount are required');
            return;
        }
        setSaving(true);
        try {
            const data = {
                ...form,
                endDate: form.endDate || undefined,
                accountId: form.accountId || undefined,
            };
            if (modal?.mode === 'edit' && modal.item) {
                await recurringExpenseService.update(modal.item.id, data);
            } else {
                await recurringExpenseService.create(data);
            }
            setModal(null);
            load();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Error');
        } finally { setSaving(false); }
    };

    const del = async () => {
        if (!confirm) return;
        try { await recurringExpenseService.delete(confirm.id); load(); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
        finally { setConfirm(null); }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const inp = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recurring Expenses</h1>
                <button onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
                    <Plus size={14} /> Add
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-45">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search..."
                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <select value={filterFreq} onChange={e => { setFilterFreq(e.target.value); setPage(1); }}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                        <option value="">All Frequencies</option>
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>

                {loading
                    ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
                    : items.length === 0
                        ? <p className="text-center text-gray-400 py-12 text-sm">No recurring expenses found</p>
                        : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                                            <th className="px-4 py-2">Name</th>
                                            <th className="px-4 py-2">Category</th>
                                            <th className="px-4 py-2 text-right">Amount</th>
                                            <th className="px-4 py-2">Frequency</th>
                                            <th className="px-4 py-2">Account</th>
                                            <th className="px-4 py-2">Start</th>
                                            <th className="px-4 py-2">Status</th>
                                            <th className="px-4 py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map(item => (
                                            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                                <td className="px-4 py-2.5 text-gray-500">{item.category}</td>
                                                <td className="px-4 py-2.5 text-right font-medium">{fmt(item.amount)}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${FREQ_BADGE[item.frequency] ?? 'bg-gray-100 text-gray-500'}`}>
                                                        {item.frequency}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-500">{item.account?.name ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-gray-500 text-xs">{item.startDate ? new Date(item.startDate).toLocaleDateString('en-PK') : '—'}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {item.active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
                                                        <button onClick={() => setConfirm({ id: item.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                {totalPages > 1 && (
                    <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
                )}
            </div>

            <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Recurring Expense' : 'Add Recurring Expense'} size="md">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Name *</label>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="e.g. Office Rent" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Category *</label>
                            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className={inp} placeholder="e.g. Utilities" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Amount *</label>
                            <input type="number" value={form.amount} min={0} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} className={inp} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Frequency</label>
                            <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value as RecurringExpense['frequency'] }))} className={inp}>
                                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Account</label>
                            <select value={form.accountId ?? ''} onChange={e => setForm(p => ({ ...p, accountId: e.target.value ? Number(e.target.value) : undefined }))} className={inp}>
                                <option value="">None</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Start Date *</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">End Date</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inp} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
                            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                                className={`${inp} resize-none`} placeholder="Optional description" />
                        </div>
                        <div className="col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="rounded" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setModal(null)}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button onClick={save} disabled={saving || !form.name?.trim() || !form.category?.trim() || !form.amount}
                            className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
                            {saving && <Loader2 size={13} className="animate-spin" />} Save
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog open={!!confirm} title="Delete Recurring Expense" message="Delete this recurring expense?" variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
        </div>
    );
}
