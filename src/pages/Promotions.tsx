import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { promotionService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';

type Promo = Record<string, unknown>;
const TYPES = ['PERCENTAGE', 'FIXED', 'BOGO'];
const PAGE_SIZE = 20;

export function Promotions() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Promo } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Promo>({ type: 'PERCENTAGE', isActive: true, value: 0 });
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await promotionService.list({ page, pageSize: PAGE_SIZE }); setItems(r.data as unknown as Promo[]); setTotal(r.pagination?.total ?? 0); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      modal?.mode === 'edit' && modal.item ? await promotionService.update(modal.item.id as number, form) : await promotionService.create(form);
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await promotionService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Promotions</h1>
        <button onClick={() => { setForm({ type: 'PERCENTAGE', isActive: true, value: 0, startDate: today, endDate: today }); setModal({ mode: 'add' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Add Promotion</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No promotions yet</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Value</th><th className="px-4 py-2">Valid</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id as number} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{String(item.name ?? '—')}</td>
                      <td className="px-4 py-2.5"><span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{String(item.type ?? '—')}</span></td>
                      <td className="px-4 py-2.5">{item.type === 'PERCENTAGE' ? `${item.value}%` : String(item.type === 'BOGO' ? 'Buy 1 Get 1' : `Rs ${item.value}`)}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{item.startDate ? `${String(item.startDate).slice(0, 10)} – ${String(item.endDate ?? '').slice(0, 10)}` : '—'}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded-full ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => { setForm(item); setModal({ mode: 'edit', item }); }} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => setConfirm({ id: item.id as number })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        {(() => { const totalPages = Math.ceil(total / PAGE_SIZE); return totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} /> : null; })()}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Promotion' : 'Add Promotion'} size="sm">
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Name *</label>
            <input value={String(form.name ?? '')} onChange={e => f('name', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Type</label>
              <select value={String(form.type ?? 'PERCENTAGE')} onChange={e => f('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Value</label>
              <input type="number" value={Number(form.value ?? 0)} min={0} onChange={e => f('value', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Start Date</label>
              <input type="date" value={String(form.startDate ?? '')} onChange={e => f('startDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">End Date</label>
              <input type="date" value={String(form.endDate ?? '')} onChange={e => f('endDate', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" /></div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={Boolean(form.isActive)} onChange={e => f('isActive', e.target.checked)} className="rounded border-gray-300 text-primary-600" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete Promotion" message="Delete this promotion?" variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
