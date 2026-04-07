import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Trash2, CheckCircle, XCircle, PackageCheck, Loader2, X, CalendarCheck, UserPlus } from 'lucide-react';
import { advanceBookingService, customerService } from '../services/pos.service';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { QuickCustomerAdd } from '../components/ui/QuickCustomerAdd';
import type { AdvanceBooking, Customer, ProductVariant } from '../types/pos';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

const STATUS_BADGE: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    FULFILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

type BookingItem = { variantId: number; quantity: number; unitPrice: number; name: string };

type FormState = {
    customerId: number | null;
    customerName: string;
    deliveryDate: string;
    advancePayment: number;
    instructions: string;
    items: BookingItem[];
};

const getToday = () => new Date().toISOString().slice(0, 10);

const defaultForm = (): FormState => ({
    customerId: null,
    customerName: '',
    deliveryDate: getToday(),
    advancePayment: 0,
    instructions: '',
    items: [],
});

export function AdvanceBookings() {
    const [bookings, setBookings] = useState<AdvanceBooking[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [filterQ, setFilterQ] = useState('');

    const [viewBooking, setViewBooking] = useState<AdvanceBooking | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const [createModal, setCreateModal] = useState(false);
    const [form, setForm] = useState<FormState>(defaultForm());
    const [saving, setSaving] = useState(false);

    // Customer search in form
    const [custQuery, setCustQuery] = useState('');
    const [custResults, setCustResults] = useState<Customer[]>([]);
    const [custOpen, setCustOpen] = useState(false);

    const [delConfirm, setDelConfirm] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [showQuickCustomer, setShowQuickCustomer] = useState(false);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const load = useCallback(async (p = page) => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { page: p, pageSize: 15 };
            if (filterStatus) params.status = filterStatus;
            if (filterFrom) params.from = filterFrom;
            if (filterTo) params.to = filterTo;
            const r = await advanceBookingService.list(params);
            setBookings(r.data);
            setPage(r.pagination.page);
            setTotalPages(r.pagination.totalPages);
            setTotal(r.pagination.total);
        } catch {
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, [page, filterStatus, filterFrom, filterTo]);

    useEffect(() => { load(1); }, [filterStatus, filterFrom, filterTo]);

    const openView = async (id: number) => {
        setViewLoading(true);
        try {
            const b = await advanceBookingService.get(id);
            setViewBooking(b);
        } catch { showToast('error', 'Failed to load booking details'); }
        finally { setViewLoading(false); }
    };

    const updateStatus = async (id: number, status: string) => {
        setStatusUpdating(id);
        try {
            await advanceBookingService.updateStatus(id, status);
            showToast('success', `Booking marked as ${status.toLowerCase()}`);
            load(page);
        } catch { showToast('error', 'Failed to update status'); }
        finally { setStatusUpdating(null); }
    };

    const deleteBooking = async () => {
        if (!delConfirm) return;
        setDeleting(true);
        try {
            await advanceBookingService.delete(delConfirm);
            setDelConfirm(null);
            showToast('success', 'Booking deleted');
            load(1);
        } catch { showToast('error', 'Failed to delete booking'); }
        finally { setDeleting(false); }
    };

    // Customer search
    useEffect(() => {
        if (!custQuery.trim()) { setCustResults([]); setCustOpen(false); return; }
        const t = setTimeout(async () => {
            try {
                const r = await customerService.list({ q: custQuery, pageSize: 10 });
                setCustResults(r.data);
                setCustOpen(r.data.length > 0);
            } catch { setCustResults([]); }
        }, 300);
        return () => clearTimeout(t);
    }, [custQuery]);

    const selectCustomer = (c: Customer) => {
        setForm(p => ({ ...p, customerId: c.id, customerName: c.name }));
        setCustQuery(c.name);
        setCustOpen(false);
    };

    const addVariant = (v: ProductVariant) => {
        setForm(p => {
            const exists = p.items.find(i => i.variantId === v.id);
            if (exists) {
                return { ...p, items: p.items.map(i => i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i) };
            }
            const name = `${v.product?.name ?? ''} — ${v.name}`.trim().replace(/^— /, '');
            return { ...p, items: [...p.items, { variantId: v.id, quantity: 1, unitPrice: v.retail ?? v.price, name }] };
        });
    };

    const removeItem = (idx: number) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

    const updateItem = (idx: number, field: 'quantity' | 'unitPrice', val: number) => {
        setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
    };

    const openCreate = () => {
        setForm(defaultForm());
        setCustQuery('');
        setCustResults([]);
        setCustOpen(false);
        setCreateModal(true);
    };

    const submitCreate = async () => {
        if (!form.deliveryDate) { showToast('error', 'Delivery date is required'); return; }
        if (!form.items.length) { showToast('error', 'At least one item is required'); return; }
        const itemsTotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        if (itemsTotal <= 0) { showToast('error', 'Total amount must be greater than zero'); return; }
        setSaving(true);
        try {
            await advanceBookingService.create({
                customerId: form.customerId ?? undefined,
                deliveryDate: form.deliveryDate,
                totalAmount: itemsTotal,
                advancePayment: form.advancePayment,
                instructions: form.instructions || undefined,
                items: form.items.map(i => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
            });
            setCreateModal(false);
            showToast('success', 'Advance booking created');
            load(1);
        } catch (e: unknown) {
            showToast('error', e instanceof Error ? e.message : 'Failed to create booking');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500';

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <CalendarCheck size={20} className="text-primary-600" />
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Advance Bookings</h1>
                    {!loading && <span className="text-sm text-gray-500 dark:text-gray-400">({total})</span>}
                </div>
                <button onClick={openCreate}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
                    <Plus size={15} /> New Booking
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={filterQ} onChange={e => setFilterQ(e.target.value)} placeholder="Search…"
                        className="pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none w-44 focus:ring-2 focus:ring-primary-500" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="FULFILLED">Fulfilled</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
                {(filterStatus || filterFrom || filterTo) && (
                    <button onClick={() => { setFilterStatus(''); setFilterFrom(''); setFilterTo(''); }}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1">
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 size={22} className="animate-spin text-primary-600" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-500">No advance bookings found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Delivery Date</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Total</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Advance</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => (
                                    <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-2.5 text-gray-500">#{b.id}</td>
                                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                                            {b.customer?.name ?? <span className="text-gray-400 italic">Walk-in</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                                            {new Date(b.deliveryDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-medium">{fmt(b.totalAmount)}</td>
                                        <td className="px-4 py-2.5 text-right text-green-600">{fmt(b.advancePayment)}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? ''}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openView(b.id)} title="View"
                                                    className="p-1.5 text-gray-500 hover:text-primary-600 rounded">
                                                    <Eye size={15} />
                                                </button>
                                                {b.status === 'PENDING' && (
                                                    <button onClick={() => updateStatus(b.id, 'CONFIRMED')} title="Confirm"
                                                        disabled={statusUpdating === b.id}
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 rounded disabled:opacity-50">
                                                        {statusUpdating === b.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                                                    </button>
                                                )}
                                                {b.status === 'CONFIRMED' && (
                                                    <button onClick={() => updateStatus(b.id, 'FULFILLED')} title="Mark Fulfilled"
                                                        disabled={statusUpdating === b.id}
                                                        className="p-1.5 text-green-500 hover:text-green-700 rounded disabled:opacity-50">
                                                        {statusUpdating === b.id ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                                                    </button>
                                                )}
                                                {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                                    <button onClick={() => updateStatus(b.id, 'CANCELLED')} title="Cancel"
                                                        disabled={statusUpdating === b.id}
                                                        className="p-1.5 text-red-400 hover:text-red-600 rounded disabled:opacity-50">
                                                        <XCircle size={15} />
                                                    </button>
                                                )}
                                                {(b.status === 'CANCELLED' || b.status === 'FULFILLED') && (
                                                    <button onClick={() => setDelConfirm(b.id)} title="Delete"
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={15} onPageChange={p => { setPage(p); load(p); }} />

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                    <button onClick={() => setToast(null)}><X size={14} /></button>
                </div>
            )}

            {/* Delete Confirm */}
            {delConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full space-y-4">
                        <p className="font-semibold text-gray-900 dark:text-white">Delete this booking?</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDelConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={deleteBooking} disabled={deleting}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
                                {deleting && <Loader2 size={13} className="animate-spin" />} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewBooking && (
                <Modal open={!!viewBooking} title={`Booking #${viewBooking.id}`} onClose={() => setViewBooking(null)}>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                                <p className="font-medium text-gray-900 dark:text-white">{viewBooking.customer?.name ?? 'Walk-in'}</p>
                                {viewBooking.customer?.phone && <p className="text-gray-500">{viewBooking.customer.phone}</p>}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[viewBooking.status] ?? ''}`}>
                                    {viewBooking.status}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Delivery Date</p>
                                <p className="font-medium">{new Date(viewBooking.deliveryDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                                <p className="text-gray-600 dark:text-gray-300">{viewBooking.createdAt ? new Date(viewBooking.createdAt).toLocaleDateString('en-PK') : '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                                <p className="font-bold text-gray-900 dark:text-white">{fmt(viewBooking.totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Advance Paid</p>
                                <p className="font-medium text-green-600">{fmt(viewBooking.advancePayment)}</p>
                            </div>
                        </div>
                        {viewBooking.instructions && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">Instructions</p>
                                <p className="text-gray-700 dark:text-gray-300">{viewBooking.instructions}</p>
                            </div>
                        )}
                        {viewBooking.advanceBookingItems && viewBooking.advanceBookingItems.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Items</p>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left pb-1 text-gray-500">Product</th>
                                            <th className="text-right pb-1 text-gray-500">Qty</th>
                                            <th className="text-right pb-1 text-gray-500">Price</th>
                                            <th className="text-right pb-1 text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewBooking.advanceBookingItems.map(item => (
                                            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/50">
                                                <td className="py-1.5 text-gray-700 dark:text-gray-300">
                                                    {item.variant?.product?.name ?? '—'} {item.variant?.name ? `— ${item.variant.name}` : ''}
                                                </td>
                                                <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                                                <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{fmt(item.unitPrice)}</td>
                                                <td className="py-1.5 text-right font-medium">{fmt(item.quantity * item.unitPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex justify-between font-semibold">
                            <span>Balance Due</span>
                            <span className={viewBooking.totalAmount - viewBooking.advancePayment > 0 ? 'text-red-600' : 'text-green-600'}>
                                {fmt(Math.max(0, viewBooking.totalAmount - viewBooking.advancePayment))}
                            </span>
                        </div>
                        <div className="flex justify-between gap-2 pt-1">
                            <div className="flex gap-2">
                                {viewBooking.status === 'PENDING' && (
                                    <button onClick={() => { updateStatus(viewBooking.id, 'CONFIRMED'); setViewBooking(null); }}
                                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                                        Confirm
                                    </button>
                                )}
                                {viewBooking.status === 'CONFIRMED' && (
                                    <button onClick={() => { updateStatus(viewBooking.id, 'FULFILLED'); setViewBooking(null); }}
                                        className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg">
                                        Mark Fulfilled
                                    </button>
                                )}
                                {(viewBooking.status === 'PENDING' || viewBooking.status === 'CONFIRMED') && (
                                    <button onClick={() => { updateStatus(viewBooking.id, 'CANCELLED'); setViewBooking(null); }}
                                        className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                        Cancel
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setViewBooking(null)}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* View loading spinner */}
            {viewLoading && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-white" />
                </div>
            )}

            {/* Create Modal */}
            {createModal && (
                <Modal open={createModal} title="New Advance Booking" onClose={() => setCreateModal(false)} size="lg">
                    <div className="space-y-4 text-sm">
                        {/* Customer */}
                        <div className="relative">
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Customer (optional)</label>
                            <div className="flex gap-2">
                                <input
                                    value={custQuery}
                                    onChange={e => { setCustQuery(e.target.value); if (!e.target.value) setForm(p => ({ ...p, customerId: null, customerName: '' })); }}
                                    placeholder="Search customer…"
                                    className={inputCls + ' flex-1'}
                                />
                                <button type="button" onClick={() => setShowQuickCustomer(true)} title="Add New Customer"
                                    className="flex items-center gap-1 px-2 py-2 text-sm bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50">
                                    <UserPlus size={14} />
                                </button>
                            </div>
                            {custOpen && custResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {custResults.map(c => (
                                        <button key={c.id} onClick={() => selectCustomer(c)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                            {c.phone && <span className="text-xs text-gray-500">{c.phone}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Date + Advance Payment */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Delivery Date <span className="text-red-500">*</span></label>
                                <input type="date" value={form.deliveryDate} min={getToday()}
                                    onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Advance Payment</label>
                                <input type="number" value={form.advancePayment} min={0}
                                    onChange={e => setForm(p => ({ ...p, advancePayment: Number(e.target.value) }))}
                                    className={inputCls} />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Instructions / Notes</label>
                            <textarea rows={2} value={form.instructions}
                                onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
                                placeholder="Special instructions for this order…"
                                className={inputCls + ' resize-none'} />
                        </div>

                        {/* Product search */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Add Items</label>
                            <button type="button" onClick={() => setShowProductModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors w-full justify-center">
                                <Search size={14} /> Search Product (F5)
                            </button>
                        </div>
                        {showProductModal && (
                            <ProductSearchModal onSelect={(v) => { addVariant(v); }} onClose={() => setShowProductModal(false)} />
                        )}

                        {/* Items list */}
                        {form.items.length > 0 && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-3 py-2 text-left text-gray-500">Product</th>
                                            <th className="px-3 py-2 text-right text-gray-500 w-20">Qty</th>
                                            <th className="px-3 py-2 text-right text-gray-500 w-28">Unit Price</th>
                                            <th className="px-3 py-2 text-right text-gray-500 w-24">Total</th>
                                            <th className="px-2 py-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.items.map((it, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{it.name}</td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={it.quantity} min={1}
                                                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                        className="w-full px-2 py-1 text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={it.unitPrice} min={0}
                                                        disabled
                                                        className="w-full px-2 py-1 text-right border border-gray-200 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 outline-none cursor-not-allowed" />
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-800 dark:text-gray-200">
                                                    {fmt(it.quantity * it.unitPrice)}
                                                </td>
                                                <td className="px-2 py-2">
                                                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                                                        <X size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Summary */}
                        {form.items.length > 0 && (() => {
                            const itemsTotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                            return (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-sm space-y-1">
                                    <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                                        <span>Total Amount</span>
                                        <span>{fmt(itemsTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600">
                                        <span>Advance Received</span>
                                        <span>{fmt(form.advancePayment)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-1">
                                        <span>Balance Due</span>
                                        <span className="text-red-600">{fmt(Math.max(0, itemsTotal - form.advancePayment))}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setCreateModal(false)}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                Cancel
                            </button>
                            <button onClick={submitCreate} disabled={saving || !form.items.length || !form.deliveryDate}
                                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-1.5">
                                {saving && <Loader2 size={13} className="animate-spin" />} Create Booking
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <QuickCustomerAdd open={showQuickCustomer} onClose={() => setShowQuickCustomer(false)} onCreated={(c) => { selectCustomer(c); setShowQuickCustomer(false); }} />
        </div>
    );
}
