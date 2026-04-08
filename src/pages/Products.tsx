import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Loader2, Package, Upload, Eye, X, History } from 'lucide-react';
import { Pagination } from '../components/ui/Pagination';
import { productService, categoryService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Product, Category } from '../types/pos';

const fmt = (n: number | null | undefined) =>
  n != null ? `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}` : '—';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

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

// ─── Product Detail Modal ────────────────────────────────────────────────────
function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{product.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Product Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Category</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.category?.name ?? '—'}</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Brand</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.brand?.name ?? '—'}</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Avg Cost</span><p className="font-medium text-gray-900 dark:text-gray-100">{fmt(product.avgCostPrice)}</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Stock</span>
              <p><span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(product.totalStock ?? 0) <= (product.reorderLevel ?? 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{product.totalStock ?? 0}</span></p>
            </div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Reorder Level</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.reorderLevel}</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Tax Method</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.taxMethod ?? 'EXCLUSIVE'}</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">Tax Rate</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.taxRate ?? 0}%</p></div>
            <div><span className="text-gray-500 dark:text-gray-400 text-xs">HS Code</span><p className="font-medium text-gray-900 dark:text-gray-100">{product.hsCode ?? '—'}</p></div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2">
            {product.active && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Active</span>}
            {!product.active && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Inactive</span>}
            {product.allowNegative && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Allow Negative</span>}
            {product.isService && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Service</span>}
            {product.isFavorite && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Favorite</span>}
            {product.saleBelowCost && <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Sale Below Cost</span>}
          </div>

          {/* Variants Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Variants &amp; Pricing</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-2 text-left">Variant</th>
                    <th className="px-3 py-2 text-left">Barcode</th>
                    <th className="px-3 py-2 text-center">Factor</th>
                    <th className="px-3 py-2 text-right">Sale Price</th>
                    <th className="px-3 py-2 text-right">Retail</th>
                    <th className="px-3 py-2 text-right">Wholesale</th>
                  </tr>
                </thead>
                <tbody>
                  {(product.variants ?? []).map(v => (
                    <tr key={v.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-1.5 font-medium text-gray-900 dark:text-gray-100">
                        {v.name}{v.isDefault && <span className="ml-1 text-[10px] text-primary-600 font-normal">(default)</span>}
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">{v.barcode}</td>
                      <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">×{v.factor}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(v.price)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{fmt(v.retail)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{fmt(v.wholesale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Product History Modal (Last 20 Sales & Purchases) ───────────────────────
function ProductHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [tab, setTab] = useState<'sales' | 'purchases'>('sales');
  const [history, setHistory] = useState<{ recentSales: any[]; recentPurchases: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    productService.getHistory(product.id)
      .then(h => setHistory(h))
      .catch(() => setHistory({ recentSales: [], recentPurchases: [] }))
      .finally(() => setLoading(false));
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transaction History — {product.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-sm w-fit">
            <button onClick={() => setTab('sales')}
              className={`px-4 py-1.5 rounded-md transition ${tab === 'sales' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              Sales ({history?.recentSales?.length ?? 0})
            </button>
            <button onClick={() => setTab('purchases')}
              className={`px-4 py-1.5 rounded-md transition ${tab === 'purchases' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
              Purchases ({history?.recentPurchases?.length ?? 0})
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={18} className="text-primary-600 animate-spin" /></div>
          ) : tab === 'sales' ? (
            (history?.recentSales?.length ?? 0) === 0
              ? <p className="text-sm text-gray-400 py-8 text-center">No recent sales found</p>
              : <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2 text-left">Sale #</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Customer</th>
                      <th className="px-3 py-2 text-left">Variant</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history!.recentSales.map((si: any) => (
                      <tr key={si.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">#{si.sale?.id}</td>
                        <td className="px-3 py-1.5 text-gray-500">{si.sale?.createdAt ? fmtDate(si.sale.createdAt) : '—'}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{si.sale?.customer?.name ?? 'Walk-in'}</td>
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{si.variant?.name ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{si.quantity}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{fmt(si.unitPrice)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(si.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : (
            (history?.recentPurchases?.length ?? 0) === 0
              ? <p className="text-sm text-gray-400 py-8 text-center">No recent purchases found</p>
              : <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                      <th className="px-3 py-2 text-left">Purchase #</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Supplier</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history!.recentPurchases.map((pi: any) => (
                      <tr key={pi.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">#{pi.purchase?.id}</td>
                        <td className="px-3 py-1.5 text-gray-500">{pi.purchase?.createdAt ? fmtDate(pi.purchase.createdAt) : '—'}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{pi.purchase?.supplier?.name ?? '—'}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">{pi.quantity}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500">{fmt(pi.unitCost)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(pi.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>
      </div>
    </div>
  );
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: { categories: number; brands: number; products: number; variants: number }; skipped: { categories: number; brands: number; products: number; variants: number }; errors: string[] } | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await productService.importFile(file);
      setImportResult(result);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg disabled:opacity-50">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Import JSON
          </button>
          <button onClick={() => navigate('/products/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
            <Plus size={14} /> Add Product
          </button>
        </div>
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
                    <th className="px-4 py-2">Variants (Factor × Price)</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                    <th className="px-4 py-2 text-right">Stock</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const defVariant = item.variants?.find(v => v.isDefault) ?? item.variants?.[0];
                    return (
                      <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 align-top">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                          {defVariant?.barcode && <p className="text-xs text-gray-400">{defVariant.barcode}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{item.category?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{item.brand?.name ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {(item.variants ?? []).length > 0 ? (
                            <div className="space-y-0.5">
                              {item.variants!.map(v => (
                                <div key={v.id} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-gray-600 dark:text-gray-400 min-w-[60px]">{v.name}</span>
                                  <span className="text-gray-400">×{v.factor}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-medium">{fmt(v.price)}</span>
                                  {v.retail != null && v.retail !== v.price && <span className="text-gray-400">R:{fmt(v.retail)}</span>}
                                  {v.wholesale != null && v.wholesale !== v.price && <span className="text-gray-400">W:{fmt(v.wholesale)}</span>}
                                </div>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{fmt(item.avgCostPrice)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(item.totalStock ?? 0) <= (item.reorderLevel ?? 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item?.totalStock ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5">
                            <button onClick={() => setViewProduct(item)} title="View details" className="text-gray-400 hover:text-blue-600"><Eye size={14} /></button>
                            <button onClick={() => setHistoryProduct(item)} title="Transaction history" className="text-gray-400 hover:text-amber-600"><History size={14} /></button>
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

      {viewProduct && <ProductDetailModal product={viewProduct} onClose={() => setViewProduct(null)} />}
      {historyProduct && <ProductHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import Results</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Imported</p>
                <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-gray-400">
                  <li>Categories: <span className="font-medium text-green-600">{importResult.imported.categories}</span></li>
                  <li>Brands: <span className="font-medium text-green-600">{importResult.imported.brands}</span></li>
                  <li>Products: <span className="font-medium text-green-600">{importResult.imported.products}</span></li>
                  <li>Variants: <span className="font-medium text-green-600">{importResult.imported.variants}</span></li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Skipped</p>
                <ul className="mt-1 space-y-0.5 text-gray-600 dark:text-gray-400">
                  <li>Categories: <span className="font-medium text-yellow-600">{importResult.skipped.categories}</span></li>
                  <li>Brands: <span className="font-medium text-yellow-600">{importResult.skipped.brands}</span></li>
                  <li>Products: <span className="font-medium text-yellow-600">{importResult.skipped.products}</span></li>
                  <li>Variants: <span className="font-medium text-yellow-600">{importResult.skipped.variants}</span></li>
                </ul>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-600">Errors ({importResult.errors.length})</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-500 space-y-0.5">
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <button onClick={() => setImportResult(null)}
              className="w-full px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


