import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { productService, categoryService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Product, Category } from '../types/pos';

const fmt = (n: number | null | undefined) =>
  n != null ? `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}` : '—';

// ─── Category helpers ────────────────────────────────────────────────────────
function extractCats(r: unknown): Category[] {
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object' && Array.isArray((r as { data?: unknown }).data))
    return (r as { data: Category[] }).data;
  return [];
}
function renderCatOptions(cats: Category[], depth = 0): ReactNode[] {
  return cats.flatMap(c => [
    <option key={c.id} value={c.id}>{'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{c.name}</option>,
    ...renderCatOptions(c.subcategories ?? [], depth + 1),
  ]);
}

// ─── Main component ──────────────────────────────────────────────────────────
export function Products() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filterCatId, setFilterCatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [catRoots, setCatRoots] = useState<Category[]>([]);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await productService.list({ q, page, pageSize: PAGE_SIZE, categoryId: filterCatId ? Number(filterCatId) : undefined });
      setItems(Array.isArray(r?.data) ? r.data : []);
      setTotal(r?.pagination?.total ?? 0);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [q, page, filterCatId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    categoryService.list({}).then(r => {
      const cats = extractCats(r);
      setCatRoots(cats.filter(c => !c.parentId));
    }).catch(() => { });
  }, []);

  const del = async () => {
    if (!confirm) return;
    try { await productService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
        <button onClick={() => navigate('/products/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search products..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filterCatId} onChange={e => { setFilterCatId(e.target.value); setPage(1); }}
            className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
            <option value="">All Categories</option>
            {renderCatOptions(catRoots)}
          </select>
        </div>

        {loading
          ? <div className="flex justify-center py-12"><Loader2 size={20} className="text-primary-600 animate-spin" /></div>
          : items.length === 0
            ? <div className="py-16 text-center text-gray-400"><Package size={36} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No products found</p></div>
            : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Brand</th>
                    <th className="px-4 py-2 text-right">Sale Price</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                    <th className="px-4 py-2 text-right">Allow -</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const variant = item.variants?.[0];
                    return (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                          {variant?.barcode && <p className="text-xs text-gray-400">{variant.barcode}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{item.category?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{item.brand?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right">{variant ? fmt(variant.price ?? variant.price ?? 0) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{variant ? fmt(variant.product?.avgCostPrice ?? variant.product?.avgCostPrice ?? 0) : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{item.allowNegative ? 'Yes' : 'No'}</td>

                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(item.totalStock ?? 0) <= (item.reorderLevel ?? 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item?.totalStock ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button onClick={() => navigate(`/products/${item.id}/edit`)} className="text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
                            <button onClick={() => setConfirm({ id: item.id })} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>

      <ConfirmDialog open={!!confirm} title="Delete Product"
        message="This will permanently delete the product and all its variants." variant="danger"
        confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />
    </div>
  );
}


