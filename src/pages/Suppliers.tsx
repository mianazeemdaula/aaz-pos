import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, Eye } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { useNavigate } from 'react-router-dom';
import { supplierService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { formatPhone, handlePhoneInput } from '../utils/formatters';
import type { Supplier } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export function Suppliers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Supplier } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>({});
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await supplierService.list({ q, page, pageSize: PAGE_SIZE }); setItems(r.data); setTotal(r.pagination.total); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      modal?.mode === 'edit' && modal.item ? await supplierService.update(modal.item.id, form) : await supplierService.create(form);
      setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await supplierService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const f = (key: keyof Supplier, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Suppliers</h1>
        <button onClick={() => { setForm({}); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> Add Supplier</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, phone..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No suppliers found</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">City</th><th className="px-4 py-2 text-right">Balance</th><th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatPhone(item.phone)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{item.city ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${item.balance > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{item.balance !== 0 ? fmt(item.balance) : 'Clear'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => navigate(`/suppliers/${item.id}`)} className="p-1.5 rounded-lg text-violet-500 bg-violet-50 hover:bg-violet-100 dark:text-violet-400 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"><Eye size={14} /></button>
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
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Supplier' : 'Add Supplier'} size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Name *</label>
              <input value={form.name ?? ''} onChange={e => f('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Phone</label>
              <input value={form.phone ? handlePhoneInput(form.phone).display : ''} onChange={e => { const { raw } = handlePhoneInput(e.target.value); f('phone', raw); }} placeholder="03xx-xxxxxxx" className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Email</label>
              <input type="email" value={form.email ?? ''} onChange={e => f('email', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">NTN</label>
              <input value={form.ntn ?? ''} onChange={e => f('ntn', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">City</label>
              <input value={form.city ?? ''} onChange={e => f('city', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Address</label>
              <textarea value={form.address ?? ''} onChange={e => f('address', e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.name} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} title="Delete Supplier" message="Delete this supplier?" variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
