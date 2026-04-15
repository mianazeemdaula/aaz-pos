import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { promotionService } from '../services/pos.service';

const inp = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';
const lbl = 'text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1';
const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4';

const DISCOUNT_TYPES = [
    { value: 'PERCENTAGE', label: 'Percentage (%)' },
    { value: 'FIXED_AMOUNT', label: 'Fixed Amount (Rs)' },
];
const CONDITION_TYPES = [
    { value: 'ALL_CUSTOMERS', label: 'All Customers' },
    { value: 'MINIMUM_PURCHASE', label: 'Minimum Purchase' },
    { value: 'REPEAT_CUSTOMERS', label: 'Repeat Customers' },
    { value: 'PRODUCT_SPECIFIC', label: 'Product Specific' },
];

const toDateStr = (d: string | undefined) => d ? new Date(d).toISOString().slice(0, 10) : '';

export function PromotionForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = !!id;
    const today = new Date().toISOString().slice(0, 10);

    const [form, setForm] = useState({
        name: '', description: '', discountType: 'PERCENTAGE' as string,
        discountValue: 0, conditionType: 'ALL_CUSTOMERS' as string,
        minPurchaseAmount: 0, active: true, startDate: today, endDate: today,
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isEdit) return;
        setLoading(true);
        promotionService.get(Number(id)).then(promo => {
            setForm({
                name: promo.name, description: promo.description || '',
                discountType: promo.discountType, discountValue: promo.discountValue,
                conditionType: promo.conditionType, minPurchaseAmount: promo.minPurchaseAmount ?? 0,
                active: promo.active, startDate: toDateStr(promo.startDate), endDate: toDateStr(promo.endDate),
            });
        }).catch(() => navigate('/promotions'))
            .finally(() => setLoading(false));
    }, [id, isEdit, navigate]);

    const f = (key: string, val: unknown) => setForm(p => ({ ...p, [key]: val }));

    const save = async () => {
        if (!form.name || !form.startDate || !form.endDate) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                discountValue: Number(form.discountValue),
                minPurchaseAmount: Number(form.minPurchaseAmount) || undefined,
            };
            if (isEdit) {
                await promotionService.update(Number(id), payload);
            } else {
                const created = await promotionService.create(payload) as { id: number };
                navigate(`/promotions/${created.id}/items`);
                return;
            }
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

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/promotions')}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {isEdit ? 'Edit Offer' : 'Create Offer'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/promotions')}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button onClick={save} disabled={!form.name || !form.startDate || !form.endDate || saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {isEdit ? 'Save Changes' : 'Create & Add Items'}
                    </button>
                </div>
            </div>

            <div className={card}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className={lbl}>Offer Name *</label>
                        <input value={form.name} onChange={e => f('name', e.target.value)} className={inp} placeholder="e.g. Summer Sale 2025" />
                    </div>
                    <div className="md:col-span-2">
                        <label className={lbl}>Description</label>
                        <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Optional description" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                        <label className={lbl}>Discount Type</label>
                        <select value={form.discountType} onChange={e => f('discountType', e.target.value)} className={inp}>
                            {DISCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={lbl}>Value {form.discountType === 'PERCENTAGE' ? '(%)' : '(Rs)'}</label>
                        <input type="number" value={form.discountValue} min={0} step="0.01"
                            onChange={e => f('discountValue', Number(e.target.value))} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Condition</label>
                        <select value={form.conditionType} onChange={e => f('conditionType', e.target.value)} className={inp}>
                            {CONDITION_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    {form.conditionType === 'MINIMUM_PURCHASE' && (
                        <div>
                            <label className={lbl}>Min Purchase (Rs)</label>
                            <input type="number" value={form.minPurchaseAmount} min={0}
                                onChange={e => f('minPurchaseAmount', Number(e.target.value))} className={inp} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label className={lbl}>Start Date</label>
                        <input type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>End Date</label>
                        <input type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} className={inp} />
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" checked={form.active} onChange={e => f('active', e.target.checked)} className="rounded border-gray-300 text-primary-600 accent-primary-600" />
                            Active
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
