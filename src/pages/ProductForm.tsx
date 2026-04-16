import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Save, X, Upload } from 'lucide-react';
import { productService, categoryService, brandService, taxScheduleService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { QuickCategoryAdd } from '../components/ui/QuickCategoryAdd';
import { QuickBrandAdd } from '../components/ui/QuickBrandAdd';
import { API_CONFIG } from '../config/api';
import type { Product, Category, Brand, ProductVariant, TaxSchedule } from '../types/pos';

// ─── helpers ─────────────────────────────────────────────────────────────────
const serverOrigin = API_CONFIG.baseURL.replace(/\/api\/?$/, '');

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const r = await productService.uploadImage(file);
            onChange(r.imageUrl);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const imgSrc = value ? (value.startsWith('http') ? value : `${serverOrigin}${value}`) : '';

    return (
        <div className="flex items-center gap-3">
            {imgSrc ? (
                <div className="relative w-16 h-16 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0">
                    <img src={imgSrc} alt="Product" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => onChange('')}
                        className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg">
                        <X size={10} />
                    </button>
                </div>
            ) : null}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : value ? 'Change Image' : 'Select Image'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleFile(file); e.target.value = ''; }} />
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
    n != null ? `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

function extractCats(r: unknown): Category[] {
    if (Array.isArray(r)) return r;
    if (r && typeof r === 'object' && Array.isArray((r as { data?: unknown }).data))
        return (r as { data: Category[] }).data;
    return [];
}

function renderCatOptions(cats: Category[], depth = 0): ReactNode[] {
    return cats.flatMap(c => {
        const subs = c.subcategories ?? [];
        if (subs.length > 0) {
            return [
                <optgroup key={`g-${c.id}`} label={'\u00A0'.repeat(depth * 2) + c.name}>
                    <option key={c.id} value={c.id}>{'\u00A0'.repeat(depth * 2) + c.name}</option>
                    {...renderCatOptions(subs, depth + 1)}
                </optgroup>,
            ];
        }
        return [<option key={c.id} value={c.id}>{'\u00A0'.repeat(depth * 2) + c.name}</option>];
    });
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform mt-0.5 ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
        </label>
    );
}

// ─── CSS constants ───────────────────────────────────────────────────────────
const inp = 'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';
const lbl = 'text-xs font-medium text-gray-600 dark:text-gray-400 block mb-0.5';
const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3';

// ─── Variant types ───────────────────────────────────────────────────────────
interface VariantDraft {
    _key: number;
    id?: number;
    name: string;
    barcode: string;
    price: number;
    retail: number | '';
    wholesale: number | '';
    factor: number;
    isDefault: boolean;
}

let _vKey = 0;
const nextKey = () => ++_vKey;

const emptyVariant = (isDefault = false): VariantDraft => ({
    _key: nextKey(), name: isDefault ? 'unit' : '', barcode: '', price: 0,
    retail: '', wholesale: '', factor: 1, isDefault,
});

const variantFromExisting = (v: ProductVariant): VariantDraft => ({
    _key: nextKey(), id: v.id, name: v.name, barcode: v.barcode,
    price: v.price ?? v.price,
    retail: v.retail ?? '', wholesale: v.wholesale ?? '',
    factor: v.factor, isDefault: v.isDefault,
});

// ─── Strip leading zeros on blur ─────────────────────────────────────────────
const stripLeadingZeros = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && val !== '0' && /^0+\d/.test(val)) {
        e.target.value = String(Number(val));
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

// ─── Variant Fields Row ──────────────────────────────────────────────────────
function VariantFields({ v, onChange, showRemove, onRemove, lockNameFactor }: {
    v: VariantDraft;
    onChange: (field: keyof VariantDraft, val: unknown) => void;
    showRemove?: boolean;
    onRemove?: () => void;
    lockNameFactor?: boolean;
}) {
    const wholesaleErr = v.wholesale !== '' && v.price > 0 && Number(v.wholesale) > v.price;
    const retailErr = v.retail !== '' && v.price > 0 && Number(v.retail) > v.price;
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {v.isDefault && (
                        <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">
                            Default
                        </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Factor: {v.factor}x
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {!v.isDefault && (
                        <button type="button" onClick={() => onChange('isDefault', true)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                            Set Default
                        </button>
                    )}
                    {showRemove && (
                        <button type="button" onClick={onRemove}
                            className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">


                <div>
                    <label className={lbl}>Barcode *</label>
                    <input value={v.barcode} onChange={e => onChange('barcode', e.target.value)} className={inp} placeholder="Unique barcode" />
                </div>
                <div>
                    <label className={lbl}>Variant Name *</label>
                    <input value={v.name} onChange={e => onChange('name', e.target.value)} className={`${inp} ${lockNameFactor ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`} placeholder="e.g. Unit, Dozen" readOnly={lockNameFactor} />
                </div>
                <div>
                    <label className={lbl}>Factor</label>
                    <input type="number" value={v.factor} min={1} step="1" onChange={e => onChange('factor', Number(e.target.value) || 1)} onBlur={stripLeadingZeros} className={`${inp} ${lockNameFactor ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''}`} readOnly={lockNameFactor} />
                </div>
                <div>
                    <label className={lbl}>Sale Price *</label>
                    <input type="number" value={v.price} min={0} step="0.01" onChange={e => onChange('price', Number(e.target.value))} onBlur={stripLeadingZeros} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Wholesale Price</label>
                    <input type="number" value={v.wholesale === '' ? '' : v.wholesale} min={0} step="0.01"
                        onChange={e => onChange('wholesale', e.target.value === '' ? '' : Number(e.target.value))} onBlur={stripLeadingZeros} className={`${inp} ${wholesaleErr ? 'border-red-400 ring-1 ring-red-400' : ''}`} placeholder="Optional" />
                    {wholesaleErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                </div>
                <div>
                    <label className={lbl}>Retail Price</label>
                    <input type="number" value={v.retail === '' ? '' : v.retail} min={0} step="0.01"
                        onChange={e => onChange('retail', e.target.value === '' ? '' : Number(e.target.value))} onBlur={stripLeadingZeros} className={`${inp} ${retailErr ? 'border-red-400 ring-1 ring-red-400' : ''}`} placeholder="Optional" />
                    {retailErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── Main Component ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export function ProductForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

    // ── Product form state ──
    const [form, setForm] = useState({
        name: '',
        categoryId: undefined as number | undefined,
        brandId: undefined as number | undefined,
        description: '',
        reorderLevel: 10,
        allowNegative: false,
        imageUrl: '',
        hsCode: '',
        taxMethod: 'INCLUSIVE' as 'EXCLUSIVE' | 'INCLUSIVE',
        taxRate: 0,
        taxSchduleId: undefined as number | undefined,
        active: true,
        isService: false,
        showBarcodePrice: true,
        isFavorite: false,
        saleBelowCost: false,
    });

    // ── Variants for ADD mode ──
    const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant(true)]);

    // ── Product data for EDIT mode ──
    const [product, setProduct] = useState<Product | null>(null);
    const [editingVariant, setEditingVariant] = useState<{ id: number | 'new'; form: VariantDraft } | null>(null);
    const [variantSaving, setVariantSaving] = useState(false);
    const [variantConfirm, setVariantConfirm] = useState<{ variantId: number } | null>(null);

    // ── Reference data ──
    const [catRoots, setCatRoots] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [taxSchedules, setTaxSchedules] = useState<TaxSchedule[]>([]);

    // ── Quick-add dialogs ──
    const [quickAddCat, setQuickAddCat] = useState(false);
    const [quickAddBrand, setQuickAddBrand] = useState(false);

    // ── UI state ──
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    // ── Load categories & brands & tax schedules ──
    useEffect(() => {
        categoryService.list({}).then(r => {
            const cats = extractCats(r);
            setCatRoots(cats.filter(c => !c.parentId));
        }).catch(() => { });
        brandService.list({ pageSize: 200 }).then(r =>
            setBrands(Array.isArray(r?.data) ? r.data : [])
        ).catch(() => { });
        taxScheduleService.list().then(r =>
            setTaxSchedules(Array.isArray(r) ? r : [])
        ).catch(() => { });
    }, []);

    // ── Load product if editing ──
    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        productService.get(Number(id)).then(p => {
            setProduct(p);
            setForm({
                name: p.name || '',
                categoryId: p.categoryId,
                brandId: p.brandId ?? undefined,
                description: p.description || '',
                reorderLevel: p.reorderLevel ?? 10,
                allowNegative: p.allowNegative ?? false,
                imageUrl: p.imageUrl || '',
                hsCode: p.hsCode || '',
                taxMethod: p.taxMethod || 'INCLUSIVE',
                taxRate: p.taxRate ?? 0,
                taxSchduleId: p.taxSchduleId ?? undefined,
                active: p.active ?? true,
                isService: p.isService ?? false,
                showBarcodePrice: p.showBarcodePrice ?? true,
                isFavorite: p.isFavorite ?? false,
                saleBelowCost: p.saleBelowCost ?? false,
            });
        }).catch(() => navigate('/products'))
            .finally(() => setLoading(false));
    }, [id, isEdit, navigate]);

    // ── Form field handler ──
    const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

    // ── Auto-calc: determine base variant ──
    const getBaseVariant = useCallback((): VariantDraft | undefined => {
        if (isEdit && product?.variants?.length) {
            const pv = product.variants.find(v => v.isDefault) || product.variants[0];
            return variantFromExisting(pv);
        }
        return variants.find(v => v.isDefault) || variants[0];
    }, [isEdit, product, variants]);

    const autoCalcPrices = useCallback((factor: number): Partial<VariantDraft> => {
        const base = getBaseVariant();
        if (!base || base.factor === 0) return {};
        const ratio = factor / base.factor;
        return {
            price: Math.round(base.price * ratio * 100) / 100,
            wholesale: base.wholesale !== '' ? Math.round(Number(base.wholesale) * ratio * 100) / 100 : '',
            retail: base.retail !== '' ? Math.round(Number(base.retail) * ratio * 100) / 100 : '',
        };
    }, [getBaseVariant]);

    // ── ADD mode: variant handlers ──
    const updateAddVariant = (key: number, field: keyof VariantDraft, val: unknown) => {
        setVariants(prev => {
            // Handle isDefault toggle
            if (field === 'isDefault' && val === true) {
                return prev.map(v => ({ ...v, isDefault: v._key === key }));
            }

            return prev.map(v => {
                if (v._key !== key) return v;

                // Auto-calc on factor change for non-default variants
                if (field === 'factor' && !v.isDefault) {
                    const newFactor = Number(val) || 1;
                    const base = prev.find(x => x.isDefault) || prev[0];
                    if (base && base.factor > 0) {
                        const ratio = newFactor / base.factor;
                        return {
                            ...v, factor: newFactor,
                            price: Math.round(base.price * ratio * 100) / 100,
                            wholesale: base.wholesale !== '' ? Math.round(Number(base.wholesale) * ratio * 100) / 100 : '',
                            retail: base.retail !== '' ? Math.round(Number(base.retail) * ratio * 100) / 100 : '',
                        };
                    }
                    return { ...v, factor: newFactor };
                }

                return { ...v, [field]: val };
            });
        });
    };

    const addVariant = () => setVariants(prev => [...prev, emptyVariant(false)]);

    const removeVariant = (key: number) => {
        setVariants(prev => {
            if (prev.length <= 1) return prev;
            const remaining = prev.filter(v => v._key !== key);
            if (!remaining.some(v => v.isDefault) && remaining.length > 0) {
                remaining[0] = { ...remaining[0], isDefault: true };
            }
            return remaining;
        });
    };

    // ── EDIT mode: variant handlers ──
    const startEditVariant = (v: ProductVariant) => {
        setEditingVariant({ id: v.id, form: variantFromExisting(v) });
    };

    const startAddVariant = () => {
        const pv = product?.variants ?? [];
        setEditingVariant({ id: 'new', form: emptyVariant(pv.length === 0) });
    };

    const cancelEditVariant = () => setEditingVariant(null);

    const updateEditVariantField = (field: keyof VariantDraft, val: unknown) => {
        setEditingVariant(prev => {
            if (!prev) return prev;
            const v = prev.form;

            if (field === 'factor' && !v.isDefault) {
                const newFactor = Number(val) || 1;
                const calc = autoCalcPrices(newFactor);
                return { ...prev, form: { ...v, factor: newFactor, ...calc } };
            }

            return { ...prev, form: { ...v, [field]: val } };
        });
    };

    const saveEditVariant = async () => {
        if (!editingVariant || !product) return;
        setVariantSaving(true);
        try {
            const vf = editingVariant.form;
            const payload = {
                name: vf.name,
                barcode: vf.barcode,
                price: vf.price,
                ...(vf.retail !== '' ? { retail: vf.retail } : {}),
                ...(vf.wholesale !== '' ? { wholesale: vf.wholesale } : {}),
                factor: vf.factor,
                isDefault: vf.isDefault,
            };
            if (editingVariant.id === 'new') {
                await productService.createVariant(product.id, payload);
            } else {
                await productService.updateVariant(product.id, editingVariant.id, payload);
            }
            const updated = await productService.get(product.id);
            setProduct(updated);
            cancelEditVariant();
        } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error saving variant'); }
        finally { setVariantSaving(false); }
    };

    const deleteVariant = async () => {
        if (!variantConfirm || !product) return;
        try {
            await productService.deleteVariant(product.id, variantConfirm.variantId);
            const updated = await productService.get(product.id);
            setProduct(updated);
        } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error'); }
        finally { setVariantConfirm(null); }
    };

    // ── Save product ──
    const handleSave = async () => {
        if (!form.name || !form.categoryId) return;
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                categoryId: form.categoryId,
                brandId: form.brandId || undefined,
                description: form.description || undefined,
                reorderLevel: form.reorderLevel,
                allowNegative: form.allowNegative,
                imageUrl: form.imageUrl || undefined,
                hsCode: form.hsCode || undefined,
                taxMethod: form.taxMethod,
                taxRate: form.taxRate,
                taxSchduleId: form.taxSchduleId || undefined,
                active: form.active,
                isService: form.isService,
                showBarcodePrice: form.showBarcodePrice,
                isFavorite: form.isFavorite,
                saleBelowCost: form.saleBelowCost,
            };

            if (isEdit) {
                await productService.update(Number(id), payload);
            } else {
                await productService.create({
                    ...payload,
                    variants: variants.map(v => ({
                        name: v.name || 'unit',
                        barcode: v.barcode,
                        price: v.price,
                        ...(v.retail !== '' ? { retail: v.retail } : {}),
                        ...(v.wholesale !== '' ? { wholesale: v.wholesale } : {}),
                        factor: v.factor,
                        isDefault: v.isDefault,
                    })),
                });
            }
            navigate('/products');
        } catch (e: unknown) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'Error saving product');
        }
        finally { setSaving(false); }
    };

    // ── Validation ──
    const variantPricesValid = (vs: VariantDraft[]) => vs.every(v => {
        if (v.wholesale !== '' && Number(v.wholesale) > v.price) return false;
        if (v.retail !== '' && Number(v.retail) > v.price) return false;
        return true;
    });
    const hasZeroPrice = !isEdit && variants.some(v => v.price === 0);
    const canSave = form.name && form.categoryId && (
        isEdit || (variants.length > 0 && variants.every(v => v.barcode && v.price >= 0) && variantPricesValid(variants))
    );

    // ── Loading state ──
    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={24} className="text-primary-600 animate-spin" />
            </div>
        );
    }

    const editVariants: ProductVariant[] = product?.variants ?? [];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-8">
            {/* ── Page Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/products')}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {isEdit ? 'Edit Product' : 'Add Product'}
                        </h1>
                        {isEdit && product && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Stock: {product.totalStock} &bull; Avg Cost: {fmt(product.avgCostPrice)}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/products')}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={() => {
                        if (hasZeroPrice && !window.confirm('One or more variants have a sale price of Rs 0. Are you sure you want to save?')) return;
                        handleSave();
                    }} disabled={!canSave || saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isEdit ? 'Save Changes' : 'Create Product'}
                    </button>
                    {hasZeroPrice && (
                        <p className="text-xs text-amber-500 ml-2">⚠ Some variants have Rs 0 sale price</p>
                    )}
                </div>
            </div>

            {/* ── Product Details ── */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Product Details</h2>

                {/* Row 1: Name, Category, Brand */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className={lbl}>Product Image</label>
                        <ImageUpload value={form.imageUrl} onChange={(url) => f('imageUrl', url)} />
                    </div>
                    <div>
                        <label className={lbl}>Product Name *</label>
                        <input value={form.name} onChange={e => f('name', e.target.value)} className={inp} placeholder="Enter product name" />
                    </div>
                    <div>
                        <label className={lbl}>Category *</label>
                        <div className="flex gap-1.5 items-center">
                            <select value={form.categoryId ?? ''} onChange={e => f('categoryId', e.target.value ? Number(e.target.value) : undefined)} className={`${inp} flex-1`}>
                                <option value="">Select category...</option>
                                {renderCatOptions(catRoots)}
                            </select>
                            <button type="button" onClick={() => setQuickAddCat(true)} title="Add new category"
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-700 transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Brand</label>
                        <div className="flex gap-1.5 items-center">
                            <select value={form.brandId ?? ''} onChange={e => f('brandId', e.target.value ? Number(e.target.value) : undefined)} className={`${inp} flex-1`}>
                                <option value="">None</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setQuickAddBrand(true)} title="Add new brand"
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-700 transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <hr className="my-4 border-gray-200 dark:border-gray-700" />

                {/* Row 3: Tax Fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className={lbl}>Tax Schedule</label>
                        <select value={form.taxSchduleId ?? ''} onChange={e => {
                            const schedId = e.target.value ? Number(e.target.value) : undefined;
                            f('taxSchduleId', schedId);
                            if (schedId) {
                                const sched = taxSchedules.find(s => s.id === schedId);
                                if (sched) {
                                    setForm(prev => ({ ...prev, taxSchduleId: schedId, taxRate: sched.rate, hsCode: sched.hscode || prev.hsCode }));
                                }
                            }
                        }} className={inp}>
                            <option value="">None (manual)</option>
                            {taxSchedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rate}%)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>HS Code</label>
                        <input value={form.hsCode} maxLength={10} onChange={e => f('hsCode', e.target.value)} className={inp} placeholder="e.g. 0901.11" />
                    </div>
                    <div>
                        <label className={lbl}>Tax Rate %</label>
                        <input type="number" value={form.taxRate} min={0} max={100} step="0.01" onChange={e => f('taxRate', Number(e.target.value))} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Tax Method</label>
                        <select value={form.taxMethod} onChange={e => f('taxMethod', e.target.value)} className={inp}>
                            <option value="INCLUSIVE">Inclusive (included in price)</option>
                            <option value="EXCLUSIVE">Exclusive (added on top)</option>
                        </select>
                    </div>
                </div>

                {/* Divider */}
                <hr className="my-4 border-gray-200 dark:border-gray-700" />

                {/* Row 4: Inventory */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className={lbl}>Reorder Level</label>
                        <input type="number" value={form.reorderLevel} min={0} onChange={e => f('reorderLevel', Number(e.target.value))} className={inp} />
                    </div>
                    <div className="flex items-end pb-1">
                        <Toggle checked={form.allowNegative} onChange={v => f('allowNegative', v)} label="Allow Negative Stock" />
                    </div>
                    <div className="flex items-end pb-1">
                        <Toggle checked={form.isService} onChange={v => f('isService', v)} label="Is Service (no inventory)" />
                    </div>
                </div>

                {/* Divider */}
                <hr className="my-4 border-gray-200 dark:border-gray-700" />

                {/* Row 5: Options */}
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
                    <Toggle checked={form.active} onChange={v => f('active', v)} label="Active" />
                    <Toggle checked={form.showBarcodePrice} onChange={v => f('showBarcodePrice', v)} label="Show Barcode Price" />
                    <Toggle checked={form.isFavorite} onChange={v => f('isFavorite', v)} label="Favorite" />
                    <Toggle checked={form.saleBelowCost} onChange={v => f('saleBelowCost', v)} label="Allow Sale Below Cost" />
                </div>
            </div>

            {/* ── Variants ── */}
            <div className={card}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Variants</h2>
                    {isEdit ? (
                        editingVariant?.id !== 'new' && (
                            <button onClick={startAddVariant}
                                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                                <Plus size={12} /> Add Variant
                            </button>
                        )
                    ) : (
                        <button onClick={addVariant}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> Add Variant
                        </button>
                    )}
                </div>

                {isEdit ? (
                    /* ── EDIT mode: existing variants ── */
                    <div className="space-y-3">
                        {editVariants.length > 0 && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-500">
                                            <th className="px-3 py-2 text-left">Name</th>
                                            <th className="px-3 py-2 text-left">Barcode</th>
                                            <th className="px-3 py-2 text-right">Factor</th>
                                            <th className="px-3 py-2 text-right">Sale Price</th>
                                            <th className="px-3 py-2 text-right">Wholesale</th>
                                            <th className="px-3 py-2 text-right">Retail</th>
                                            <th className="px-3 py-2 text-center">Default</th>
                                            <th className="px-3 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editVariants.map(v => (
                                            editingVariant?.id === v.id ? (
                                                <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700">
                                                    <td colSpan={8} className="p-3">
                                                        <VariantFields v={editingVariant.form}
                                                            onChange={(field, val) => updateEditVariantField(field, val)} />
                                                        <div className="flex items-center gap-2 mt-3 justify-end">
                                                            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                                                <input type="checkbox" checked={editingVariant.form.isDefault}
                                                                    onChange={e => updateEditVariantField('isDefault', e.target.checked)}
                                                                    className="accent-primary-600" />
                                                                Default variant
                                                            </label>
                                                            <button onClick={cancelEditVariant}
                                                                className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50">
                                                                Cancel
                                                            </button>
                                                            <button onClick={saveEditVariant} disabled={variantSaving || !editingVariant.form.barcode}
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
                                                    <td className="px-3 py-2 text-right text-gray-500">{v.factor}x</td>
                                                    <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{fmt(v.price ?? v.price)}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500">{v.wholesale != null ? fmt(v.wholesale) : '—'}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500">{v.retail != null ? fmt(v.retail) : '—'}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {v.isDefault && <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex gap-1.5 justify-end">
                                                            <button onClick={() => startEditVariant(v)} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={13} /></button>
                                                            <button onClick={() => setVariantConfirm({ variantId: v.id })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* New variant form */}
                        {editingVariant?.id === 'new' && (
                            <div className="border border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-4 space-y-3">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">New Variant</p>
                                <VariantFields v={editingVariant.form}
                                    onChange={(field, val) => updateEditVariantField(field, val)} />
                                <div className="flex items-center gap-2 justify-between">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                                        <input type="checkbox" checked={editingVariant.form.isDefault}
                                            onChange={e => updateEditVariantField('isDefault', e.target.checked)}
                                            className="accent-primary-600" />
                                        Set as default
                                    </label>
                                    <div className="flex gap-1">
                                        <button onClick={cancelEditVariant}
                                            className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50">
                                            Cancel
                                        </button>
                                        <button onClick={saveEditVariant}
                                            disabled={variantSaving || !editingVariant.form.barcode || editingVariant.form.price <= 0}
                                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                                            {variantSaving && <Loader2 size={10} className="animate-spin" />} Add Variant
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editVariants.length === 0 && !editingVariant && (
                            <p className="text-sm text-gray-400 text-center py-6">No variants yet. Click "Add Variant" to create one.</p>
                        )}
                    </div>
                ) : (
                    /* ── ADD mode: local variant cards ── */
                    <div className="space-y-3">
                        {variants.map((v) => (
                            <VariantFields key={v._key} v={v}
                                onChange={(field, val) => updateAddVariant(v._key, field, val)}
                                showRemove={variants.length > 1}
                                onRemove={() => removeVariant(v._key)}
                                lockNameFactor={v.isDefault} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Variant delete confirmation ── */}
            <ConfirmDialog open={!!variantConfirm} title="Delete Variant"
                message="This will permanently delete this variant." variant="danger"
                confirmLabel="Delete" onConfirm={deleteVariant} onCancel={() => setVariantConfirm(null)} />

            {/* Quick-add Category */}
            <QuickCategoryAdd
                open={quickAddCat}
                onClose={() => setQuickAddCat(false)}
                onCreated={(cat) => {
                    // Reload categories and select the new one
                    categoryService.list({}).then(r => {
                        const cats = Array.isArray(r) ? r : (Array.isArray((r as any)?.data) ? (r as any).data : []);
                        setCatRoots(cats.filter((c: Category) => !c.parentId));
                    }).catch(() => { });
                    f('categoryId', cat.id);
                    setQuickAddCat(false);
                }}
            />

            {/* Quick-add Brand */}
            <QuickBrandAdd
                open={quickAddBrand}
                onClose={() => setQuickAddBrand(false)}
                onCreated={(brand) => {
                    setBrands(prev => [...prev, brand]);
                    f('brandId', brand.id);
                    setQuickAddBrand(false);
                }}
            />
        </div>
    );
}
