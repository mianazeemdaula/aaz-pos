import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, X, Package, Save } from 'lucide-react';
import { promotionService, productService } from '../services/pos.service';
import type { Promotion, Product, ProductVariant } from '../types/pos';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';
const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4';
const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PromotionItems() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const promoId = Number(id);

    const [promotion, setPromotion] = useState<Promotion | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productLoading, setProductLoading] = useState(false);

    useEffect(() => {
        promotionService.get(promoId).then(promo => {
            setPromotion(promo);
            setSelectedVariantIds(promo.promotionItems?.map(pi => pi.variantId) ?? []);
        }).catch(() => navigate('/promotions'))
            .finally(() => setLoading(false));
    }, [promoId, navigate]);

    const searchProducts = useCallback(async (q: string) => {
        setProductLoading(true);
        try {
            const r = await productService.list({ q, pageSize: 50 });
            setProducts(r.data ?? []);
        } catch { setProducts([]); }
        finally { setProductLoading(false); }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(productSearch), 300);
        return () => clearTimeout(timer);
    }, [productSearch, searchProducts]);

    const toggleVariant = (variantId: number) => {
        setSelectedVariantIds(prev =>
            prev.includes(variantId) ? prev.filter(id => id !== variantId) : [...prev, variantId]
        );
    };

    const toggleAllProductVariants = (product: Product) => {
        const vIds = (product.variants ?? []).map(v => v.id);
        const allSelected = vIds.every(id => selectedVariantIds.includes(id));
        if (allSelected) {
            setSelectedVariantIds(prev => prev.filter(id => !vIds.includes(id)));
        } else {
            setSelectedVariantIds(prev => [...new Set([...prev, ...vIds])]);
        }
    };

    const removeVariant = (variantId: number) => {
        setSelectedVariantIds(prev => prev.filter(id => id !== variantId));
    };

    const selectedVariantDetails = useMemo(() => {
        const map = new Map<number, { variant: ProductVariant; productName: string }>();
        for (const p of products) {
            for (const v of p.variants ?? []) {
                if (selectedVariantIds.includes(v.id)) {
                    map.set(v.id, { variant: v, productName: p.name });
                }
            }
        }
        if (promotion?.promotionItems) {
            for (const pi of promotion.promotionItems) {
                if (pi.variant && selectedVariantIds.includes(pi.variantId) && !map.has(pi.variantId)) {
                    map.set(pi.variantId, {
                        variant: pi.variant,
                        productName: pi.variant.product?.name ?? `Product #${pi.variant.productId}`,
                    });
                }
            }
        }
        return map;
    }, [products, selectedVariantIds, promotion]);

    const save = async () => {
        if (!promotion) return;
        setSaving(true);
        try {
            await promotionService.update(promoId, { variantIds: selectedVariantIds });
            navigate('/promotions');
        } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
        finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={24} className="text-primary-600 animate-spin" />
            </div>
        );
    }

    if (!promotion) return null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/promotions')}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Add Items to Offer
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {promotion.name} &bull;
                            {promotion.discountType === 'PERCENTAGE' ? ` ${promotion.discountValue}% off` : ` Rs ${promotion.discountValue} off`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/promotions')}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={save} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Items
                    </button>
                </div>
            </div>

            {/* Selected Items */}
            {selectedVariantIds.length > 0 && (
                <div className={card}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Selected Items ({selectedVariantIds.length})
                        </h2>
                        <button onClick={() => setSelectedVariantIds([])} className="text-xs text-red-500 hover:text-red-600">
                            Clear all
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {selectedVariantIds.map(vid => {
                            const detail = selectedVariantDetails.get(vid);
                            return (
                                <span key={vid} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs">
                                    {detail ? `${detail.productName} — ${detail.variant.name}` : `Variant #${vid}`}
                                    <button onClick={() => removeVariant(vid)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Product Search & Selection */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Search Products</h2>
                <p className="text-xs text-gray-400 mb-3">Select which product variants this offer applies to. Leave empty for all products.</p>

                <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                        placeholder="Search products by name or barcode..."
                        className={`${inp} pl-9`} />
                </div>

                <div className="max-h-[50vh] overflow-y-auto space-y-1 rounded-lg border border-gray-100 dark:border-gray-700">
                    {productLoading ? (
                        <div className="flex justify-center py-6"><Loader2 size={16} className="text-primary-600 animate-spin" /></div>
                    ) : products.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">
                            {productSearch ? 'No products found' : 'Search to find products'}
                        </p>
                    ) : (
                        products.map(product => {
                            const variants = product.variants ?? [];
                            const allSelected = variants.length > 0 && variants.every(v => selectedVariantIds.includes(v.id));
                            const someSelected = variants.some(v => selectedVariantIds.includes(v.id));
                            return (
                                <div key={product.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                                        onClick={() => toggleAllProductVariants(product)}>
                                        <input type="checkbox" readOnly
                                            checked={allSelected}
                                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                            className="rounded border-gray-300 text-primary-600 accent-primary-600 pointer-events-none" />
                                        <Package size={14} className="text-gray-400 shrink-0" />
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{product.name}</span>
                                        <span className="text-[10px] text-gray-400">{variants.length} variant{variants.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {variants.length > 0 && (
                                        <div className="pl-10 pr-3 pb-2 space-y-0.5">
                                            {variants.map(v => (
                                                <label key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700/20 cursor-pointer text-xs">
                                                    <input type="checkbox" checked={selectedVariantIds.includes(v.id)}
                                                        onChange={() => toggleVariant(v.id)}
                                                        className="rounded border-gray-300 text-primary-600 accent-primary-600" />
                                                    <span className="text-gray-600 dark:text-gray-400">{v.name}</span>
                                                    <span className="text-gray-400 font-mono">{v.barcode}</span>
                                                    <span className="text-gray-400 ml-auto">{fmt(v.price)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">{selectedVariantIds.length} variant{selectedVariantIds.length !== 1 ? 's' : ''} selected</p>
            </div>
        </div>
    );
}
