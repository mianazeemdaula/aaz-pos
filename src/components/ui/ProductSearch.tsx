import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Check } from 'lucide-react';
import { productService, categoryService, brandService } from '../../services/pos.service';
import type { Product, ProductVariant, Category, Brand } from '../../types/pos';

const _fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ProductSearchProps {
  onSelect: (variant: ProductVariant) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductSearch({
  onSelect,
  placeholder = 'Search product or scan barcode...',
  autoFocus,
  className,
  inputRef: externalRef,
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Held in a ref so `search` stays referentially stable. Callers pass an inline
  // arrow or a plain function, so `onSelect` is a new value on every parent
  // render; depending on it directly re-armed the debounce and fired a
  // redundant search each time the parent re-rendered.
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const search = useCallback(async (q: string) => {
    // Cancel whatever is still in flight: without this a slow response for an
    // earlier, broader query ("ri") could land after the newer one ("rice")
    // and overwrite the dropdown with stale results.
    abortRef.current?.abort();
    if (!q.trim()) { setResults([]); setOpen(false); return; }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    try {
      const looksScannable = /^\S+$/.test(q) && q.length >= 4;

      // Barcode probe and text search run together rather than in sequence.
      // Serialising them charged every ordinary word search the full cost of a
      // failed barcode lookup before the text query even started.
      const barcodePromise = looksScannable
        ? productService.getVariantByBarcode(q, signal).catch(() => null)
        : Promise.resolve(null);
      const listPromise = productService.list({ q, pageSize: 20 }, signal);

      const variant = await barcodePromise;
      if (signal.aborted) return;
      if (variant) {
        // An exact barcode hit is a scan: add it and clear, ignoring the list.
        listPromise.catch(() => { /* superseded by the scan */ });
        controller.abort();
        onSelectRef.current(variant);
        setQuery('');
        setOpen(false);
        return;
      }

      const resp = await listPromise;
      if (signal.aborted) return;
      setResults(resp.data);
      setOpen(resp.data.length > 0);
    } catch {
      if (!signal.aborted) setResults([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  // Drop any in-flight request when the box goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, inputRef]);

  const handleSelect = (v: ProductVariant) => {
    onSelect(v);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map(p => (
            <div key={p.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 px-3 py-2">
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1.5">{p.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {(p.variants ?? []).map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleSelect({ ...v, product: p })}
                    className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-700 dark:text-gray-300 hover:text-primary-600 border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <span>{v.name}</span>
                    <span className="text-gray-400 mx-1">×</span>
                    <span>{v.factor}</span>
                    <span className="text-gray-400 mx-1">=</span>
                    <span className="font-semibold text-primary-600">
                      {_fmt(v.price * v.factor)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <p className="px-3 py-2 text-sm text-gray-500">No products found</p>
          )}
        </div>
      )}
    </div>
  );
}


// ── Full Product Search Modal (F5) ────────────────────────────────────────
interface ProductSearchModalProps {
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

const HOLD_KEY = 'pos_product_search_hold';

export function ProductSearchModal({ onSelect, onClose }: ProductSearchModalProps) {
  const [query, setQuery] = useState('');
  /** Hold keeps the modal open after adding, for building a basket in one visit. */
  const [hold, setHold] = useState(() => localStorage.getItem(HOLD_KEY) === 'true');
  const [added, setAdded] = useState<{ count: number; last: string }>({ count: 0, last: '' });
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    categoryService.list({ pageSize: 200 }).then(r => setCategories(r.data)).catch(() => { });
    brandService.list({ pageSize: 200 }).then(r => setBrands(r.data)).catch(() => { });
  }, []);

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current ?? undefined);
    // One controller per scheduled search. Cancelling the previous request
    // keeps a slow response for an earlier query from replacing the results of
    // a newer one — the modal is driven by fast typing, so overlap is normal.
    const controller = new AbortController();
    const { signal } = controller;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { pageSize: 60 };
        if (query.trim()) params.q = query.trim();
        if (categoryId) params.categoryId = categoryId;
        if (brandId) params.brandId = brandId;
        const resp = await productService.list(params, signal);
        if (signal.aborted) return;
        setResults(resp.data);
        setSelectedIdx(0);
      } catch {
        if (!signal.aborted) setResults([]);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timerRef.current ?? undefined);
      controller.abort();
    };
  }, [query, categoryId, brandId]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => { localStorage.setItem(HOLD_KEY, String(hold)); }, [hold]);

  /**
   * Every add goes through here — keyboard, row click and variant click alike.
   * With hold on, the results stay put and the search text is selected, so the
   * next product can be typed straight over it (or Enter pressed again to add
   * the same one twice).
   */
  const commit = useCallback((variant: ProductVariant, product: Product) => {
    onSelect({ ...variant, product });
    if (!hold) { onClose(); return; }
    setAdded(a => ({ count: a.count + 1, last: `${product.name}${variant.name ? ` (${variant.name})` : ''}` }));
    searchRef.current?.focus();
    searchRef.current?.select();
  }, [hold, onSelect, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      // Ctrl+H toggles hold. preventDefault matters: the browser binds it to history.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setHold(h => !h);
        return;
      }
      if (e.key === 'Enter') {
        if ((e.target as HTMLElement).tagName === 'SELECT') return;
        e.preventDefault();
        const product = results[selectedIdx];
        if (product) {
          const variant = product.variants?.find(v => v.isDefault) ?? product.variants?.[0];
          if (variant) commit(variant, product);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, selectedIdx, commit, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl flex flex-col shadow-2xl" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Search size={16} /> Product Search
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <label
              title="Keep this window open after adding a product (Ctrl+H)"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer select-none transition-colors ${hold
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-700 dark:text-primary-300'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <input
                type="checkbox"
                checked={hold}
                onChange={e => setHold(e.target.checked)}
                className="w-3 h-3 rounded-xs text-primary-600 focus:ring-primary-500"
              />
              <span className="font-semibold">Hold</span>
              <kbd className="font-mono text-[10px] opacity-70">Ctrl+H</kbd>
            </label>
            <span className="hidden sm:flex items-center gap-1 text-gray-400">
              <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-1 rounded-sm">↑↓ Navigate</span>
              <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-1 rounded-sm">Enter Add</span>
              <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-1 rounded-sm">Esc Close</span>
            </span>
            <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        </div>
        <div className="flex gap-2 p-3 border-b border-gray-200 dark:border-gray-700 flex-wrap shrink-0">
          <div className="relative flex-1 min-w-36">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or barcode..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none max-w-40"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={brandId}
            onChange={e => setBrandId(e.target.value ? Number(e.target.value) : '')}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none max-w-32"
          >
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Search size={28} className="mb-2 opacity-40" />
              <p className="text-sm">{query || categoryId || brandId ? 'No products found' : 'Start typing to search products'}</p>
            </div>
          )}
          {!loading && results.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300 w-8">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Product</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300 w-36">Category</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300 w-36">Brand</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-300">Variants &amp; Price</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-300 w-16">Stock</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <tr
                      key={p.id}
                      data-selected={isSelected}
                      onClick={() => {
                        const variant = p.variants?.find(v => v.isDefault) ?? p.variants?.[0];
                        if (variant) commit(variant, p);
                      }}
                      className={`border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors cursor-pointer ${isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      {/* Row number with selection indicator */}
                      <td className={`px-3 py-2.5 text-xs text-gray-400 ${isSelected ? 'border-l-[3px] border-l-primary-500' : ''}`}>
                        {idx + 1}
                      </td>

                      {/* Product name */}
                      <td className="px-4 py-2.5 align-top">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                      </td>

                      <td className="px-4 py-2.5 align-top text-xs text-gray-500 dark:text-gray-400">
                        {p.category?.name && <p>{p.category.name}</p>}
                      </td>
                      <td className="px-4 py-2.5 align-top text-xs text-gray-500 dark:text-gray-400">
                        {p.brand?.name && <p className="text-gray-400 mt-0.5">{p.brand.name}</p>}
                      </td>

                      {/* All variants: name × factor = price */}
                      <td className="px-4 py-2.5 align-top">
                        <div className="flex flex-col gap-0.5">
                          {(p.variants ?? []).map(v => (
                            <button
                              key={v.id}
                              onClick={e => { e.stopPropagation(); commit(v, p); }}
                              className="text-left text-xs group w-fit"
                            >
                              <span className="text-gray-600 dark:text-gray-400 group-hover:text-primary-500 transition-colors">
                                {v.barcode} ({v.name})
                              </span>
                              <span className="text-gray-400 mx-1">×</span>
                              <span className="text-gray-500 dark:text-gray-400">{v.factor}</span>
                              <span className="text-gray-400 mx-1">=</span>
                              <span className="font-semibold text-primary-600 group-hover:text-primary-700">
                                {_fmt(v.price)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        {p.totalStock}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 shrink-0">
          <span>{results.length} product{results.length !== 1 ? 's' : ''} found</span>
          {added.count > 0 && (
            <span className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 min-w-0">
              <Check size={12} className="shrink-0" />
              <span className="font-semibold">{added.count} added</span>
              <span className="truncate text-gray-400">· last: {added.last}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
