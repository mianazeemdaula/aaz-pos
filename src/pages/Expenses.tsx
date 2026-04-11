import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { expenseService } from '../services/pos.service';
import { AccountSelect } from '../components/ui/AccountSelect';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Expense } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Expense } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Partial<Expense>>({ amount: 0 });
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await expenseService.list({ q, page, pageSize: PAGE_SIZE }); setItems(r.data); setTotal(r.pagination?.total ?? 0); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      modal?.mode === 'edit' && modal.item ? await expenseService.update(modal.item.id, form) : await expenseService.create(form);
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await expenseService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const f = (key: keyof Expense, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Expenses</h1>
        <button onClick={() => { setForm({ amount: 0, date: new Date().toISOString().slice(0, 10) }); setModal({ mode: 'add' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Add Expense</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No expenses found</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Date</th><th className="px-4 py-2">Description</th><th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Account</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.description}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.category ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.account?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">{fmt(item.amount)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setForm(item); setModal({ mode: 'edit', item }); }} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setConfirm({ id: item.id })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Expense' : 'Add Expense'} size="sm">
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description *</label>
            <input value={form.description ?? ''} onChange={e => f('description', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Amount *</label>
              <input type="number" value={form.amount ?? 0} min={0} step="0.01" onChange={e => f('amount', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Date</label>
              <input type="date" value={String(form.date ?? '').slice(0, 10)} onChange={e => f('date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Category</label>
            <input value={form.category ?? ''} onChange={e => f('category', e.target.value)} placeholder="e.g. Rent, Utilities..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Account</label>
            <AccountSelect value={form.accountId} onChange={id => f('accountId', id)} /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Note</label>
            <textarea value={form.note ?? ''} onChange={e => f('note', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.description || !form.amount} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete Expense" message="Delete this expense record?" variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
