import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Save, X, Upload } from 'lucide-react';
import { productService, categoryService, brandService, taxScheduleService } from '../services/pos.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { QuickCategoryAdd } from '../components/ui/QuickCategoryAdd';
import { QuickBrandAdd } from '../components/ui/QuickBrandAdd';
import { API_CONFIG } from '../config/api';
import type { Product, Category, Brand, ProductVariant, TaxSchedule } from '../types/pos';

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

const inp = 'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';
const lbl = 'text-xs font-medium text-gray-600 dark:text-gray-400 block mb-0.5';
const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4';

// â”€â”€â”€ Strip leading zeros on blur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const stripLeadingZeros = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && val !== '0' && /^0+\d/.test(val)) {
        e.target.value = String(Number(val));
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
};

// â”€â”€â”€ Variant types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface VariantDraft {
    _key: number;
    id?: number;
    name: string;
    barcode: string;
    price: number;
    retail: number | '';
    wholesale: number | '';
    factor: number;
}

let _vKey = 0;
const nextKey = () => ++_vKey;

const emptyVariantDraft = (): VariantDraft => ({
    _key: nextKey(), name: '', barcode: '', price: 0, retail: '', wholesale: '', factor: 1,
});

const draftFromVariant = (v: ProductVariant): VariantDraft => ({
    _key: nextKey(), id: v.id, name: v.name, barcode: v.barcode,
    price: v.price, retail: v.retail ?? '', wholesale: v.wholesale ?? '', factor: v.factor,
});

// â”€â”€â”€ VariantForm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VariantForm({ v, onChange, onCancel, onSave, saving }: {
    v: VariantDraft;
    onChange: (field: keyof VariantDraft, val: unknown) => void;
    onCancel: () => void;
    onSave: () => void;
    saving: boolean;
}) {
    const wholesaleErr = v.wholesale !== '' && v.price > 0 && Number(v.wholesale) > v.price;
    const retailErr = v.retail !== '' && v.price > 0 && Number(v.retail) > v.price;
    const canSave = !!(v.name && v.barcode && v.price > 0 && !wholesaleErr && !retailErr);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div>
                    <label className={lbl}>Name *</label>
                    <input value={v.name} onChange={e => onChange('name', e.target.value)} className={inp} placeholder="e.g. Dozen" />
                </div>
                <div>
                    <label className={lbl}>Barcode *</label>
                    <input value={v.barcode} onChange={e => onChange('barcode', e.target.value)} className={inp} placeholder="Unique barcode" />
                </div>
                <div>
                    <label className={lbl}>Factor *</label>
                    <input type="number" value={v.factor} min={1} step="1"
                        onChange={e => onChange('factor', Number(e.target.value) || 1)}
                        onBlur={stripLeadingZeros} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Sale Price *</label>
                    <input type="number" value={v.price} min={0} step="0.01"
                        onChange={e => onChange('price', Number(e.target.value))}
                        onBlur={stripLeadingZeros} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Wholesale</label>
                    <input type="number" value={v.wholesale === '' ? '' : v.wholesale} min={0} step="0.01"
                        onChange={e => onChange('wholesale', e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={stripLeadingZeros}
                        className={`${inp} ${wholesaleErr ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                        placeholder="Optional" />
                    {wholesaleErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                </div>
                <div>
                    <label className={lbl}>Retail</label>
                    <input type="number" value={v.retail === '' ? '' : v.retail} min={0} step="0.01"
                        onChange={e => onChange('retail', e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={stripLeadingZeros}
                        className={`${inp} ${retailErr ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                        placeholder="Optional" />
                    {retailErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                </div>
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel}
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                </button>
                <button onClick={onSave} disabled={!canSave || saving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                    {saving && <Loader2 size={10} className="animate-spin" />}
                    {v.id ? 'Save' : 'Add Variant'}
                </button>
            </div>
        </div>
    );
}

export function ProductForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;

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
        costPrice: 0,
        stock: 0,
    });

    // Default unit: name="unit", factor=1 — only barcode & prices are editable
    const [baseUnit, setBaseUnit] = useState({
        barcode: '',
        price: 0,
        wholesale: '' as number | '',
        retail: '' as number | '',
    });

    const [product, setProduct] = useState<Product | null>(null);
    const [catRoots, setCatRoots] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [taxSchedules, setTaxSchedules] = useState<TaxSchedule[]>([]);
    const [quickAddCat, setQuickAddCat] = useState(false);
    const [quickAddBrand, setQuickAddBrand] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        categoryService.list({}).then(r => setCatRoots(extractCats(r).filter(c => !c.parentId))).catch(() => { });
        brandService.list({ pageSize: 500 }).then(r => setBrands(Array.isArray(r?.data) ? r.data : [])).catch(() => { });
        taxScheduleService.list().then(r => setTaxSchedules(Array.isArray(r) ? r : [])).catch(() => { });
    }, []);

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        productService.get(Number(id)).then(p => {
            setProduct(p);
            const def = p.variants?.find(v => v.isDefault) ?? p.variants?.[0];
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
                costPrice: p.avgCostPrice ?? 0,
                stock: p.totalStock ?? 0,
            });
            setBaseUnit({
                barcode: def?.barcode ?? '',
                price: def?.price ?? 0,
                wholesale: def?.wholesale ?? '',
                retail: def?.retail ?? '',
            });
        }).catch(() => navigate('/products'))
            .finally(() => setLoading(false));
    }, [id, isEdit, navigate]);

    const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        if (!form.name || !form.categoryId || !baseUnit.barcode) return;
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
                costPrice: form.costPrice,
                stock: form.stock,
            };

            if (isEdit) {
                await productService.update(Number(id), payload);
                if (product) {
                    const defVariant = product.variants?.find(v => v.isDefault) ?? product.variants?.[0];
                    const unitPayload = {
                        name: 'unit', barcode: baseUnit.barcode, price: baseUnit.price,
                        ...(baseUnit.wholesale !== '' ? { wholesale: baseUnit.wholesale } : {}),
                        ...(baseUnit.retail !== '' ? { retail: baseUnit.retail } : {}),
                        factor: 1, isDefault: true,
                    };
                    if (defVariant?.id) {
                        await productService.updateVariant(product.id, defVariant.id, unitPayload);
                    } else {
                        await productService.createVariant(product.id, unitPayload);
                    }
                }
            } else {
                await productService.create({
                    ...payload,
                    variants: [{
                        name: 'unit', barcode: baseUnit.barcode, price: baseUnit.price,
                        ...(baseUnit.wholesale !== '' ? { wholesale: baseUnit.wholesale } : {}),
                        ...(baseUnit.retail !== '' ? { retail: baseUnit.retail } : {}),
                        factor: 1, isDefault: true,
                    }],
                });
            }
            navigate('/products');
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Error saving product');
        } finally {
            setSaving(false);
        }
    };

    const wholesaleErr = baseUnit.wholesale !== '' && baseUnit.price > 0 && Number(baseUnit.wholesale) > baseUnit.price;
    const retailErr = baseUnit.retail !== '' && baseUnit.price > 0 && Number(baseUnit.retail) > baseUnit.price;
    const canSave = !!(form.name && form.categoryId && baseUnit.barcode && !wholesaleErr && !retailErr);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={24} className="text-primary-600 animate-spin" /></div>;
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto pb-8">
            {/* Header */}
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
                    <button onClick={handleSave} disabled={!canSave || saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isEdit ? 'Save Changes' : 'Create Product'}
                    </button>
                </div>
            </div>

            {/* Product info */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Product Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className={lbl}>Image</label>
                        <ImageUpload value={form.imageUrl} onChange={url => f('imageUrl', url)} />
                    </div>
                    <div>
                        <label className={lbl}>Product Name *</label>
                        <input value={form.name} onChange={e => f('name', e.target.value)} className={inp} placeholder="Enter product name" />
                    </div>
                    <div>
                        <label className={lbl}>Category *</label>
                        <div className="flex gap-1.5 items-center">
                            <select value={form.categoryId ?? ''} onChange={e => f('categoryId', e.target.value ? Number(e.target.value) : undefined)} className={`${inp} flex-1`}>
                                <option value="">Select category…</option>
                                {renderCatOptions(catRoots)}
                            </select>
                            <button type="button" onClick={() => setQuickAddCat(true)} title="Add category"
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-700">
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
                            <button type="button" onClick={() => setQuickAddBrand(true)} title="Add brand"
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-700">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

             {/* Pricing */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Pricing</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label className={lbl}>Barcode *</label>
                        <input value={baseUnit.barcode} onChange={e => setBaseUnit(p => ({ ...p, barcode: e.target.value }))} className={inp} placeholder="Unique barcode" />
                    </div>
                    <div>
                        <label className={lbl}>Cost Price *</label>
                        <input type="number" min={0} step="0.01" value={form.costPrice}
                            onChange={e => f('costPrice', Number(e.target.value))}
                            onBlur={stripLeadingZeros} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Sale Price *</label>
                        <input type="number" min={0} step="0.01" value={baseUnit.price}
                            onChange={e => setBaseUnit(p => ({ ...p, price: Number(e.target.value) }))}
                            onBlur={stripLeadingZeros} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Wholesale Price</label>
                        <input type="number" min={0} step="0.01"
                            value={baseUnit.wholesale === '' ? '' : baseUnit.wholesale}
                            onChange={e => setBaseUnit(p => ({ ...p, wholesale: e.target.value === '' ? '' : Number(e.target.value) }))}
                            onBlur={stripLeadingZeros}
                            className={`${inp} ${wholesaleErr ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                            placeholder="Optional" />
                        {wholesaleErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                    </div>
                    <div>
                        <label className={lbl}>Retail Price</label>
                        <input type="number" min={0} step="0.01"
                            value={baseUnit.retail === '' ? '' : baseUnit.retail}
                            onChange={e => setBaseUnit(p => ({ ...p, retail: e.target.value === '' ? '' : Number(e.target.value) }))}
                            onBlur={stripLeadingZeros}
                            className={`${inp} ${retailErr ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                            placeholder="Optional" />
                        {retailErr && <p className="text-[10px] text-red-500 mt-0.5">Must be ≤ sale price</p>}
                    </div>
                </div>

                <hr className="my-3 border-gray-200 dark:border-gray-700" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className={lbl}>Tax Schedule</label>
                        <select value={form.taxSchduleId ?? ''} onChange={e => {
                            const schedId = e.target.value ? Number(e.target.value) : undefined;
                            if (schedId) {
                                const s = taxSchedules.find(x => x.id === schedId);
                                if (s) setForm(p => ({ ...p, taxSchduleId: schedId, taxRate: s.rate, hsCode: s.hscode || p.hsCode }));
                            } else { f('taxSchduleId', undefined); }
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
                            <option value="INCLUSIVE">Inclusive</option>
                            <option value="EXCLUSIVE">Exclusive</option>
                        </select>
                    </div>
                </div>
            </div>

             {/* Inventory & Options */}
            <div className={card}>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Inventory &amp; Options</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className={lbl}>Stock</label>
                        <input type="number" value={form.stock} onChange={e => f('stock', Number(e.target.value))} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Reorder Level</label>
                        <input type="number" value={form.reorderLevel} min={0} onChange={e => f('reorderLevel', Number(e.target.value))} className={inp} />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    <Toggle checked={form.active} onChange={v => f('active', v)} label="Active" />
                    <Toggle checked={form.allowNegative} onChange={v => f('allowNegative', v)} label="Allow Negative Stock" />
                    <Toggle checked={form.isService} onChange={v => f('isService', v)} label="Is Service" />
                    <Toggle checked={form.showBarcodePrice} onChange={v => f('showBarcodePrice', v)} label="Show Barcode Price" />
                    <Toggle checked={form.isFavorite} onChange={v => f('isFavorite', v)} label="Favorite" />
                    <Toggle checked={form.saleBelowCost} onChange={v => f('saleBelowCost', v)} label="Allow Sale Below Cost" />
                </div>
            </div>

            <QuickCategoryAdd open={quickAddCat} onClose={() => setQuickAddCat(false)}
                onCreated={cat => {
                    categoryService.list({}).then(r => setCatRoots(extractCats(r).filter(c => !c.parentId))).catch(() => { });
                    f('categoryId', cat.id);
                    setQuickAddCat(false);
                }} />

            <QuickBrandAdd open={quickAddBrand} onClose={() => setQuickAddBrand(false)}
                onCreated={brand => {
                    setBrands(prev => [...prev, brand]);
                    f('brandId', brand.id);
                    setQuickAddBrand(false);
                }} />
        </div>
    );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â”€â”€â”€ ProductVariantsPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ProductVariantsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingVariant, setEditingVariant] = useState<VariantDraft | null>(null);
    const [variantSaving, setVariantSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ variantId: number } | null>(null);

    const reload = async () => {
        const p = await productService.get(Number(id));
        setProduct(p);
    };

    useEffect(() => {
        productService.get(Number(id))
            .then(p => setProduct(p))
            .catch(() => navigate('/products'))
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const allVariants = product?.variants ?? [];
    const defaultVariant = allVariants.find(v => v.isDefault) ?? allVariants[0];
    const extraVariants = allVariants.filter(v => v.id !== defaultVariant?.id);

    const startEdit = (v: ProductVariant) => setEditingVariant(draftFromVariant(v));
    const startAdd = () => {
        const draft = emptyVariantDraft();
        if (defaultVariant) {
            draft.price = defaultVariant.price;
            draft.retail = defaultVariant.retail ?? '';
            draft.wholesale = defaultVariant.wholesale ?? '';
        }
        setEditingVariant(draft);
    };
    const cancel = () => setEditingVariant(null);

    const updateField = (field: keyof VariantDraft, val: unknown) => {
        setEditingVariant(prev => {
            if (!prev) return prev;
            const updated = { ...prev, [field]: val };
            if (field === 'factor' && defaultVariant) {
                const factor = Number(val) || 1;
                updated.price = defaultVariant.price * factor;
                updated.retail = defaultVariant.retail ? defaultVariant.retail * factor : defaultVariant.price * factor;
                updated.wholesale = defaultVariant.wholesale ? defaultVariant.wholesale * factor : defaultVariant.price * factor;
            }
            return updated;
        });
    };

    const saveVariant = async () => {
        if (!editingVariant || !product) return;
        setVariantSaving(true);
        try {
            const v = editingVariant;
            const payload = {
                name: v.name, barcode: v.barcode, price: v.price,
                ...(v.wholesale !== '' ? { wholesale: v.wholesale } : {}),
                ...(v.retail !== '' ? { retail: v.retail } : {}),
                factor: v.factor, isDefault: false,
            };
            if (v.id) {
                await productService.updateVariant(product.id, v.id, payload);
            } else {
                await productService.createVariant(product.id, payload);
            }
            await reload();
            setEditingVariant(null);
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Error saving variant');
        } finally {
            setVariantSaving(false);
        }
    };

    const deleteVariant = async () => {
        if (!confirmDelete || !product) return;
        try {
            await productService.deleteVariant(product.id, confirmDelete.variantId);
            await reload();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Error deleting variant');
        } finally {
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={24} className="text-primary-600 animate-spin" /></div>;
    }
    if (!product) return null;

    return (
        <div className="space-y-4 max-w-4xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/products')}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Variants — {product.name}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Additional pack/unit variants. Default unit is managed on the product page.
                        </p>
                    </div>
                </div>
                <button onClick={() => navigate(`/products/${id}/edit`)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Edit Product
                </button>
            </div>

            {/* Default unit info */}
            {defaultVariant && (
                <div className={`${card} border-primary-200 dark:border-primary-700/50 bg-primary-50/40 dark:bg-primary-900/10`}>
                    <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-2">Default Unit (factor 1×)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><span className={lbl}>Barcode</span><p className="font-mono text-gray-800 dark:text-gray-100">{defaultVariant.barcode}</p></div>
                        <div><span className={lbl}>Sale Price</span><p className="font-medium text-gray-800 dark:text-gray-100">{fmt(defaultVariant.price)}</p></div>
                        <div><span className={lbl}>Wholesale</span><p className="text-gray-600 dark:text-gray-400">{fmt(defaultVariant.wholesale)}</p></div>
                        <div><span className={lbl}>Retail</span><p className="text-gray-600 dark:text-gray-400">{fmt(defaultVariant.retail)}</p></div>
                    </div>
                </div>
            )}

            {/* Additional variants */}
            <div className={card}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Additional Variants</h2>
                    {!editingVariant && (
                        <button onClick={startAdd}
                            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> Add Variant
                        </button>
                    )}
                </div>

                {editingVariant && !editingVariant.id && (
                    <div className="border border-dashed border-primary-300 dark:border-primary-700 rounded-lg p-3 mb-3">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">New Variant</p>
                        <VariantForm v={editingVariant} onChange={updateField} onCancel={cancel} onSave={saveVariant} saving={variantSaving} />
                    </div>
                )}

                {extraVariants.length === 0 && !editingVariant ? (
                    <p className="text-sm text-gray-400 text-center py-8">No additional variants. Click "Add Variant" to create one.</p>
                ) : extraVariants.length > 0 ? (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-gray-500">
                                    <th className="px-3 py-2 text-left">Name</th>
                                    <th className="px-3 py-2 text-left">Barcode</th>
                                    <th className="px-3 py-2 text-right">Factor</th>
                                    <th className="px-3 py-2 text-right">Sale Price</th>
                                    <th className="px-3 py-2 text-right">Wholesale</th>
                                    <th className="px-3 py-2 text-right">Retail</th>
                                    <th className="px-3 py-2 w-16" />
                                </tr>
                            </thead>
                            <tbody>
                                {extraVariants.map(v => (
                                    editingVariant?.id === v.id ? (
                                        <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700">
                                            <td colSpan={7} className="p-3">
                                                <VariantForm v={editingVariant} onChange={updateField} onCancel={cancel} onSave={saveVariant} saving={variantSaving} />
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={v.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium">{v.name}</td>
                                            <td className="px-3 py-2 text-gray-500 font-mono">{v.barcode}</td>
                                            <td className="px-3 py-2 text-right text-gray-500">{v.factor}×</td>
                                            <td className="px-3 py-2 text-right text-gray-800 dark:text-gray-200">{fmt(v.price)}</td>
                                            <td className="px-3 py-2 text-right text-gray-500">{v.wholesale != null ? fmt(v.wholesale) : '—'}</td>
                                            <td className="px-3 py-2 text-right text-gray-500">{v.retail != null ? fmt(v.retail) : '—'}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-1.5 justify-end">
                                                    <button onClick={() => startEdit(v)} className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors"><Pencil size={13} /></button>
                                                    <button onClick={() => setConfirmDelete({ variantId: v.id })} className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"><Trash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            <ConfirmDialog open={!!confirmDelete} title="Delete Variant"
                message="This will permanently delete this variant." variant="danger"
                confirmLabel="Delete" onConfirm={deleteVariant} onCancel={() => setConfirmDelete(null)} />
        </div>
    );
}

