import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Package, ChevronDown, ChevronRight as ChevRight } from 'lucide-react';
import { productService, categoryService, brandService } from '../services/pos.service';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Product, Category, Brand, ProductVariant } from '../types/pos';

const fmt = (n: number | null | undefined) =>
  n != null ? `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}` : '—';

// ─── Category helpers ────────────────────────────────────────────────────────
function extractCats(r: unknown): Category[] {
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object' && Array.isArray((r as { data?: unknown }).data))
    return (r as { data: Category[] }).data;
  return [];
}
function flattenCats(cats: Category[]): Category[] {
  return cats.flatMap(c => [c, ...flattenCats(c.subcategories ?? [])]);
}
function renderCatOptions(cats: Category[], depth = 0): ReactNode[] {
  return cats.flatMap(c => [
    <option key={c.id} value={c.id}>{'\u00A0'.repeat(depth * 4)}{depth > 0 ? '└ ' : ''}{c.name}</option>,
    ...renderCatOptions(c.subcategories ?? [], depth + 1),
  ]);
}

// ─── Category Tree Select ────────────────────────────────────────────────────
function CategoryTreeSelect({ roots, value, onChange }: {
  roots: Category[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const allFlat = useMemo(() => flattenCats(roots), [roots]);
  const selected = allFlat.find(c => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleCollapse = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const renderNodes = (cats: Category[], depth = 0): ReactNode[] =>
    cats.flatMap(cat => {
      const subs = cat.subcategories ?? [];
      const isCollapsed = collapsed.has(cat.id);
      const isSelected = value === cat.id;
      return [
        <div key={cat.id}
          className={`flex items-center gap-1 py-1.5 pr-2 cursor-pointer rounded text-sm ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          style={{ paddingLeft: 8 + depth * 16 }}
          onClick={() => { onChange(cat.id); setOpen(false); }}>
          {subs.length > 0 ? (
            <span onClick={(e) => toggleCollapse(cat.id, e)} className="text-gray-400 hover:text-gray-600 shrink-0">
              {isCollapsed ? <ChevRight size={13} /> : <ChevronDown size={13} />}
            </span>
          ) : <span className="w-3.5 shrink-0" />}
          <span>{cat.name}</span>
        </div>,
        ...(!isCollapsed && subs.length > 0 ? renderNodes(subs, depth + 1) : []),
      ];
    });

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-left outline-none focus:ring-2 focus:ring-primary-500">
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
          {selected?.name ?? 'Select category...'}
        </span>
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1">
          <div className="flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            onClick={() => { onChange(undefined); setOpen(false); }}>
            <span className="w-3.5 shrink-0" />None
          </div>
          {renderNodes(roots)}
        </div>
      )}
    </div>
  );
}

// ─── Variant types ───────────────────────────────────────────────────────────
interface VariantDraft {
  name: string;
  barcode: string;
  price: number;
  purchasePrice: number;
  wholesalePrice: number | '';
  factor: number;
  isDefault: boolean;
}
const emptyVariant = (isDefault = false): VariantDraft =>
  ({ name: isDefault ? 'unit' : '', barcode: '', price: 0, purchasePrice: 0, wholesalePrice: '', factor: 1, isDefault });

function VariantFormFields({ v, onChange, label }: {
  v: VariantDraft;
  onChange: (k: keyof VariantDraft, val: unknown) => void;
  label?: string;
}) {
  const inp = 'w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Variant Name *</label>
          <input value={v.name} onChange={e => onChange('name', e.target.value)} className={inp} placeholder="e.g. Default, 1kg…" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Barcode *</label>
          <input value={v.barcode} onChange={e => onChange('barcode', e.target.value)} className={inp} placeholder="Unique barcode" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Sale Price *</label>
          <input type="number" value={v.price} min={0} step="0.01" onChange={e => onChange('price', Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Cost Price *</label>
          <input type="number" value={v.purchasePrice} min={0} step="0.01" onChange={e => onChange('purchasePrice', Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Wholesale Price</label>
          <input type="number" value={v.wholesalePrice === '' ? '' : v.wholesalePrice} min={0} step="0.01"
            onChange={e => onChange('wholesalePrice', e.target.value === '' ? '' : Number(e.target.value))} className={inp} placeholder="Optional" />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Factor</label>
          <input type="number" value={v.factor} min={1} step="1" onChange={e => onChange('factor', Number(e.target.value))} className={inp} />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filterCatId, setFilterCatId] = useState('');
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: Product } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number } | null>(null);
  const [catRoots, setCatRoots] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  // Variant states
  const [defaultVariant, setDefaultVariant] = useState<VariantDraft>(emptyVariant(true));
  const [variantEdit, setVariantEdit] = useState<{ id: number | 'new'; form: VariantDraft } | null>(null);
  const [variantSaving, setVariantSaving] = useState(false);
  const [variantConfirm, setVariantConfirm] = useState<{ variantId: number; productId: number } | null>(null);

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
    brandService.list({ pageSize: 200 }).then(r => setBrands(Array.isArray(r?.data) ? r.data : [])).catch(() => { });
  }, []);

  const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));
  const dvf = (k: keyof VariantDraft, val: unknown) => setDefaultVariant(p => ({ ...p, [k]: val }));
  const vef = (k: keyof VariantDraft, val: unknown) =>
    setVariantEdit(e => e ? { ...e, form: { ...e.form, [k]: val } } : null);

  const openEdit = (item: Product) => {
    setForm({ ...item });
    setVariantEdit(null);
    setModal({ mode: 'edit', item });
  };

  const openAdd = () => {
    setForm({});
    setDefaultVariant(emptyVariant(true));
    setModal({ mode: 'add' });
  };

  const saveProduct = async () => {
    setSaving(true);
    try {
      if (modal?.mode === 'edit' && modal.item) {
        await productService.update(modal.item.id, form);
      } else {
        const dv = defaultVariant;
        await productService.create({
          ...form,
          variants: [{
            name: dv.name || 'unit',
            barcode: dv.barcode,
            price: dv.price,
            purchasePrice: dv.purchasePrice,
            ...(dv.wholesalePrice !== '' ? { wholesalePrice: dv.wholesalePrice } : {}),
            factor: dv.factor,
            isDefault: true,
          }],
        });
      }
      setModal(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm) return;
    try { await productService.delete(confirm.id); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirm(null); }
  };

  const saveVariant = async () => {
    if (!variantEdit || !modal?.item) return;
    setVariantSaving(true);
    try {
      const vf = variantEdit.form;
      const payload = {
        name: vf.name,
        barcode: vf.barcode,
        price: vf.price,
        purchasePrice: vf.purchasePrice,
        ...(vf.wholesalePrice !== '' ? { wholesalePrice: vf.wholesalePrice } : {}),
        factor: vf.factor,
        isDefault: vf.isDefault,
      };
      if (variantEdit.id === 'new') {
        await productService.createVariant(modal.item.id, payload);
      } else {
        await productService.updateVariant(modal.item.id, variantEdit.id, payload);
      }
      const updated = await productService.get(modal.item.id);
      setModal(m => m ? { ...m, item: updated } : null);
      setVariantEdit(null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setVariantSaving(false); }
  };

  const deleteVariant = async () => {
    if (!variantConfirm) return;
    try {
      await productService.deleteVariant(variantConfirm.productId, variantConfirm.variantId);
      const updated = await productService.get(variantConfirm.productId);
      setModal(m => m ? { ...m, item: updated } : null);
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
    finally { setVariantConfirm(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const dv = defaultVariant;
  const addDisabled = saving || !form.name || !form.categoryId ||
    (modal?.mode !== 'edit' && (!dv.barcode || dv.price <= 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
        <button onClick={openAdd}
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
                        <td className="px-4 py-2.5 text-right">{variant ? fmt(variant.salePrice ?? variant.price ?? 0) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{variant ? fmt(variant.costPrice ?? variant.purchasePrice ?? 0) : '—'}</td>
                        <td className="px-4 py-2.5 text-right">{item.allowNegative ? 'Yes' : 'No'}</td>

                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(item.totalStock ?? 0) <= (item.reorderLevel ?? 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item?.totalStock ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-primary-600"><Pencil size={14} /></button>
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
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} products</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span className="text-gray-700 dark:text-gray-300">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Product Modal ── */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Edit Product' : 'Add Product'} size="2xl">
        <div className="space-y-4">
          {/* Product fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Product Name *</label>
              <input value={form.name ?? ''} onChange={e => f('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Category *</label>
              <CategoryTreeSelect roots={catRoots} value={form.categoryId} onChange={v => f('categoryId', v)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Brand</label>
              <select value={form.brandId ?? ''} onChange={e => f('brandId', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none">
                <option value="">None</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Reorder Level</label>
              <input type="number" value={form.reorderLevel ?? 0} min={0}
                onChange={e => f('reorderLevel', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">HS Code (FBR)</label>
              <input value={form.hsCode ?? ''} onChange={e => f('hsCode', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Tax Rate %</label>
              <input type="number" value={form.taxRate ?? 0} min={0} max={100} step="0.01"
                onChange={e => f('taxRate', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Description</label>
              <textarea value={form.description ?? ''} onChange={e => f('description', e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          {/* ── Variants section ── */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {modal?.mode === 'add' ? (
              /* ADD mode: single default variant */
              <VariantFormFields v={defaultVariant} onChange={dvf} label="Default Variant" />
            ) : (
              /* EDIT mode: list existing + add new */
              (() => {
                const variants: ProductVariant[] = modal?.item?.variants ?? [];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Variants</p>
                      {variantEdit?.id !== 'new' && (
                        <button onClick={() => setVariantEdit({ id: 'new', form: emptyVariant(variants.length === 0) })}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                          <Plus size={12} /> Add Variant
                        </button>
                      )}
                    </div>

                    {variants.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500">
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Barcode</th>
                              <th className="px-3 py-2 text-right">Sale Price</th>
                              <th className="px-3 py-2 text-right">Cost</th>
                              <th className="px-3 py-2 text-center">Default</th>
                              <th className="px-3 py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {variants.map(v => (
                              variantEdit?.id === v.id ? (
                                /* Inline edit row */
                                <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700">
                                  <td colSpan={7} className="p-3">
                                    <VariantFormFields v={variantEdit.form} onChange={vef} />
                                    <div className="flex items-center gap-2 mt-3 justify-end">
                                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                        <input type="checkbox" checked={variantEdit.form.isDefault}
                                          onChange={e => vef('isDefault', e.target.checked)}
                                          className="accent-primary-600" />
                                        Default variant
                                      </label>
                                      <button onClick={() => setVariantEdit(null)} className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50">Cancel</button>
                                      <button onClick={saveVariant} disabled={variantSaving || !variantEdit.form.barcode}
                                        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                                        {variantSaving && <Loader2 size={10} className="animate-spin" />} Save
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                  <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{v.name}</td>
                                  <td className="px-3 py-2 text-gray-500 font-mono">{v.barcode}</td>
                                  <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{fmt(v.salePrice ?? v.price)}</td>
                                  <td className="px-3 py-2 text-right text-gray-500">{fmt(v.costPrice ?? v.purchasePrice)}</td>
                                  <td className="px-3 py-2 text-center">{v.isDefault && <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">Default</span>}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1.5 justify-end">
                                      <button onClick={() => setVariantEdit({ id: v.id, form: { name: v.name, barcode: v.barcode, price: v.salePrice ?? v.price, purchasePrice: v.costPrice ?? v.purchasePrice, wholesalePrice: v.wholesalePrice ?? '', factor: v.factor, isDefault: v.isDefault } })}
                                        className="text-gray-400 hover:text-primary-600"><Pencil size={13} /></button>
                                      <button onClick={() => setVariantConfirm({ variantId: v.id, productId: modal!.item!.id })}
                                        className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* New variant add form */}
                    {variantEdit?.id === 'new' && (
                      <div className="border border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-3 space-y-3">
                        <VariantFormFields v={variantEdit.form} onChange={vef} label="New Variant" />
                        <div className="flex items-center gap-2 justify-between">
                          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={variantEdit.form.isDefault}
                              onChange={e => vef('isDefault', e.target.checked)}
                              className="accent-primary-600" />
                            Set as default
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => setVariantEdit(null)} className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50">Cancel</button>
                            <button onClick={saveVariant} disabled={variantSaving || !variantEdit.form.barcode || variantEdit.form.price <= 0}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                              {variantSaving && <Loader2 size={10} className="animate-spin" />} Add Variant
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setModal(null)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button onClick={saveProduct} disabled={addDisabled}
              className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {modal?.mode === 'edit' ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} title="Delete Product"
        message="This will permanently delete the product and all its variants." variant="danger"
        confirmLabel="Delete" onConfirm={del} onCancel={() => setConfirm(null)} />

      <ConfirmDialog open={!!variantConfirm} title="Delete Variant"
        message="This will permanently delete this variant." variant="danger"
        confirmLabel="Delete" onConfirm={deleteVariant} onCancel={() => setVariantConfirm(null)} />
    </div>
  );
}


