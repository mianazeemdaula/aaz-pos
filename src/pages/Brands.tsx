import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { brandService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import type { Brand } from '../types/pos';

const PAGE_SIZE = 20;

export function Brands() {
  const [items, setItems] = useState<Brand[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Brand } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Partial<Brand>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await brandService.list({ q, page, pageSize: PAGE_SIZE }); setItems(r.data); setTotal(r.pagination?.total ?? 0); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      modal?.mode === 'edit' && modal.item ? await brandService.update(modal.item.id, form) : await brandService.create(form);
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await brandService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Brands</h1>
        <button onClick={() => { setForm({}); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Add</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search brands..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No brands found</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Description</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.description ?? '—'}</td>
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
        {(() => { const totalPages = Math.ceil(total / PAGE_SIZE); return totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} /> : null; })()}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Brand' : 'Add Brand'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Name *</label>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete Brand" message="Delete this brand?" variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
