import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { stockMovementService } from '../services/pos.service';
import { ProductSearch } from '../components/ui/ProductSearch';
import { Modal } from '../components/ui/Modal';
import type { ProductVariant, StockMovement } from '../types/pos';

const TYPES = ['IN', 'OUT', 'ADJUST'];

export function StockAdjustments() {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<{ variantId?: number; variantName?: string; qty: number; type: string; reason: string; cost?: number }>({ qty: 1, type: 'ADJUST', reason: '' });
  const [saving, setSaving] = useState(false);
  const PAGE_SIZE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await stockMovementService.list({ page, pageSize: PAGE_SIZE }); setItems(r.data as unknown as StockMovement[]); setTotal(r.pagination.total); }
    catch { setItems([]); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.variantId || !form.qty || !form.reason) return;
    setSaving(true);
    try { await stockMovementService.adjust({ productId: form.variantId!, quantity: form.qty, note: form.reason || undefined }); setModal(false); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Stock Adjustments</h1>
        <button onClick={() => { setForm({ qty: 1, type: 'ADJUST', reason: '' }); setModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"><Plus size={14} /> New Adjustment</button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No stock movements yet</p>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2">Reason</th>
                    <th className="px-4 py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id as number} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(String(item.createdAt ?? '')).toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{String((item.product?.name))}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.type === 'PURCHASE' ? 'bg-green-100 text-green-700' : item.type === 'SALE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{String(item.type ?? '—')}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{String(item.quantity ?? '—')}</td>
                      <td className="px-4 py-2.5 text-gray-500">{String(item.note ?? '—')}</td>
                      <td className="px-4 py-2.5 text-gray-500">{String((item.reference ?? '—'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="New Stock Adjustment" size="sm">
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Product *</label>
            <ProductSearch onSelect={(v: ProductVariant) => setForm(p => ({ ...p, variantId: v.id, variantName: v.name }))} />
            {form.variantName && <p className="mt-1 text-xs text-primary-600">{form.variantName}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Type</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Quantity *</label>
              <input type="number" value={form.qty} min={1} onChange={e => f('qty', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Reason *</label>
            <input value={form.reason} onChange={e => f('reason', e.target.value)} placeholder="e.g. Damage, Recount, Transfer..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(false)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={save} disabled={saving || !form.variantId || !form.reason} className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />} Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
