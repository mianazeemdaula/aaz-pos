import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Loader2, Package, ChevronDown, ChevronUp, ListPlus } from 'lucide-react';
import { promotionService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import type { Promotion } from '../types/pos';

const CONDITION_TYPES = [
  { value: 'ALL_CUSTOMERS', label: 'All Customers' },
  { value: 'MINIMUM_PURCHASE', label: 'Minimum Purchase' },
  { value: 'REPEAT_CUSTOMERS', label: 'Repeat Customers' },
  { value: 'PRODUCT_SPECIFIC', label: 'Product Specific' },
];
const PAGE_SIZE = 20;

const toDateStr = (d: string | undefined) => d ? new Date(d).toISOString().slice(0, 10) : '';

export function Promotions() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await promotionService.list({ page, pageSize: PAGE_SIZE });
      setItems(r.data ?? []);
      setTotal(r.pagination?.total ?? 0);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const del = async () => {
    if (!confirm) return;
    try { await promotionService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Promotions</h1>
        <button onClick={() => navigate('/promotions/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
          <Plus size={14} /> Add Promotion
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {loading ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No promotions yet</p>
            : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 w-8" />
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Discount</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Validity</th>
                  <th className="px-4 py-2">Products</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const pItems = item.promotionItems ?? [];
                    return (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-2.5" colSpan={8}>
                          <div className="flex items-center">
                            <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-1 mr-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                              {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </button>
                            <div className="flex-1 grid grid-cols-7 items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                              <span>
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                  {item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `Rs ${item.discountValue}`}
                                </span>
                              </span>
                              <span className="text-xs text-gray-500">{CONDITION_TYPES.find(c => c.value === item.conditionType)?.label ?? item.conditionType}</span>
                              <span className="text-xs text-gray-500">{toDateStr(item.startDate)} – {toDateStr(item.endDate)}</span>
                              <span className="text-xs text-gray-500">{pItems.length} item{pItems.length !== 1 ? 's' : ''}</span>
                              <span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                  {item.active ? 'Active' : 'Inactive'}
                                </span>
                              </span>
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => navigate(`/promotions/${item.id}/items`)} title="Manage Items"
                                  className="p-1.5 rounded-lg text-emerald-500 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-colors"><ListPlus size={14} /></button>
                                <button onClick={() => navigate(`/promotions/${item.id}/edit`)} title="Edit"
                                  className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={14} /></button>
                                <button onClick={() => setConfirm({ id: item.id })} title="Delete"
                                  className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          </div>
                          {isExpanded && pItems.length > 0 && (
                            <div className="mt-3 ml-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {pItems.map(pi => (
                                <div key={pi.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs">
                                  <Package size={12} className="text-gray-400 shrink-0" />
                                  <span className="text-gray-700 dark:text-gray-300 truncate">
                                    {pi.variant?.product?.name ?? 'Product'} — {pi.variant?.name ?? 'Variant'} ({pi.variant?.barcode ?? ''})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {isExpanded && pItems.length === 0 && (
                            <p className="mt-2 ml-8 text-xs text-gray-400">No products assigned — applies to all items.</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        {(() => { const totalPages = Math.ceil(total / PAGE_SIZE); return totalPages > 1 ? <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} /> : null; })()}
      </div>

      <ConfirmDialog open={!!confirm} title="Delete Promotion" message="This will permanently delete this promotion and all its product assignments." variant="danger" confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}
