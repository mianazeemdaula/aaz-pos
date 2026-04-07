import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { accountService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import type { Account } from '../types/pos';

const PAGE_SIZE = 20;

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function Accounts() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Account } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Partial<Account>>({ type: 'ASSET' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await accountService.list({ page, pageSize: PAGE_SIZE }); setItems(r.data); setTotal(r.pagination?.total ?? 0); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      modal?.mode === 'edit' && modal.item ? await accountService.update(modal.item.id, form) : await accountService.create(form);
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await accountService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const cashTotal = items.filter(a => a.type === 'ASSET').reduce((s, a) => s + (a.balance ?? 0), 0);
  const bankTotal = items.filter(a => a.type === 'LIABILITY').reduce((s, a) => s + (a.balance ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
        <button onClick={() => { setForm({ type: 'ASSET', balance: 0 }); setModal({ mode: 'add' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Add Account</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Cash</p>
          <p className="text-xl font-bold text-green-600">{fmt(cashTotal)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Bank</p>
          <p className="text-xl font-bold text-blue-600">{fmt(bankTotal)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No accounts yet</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Account Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2 text-right">Balance</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.type === 'ASSET' || item.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{item.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(item.balance ?? 0)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          <button onClick={() => { setForm(item); setModal({ mode: 'edit', item }); }} className="text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
                          <button onClick={() => setConfirm({ id: item.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        {(() => { const totalPages = Math.ceil(total / PAGE_SIZE); return totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} /> : null; })()}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Account' : 'Add Account'} size="sm">
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Account Name *</label>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Type</label>
            <select value={form.type ?? 'ASSET'} onChange={e => setForm(p => ({ ...p, type: e.target.value as Account['type'] }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
              <option value="ASSET">Asset</option><option value="LIABILITY">Liability</option><option value="EQUITY">Equity</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option>
            </select>
          </div>
          {modal?.mode === 'add' && (
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Opening Balance</label>
              <input type="number" value={form.balance ?? 0} min={0} onChange={e => setForm(p => ({ ...p, balance: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete Account" message="Delete this account? All transactions linked to it may be affected." variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
