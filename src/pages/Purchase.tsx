import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Minus, Trash2, Save, Pause, Loader2,
  CheckCircle2, AlertCircle, X, Scan, Search,
} from 'lucide-react';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { SupplierSearch } from '../components/ui/SupplierSearch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PrintConfirmDialog } from '../components/ui/PrintConfirmDialog';
import { QuickSupplierAdd } from '../components/ui/QuickSupplierAdd';
import { purchaseService, heldService, productService, accountService } from '../services/pos.service';
import { printPurchaseInvoice, type PurchaseInvoiceData } from '../utils/invoices';
import type { Product, ProductVariant, Supplier, HeldPurchase, Account } from '../types/pos';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product
  & { barcode?: string }
  qty: number;
  totalCost: number; // total for this line (qty × unitCost), user-entered
  discount: number;  // discount in Rs (amount)
  unitRate: number;  // intended selling price per unit (for profit display)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

function parseError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  const ae = e as { error?: { message?: string }; message?: string };
  if (ae?.error?.message) return ae.error.message;
  if (typeof ae?.message === 'string') return ae.message;
  return fallback;
}

// ─── LocalStorage Draft ───────────────────────────────────────────────────────

const LS_KEY = 'purchase_draft';

interface Draft {
  cart: CartItem[];
  supplier: Supplier | null;
  note: string;
  refNo: string;
  accountAmounts: Record<number, string>;
  invoiceDiscount: number;
  invoiceTax: number;
  invoiceExpenses: number;
}

function saveDraft(draft: Draft) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(draft)); } catch { /* quota */ }
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch { return null; }
}

function clearDraft() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ─── Held Purchases Modal ─────────────────────────────────────────────────────

function HeldPurchasesModal({
  onLoad,
  onClose,
}: {
  onLoad: (held: HeldPurchase) => void;
  onClose: () => void;
}) {
  const [held, setHeld] = useState<HeldPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    heldService
      .listPurchases({ pageSize: 50 })
      .then(r => setHeld(r.data.filter(p => p.status === 'HELD')))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { selectedRef.current?.scrollIntoView({ block: 'nearest' }); }, [selectedIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, held.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (held[selectedIdx]) { onLoad(held[selectedIdx]); onClose(); } }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [held, selectedIdx, onLoad, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Pause size={16} /> Held Purchases
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>↑↓ Navigate</span><span>Enter Load</span><span>ESC Close</span>
            <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading held purchases…
            </div>
          )}
          {!loading && held.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Pause size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No held purchases found</p>
            </div>
          )}
          {!loading && held.map((h, idx) => {
            const data = h.purchaseData as {
              items?: { qty?: number; totalCost?: number }[];
              supplierSnapshot?: { name?: string } | null;
              refNo?: string;
            };
            const items = data?.items ?? [];
            const total = items.reduce((acc, i) => acc + (i.totalCost ?? 0), 0);
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={h.id}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => { onLoad(h); onClose(); }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between gap-3 transition-colors ${isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/30 border-l-[3px] border-l-primary-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    Hold #{h.id}
                    {data?.supplierSnapshot?.name && (
                      <span className="font-normal text-gray-500 ml-1.5"> {data.supplierSnapshot.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {items.length} item{items.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {new Date(h.createdAt).toLocaleString()}
                  </p>
                  {data?.refNo && <p className="text-xs text-gray-400 mt-0.5 truncate">Ref: "{data.refNo}"</p>}
                  {h.note && <p className="text-xs text-gray-400 mt-0.5 truncate">"{h.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-primary-600">{fmt(total)}</p>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded mt-0.5 inline-block">{h.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Purchase Component ──────────────────────────────────────────────────

export function Purchase() {
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);
  const [note, setNote] = useState('');
  const [refNo, setRefNo] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceTax, setInvoiceTax] = useState(0);
  const [invoiceExpenses, setInvoiceExpenses] = useState(0);

  const [barcode, setBarcode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountAmounts, setAccountAmounts] = useState<Record<number, string>>({});

  const [showProductModal, setShowProductModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<PurchaseInvoiceData | null>(null);

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const firstAccountRef = useRef<HTMLInputElement>(null);
  const lastQtyRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<() => void>(() => { });
  const clearCartRef = useRef<() => void>(() => { });
  const holdRef = useRef<() => void>(() => { });

  // Derived totals
  const itemNetTotal = cart.reduce((a, i) => a + (i.totalCost - i.discount), 0);
  const itemDiscountTotal = cart.reduce((a, i) => a + i.discount, 0);
  const grandTotal = Math.max(0, itemNetTotal - invoiceDiscount + invoiceTax + invoiceExpenses);
  const paidTotal = Object.values(accountAmounts).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const balance = paidTotal - grandTotal;

  const hasDraft = cart.length > 0;

  // Load ASSET accounts on mount
  useEffect(() => {
    accountService.list({ pageSize: 100 }).then(r => {
      setAccounts(r.data.filter((a: Account) => a.type === 'ASSET'));
    }).catch(e => { console.error('[load accounts]', e); });
  }, []);

  // Leave-page guard (works with BrowserRouter)
  const navigate = useNavigate();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<string | null>(null);

  // Intercept back/forward button when cart has items
  useEffect(() => {
    if (!hasDraft) return;
    // Push a dummy state so back-button press is catchable
    window.history.pushState({ purchaseDraft: true }, '');
    const handler = (_e: PopStateEvent) => {
      if (hasDraft && !saving) {
        // Re-push so the URL doesn't actually change
        window.history.pushState({ purchaseDraft: true }, '');
        pendingNavRef.current = null;
        setShowLeaveConfirm(true);
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [hasDraft, saving]);

  const handleLeaveConfirm = () => {
    setShowLeaveConfirm(false);
    if (pendingNavRef.current) {
      navigate(pendingNavRef.current);
      pendingNavRef.current = null;
    } else {
      navigate(-1);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeaveConfirm(false);
    pendingNavRef.current = null;
  };

  // Toast helper
  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = loadDraft();
    if (!draft?.cart?.length) return;
    setCart(draft.cart);
    setSupplier(draft.supplier ?? null);
    setNote(draft.note ?? '');
    setRefNo(draft.refNo ?? '');
    setAccountAmounts(draft.accountAmounts ?? {});
    setInvoiceDiscount(draft.invoiceDiscount ?? 0);
    setInvoiceTax(draft.invoiceTax ?? 0);
    setInvoiceExpenses(draft.invoiceExpenses ?? 0);
  }, []);

  // Save draft on every change
  useEffect(() => {
    saveDraft({ cart, supplier, note, refNo, accountAmounts, invoiceDiscount, invoiceTax, invoiceExpenses });
  }, [cart, supplier, note, refNo, accountAmounts, invoiceDiscount, invoiceTax, invoiceExpenses]);

  // beforeunload warning
  useEffect(() => {
    if (!hasDraft) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDraft]);

  // Cart actions — scan/search returns a variant; we use its parent product for the purchase
  const addProduct = useCallback((v: ProductVariant) => {
    const product = v.product;
    if (!product) return;
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const cur = next[idx];
        const unitCost = cur.qty > 0 ? cur.totalCost / cur.qty : 0;
        next[idx] = { ...cur, qty: cur.qty + v.factor, totalCost: (cur.qty + v.factor) * unitCost };
        return next;
      }
      const unitCost = product.avgCostPrice || v.wholesale || v.price || 0;
      const sellingPrice = v.price || 0;
      return [{ product, qty: v.factor, totalCost: unitCost, discount: 0, unitRate: sellingPrice }, ...prev];
    });
    setBarcode('');
    setTimeout(() => barcodeRef.current?.focus(), 30);
  }, []);

  const handleBarcodeEnter = useCallback(async (bc: string) => {
    if (!bc.trim()) return;
    setBarcodeLoading(true);
    setBarcodeError('');
    try {
      const variant = await productService.getVariantByBarcode(bc.toUpperCase().trim());
      if (variant) addProduct(variant);
    } catch {
      setBarcodeError(`"${bc.trim()}" not found`);
      setTimeout(() => setBarcodeError(''), 2500);
    } finally {
      setBarcodeLoading(false);
    }
  }, [addProduct]);

  const updateQty = (idx: number, delta: number) =>
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(1, item.qty + delta);
      const unitCost = item.qty > 0 ? item.totalCost / item.qty : 0;
      return { ...item, qty: newQty, totalCost: newQty * unitCost };
    }));

  const updateField = (idx: number, field: 'qty' | 'totalCost' | 'discount' | 'unitRate', val: number) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'qty') {
          const newQty = Math.max(1, val);
          const unitCost = item.qty > 0 ? item.totalCost / item.qty : 0;
          return { ...item, qty: newQty, totalCost: newQty * unitCost };
        }
        if (field === 'discount') return { ...item, discount: Math.max(0, val) };
        if (field === 'unitRate') return { ...item, unitRate: Math.max(0, val) };
        return { ...item, totalCost: Math.max(0, val) };
      })
    );
    // Update the default variant's retail price when sale price (unitRate) changes
    if (field === 'unitRate') {
      const item = cart[idx];
      if (item) {
        const defaultVariant = item.product.variants?.find(v => v.factor === 1);
        if (defaultVariant) {
          productService.updateVariant(item.product.id, defaultVariant.id, { retail: Math.max(0, val) }).catch(() => { });
        }
      }
    }
  };

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const clearCart = useCallback(() => {
    setCart([]);
    setSupplier(null);
    setNote('');
    setRefNo('');
    setAccountAmounts({});
    setInvoiceDiscount(0);
    setInvoiceTax(0);
    setInvoiceExpenses(0);
    clearDraft();
    setTimeout(() => barcodeRef.current?.focus(), 30);
  }, []);

  // Hold purchase
  const holdPurchase = useCallback(async () => {
    if (!cart.length) return;
    try {
      await heldService.createPurchase({
        note: note || undefined,
        purchaseData: {
          refNo,
          supplierId: supplier?.id,
          discount: invoiceDiscount,
          taxAmount: invoiceTax,
          expenses: invoiceExpenses,
          accountAmounts,
          items: cart.map(i => ({
            productId: i.product.id,
            qty: i.qty,
            totalCost: i.totalCost,
            unitCost: i.qty > 0 ? i.totalCost / i.qty : 0,
            discount: i.discount,
            sellingPrice: i.unitRate,
            productSnapshot: {
              id: i.product.id,
              name: i.product.name,
              avgCostPrice: i.product.avgCostPrice,
              categoryId: i.product.categoryId,
              reorderLevel: i.product.reorderLevel,
              allowNegative: i.product.allowNegative,
              active: i.product.active,
              category: i.product.category,
              brand: i.product.brand,
            },
          })),
        },
      });
      clearCart();
      showToast('success', 'Purchase held — press F9 to resume');
    } catch (e) {
      showToast('error', parseError(e, 'Failed to hold purchase'));
    }
  }, [cart, supplier, refNo, note, invoiceDiscount, invoiceTax, invoiceExpenses, accountAmounts, clearCart, showToast]);

  // Load held purchase
  const loadHeldPurchase = useCallback(async (held: HeldPurchase) => {
    const data = held.purchaseData as {
      items?: {
        productId: number;
        qty?: number;
        totalCost?: number;
        discount?: number;
        productSnapshot?: Product;
      }[];
      refNo?: string;
      supplierSnapshot?: Supplier | null;
      invoiceDiscount?: number;
      invoiceTax?: number;
      invoiceExpenses?: number;
      accountAmounts?: Record<number, string>;
    };
    const items = data?.items ?? [];
    const newCart: CartItem[] = items.map(item => {
      const snap = item.productSnapshot;
      const product: Product = snap?.id
        ? snap
        : {
          id: item.productId,
          name: `Product #${item.productId}`,
          totalStock: 0,
          avgCostPrice: item.totalCost ?? 0,
          reorderLevel: 0,
          allowNegative: false,
          active: true,
          categoryId: 0,
        };
      return { product, qty: item.qty ?? 1, totalCost: item.totalCost ?? 0, discount: item.discount ?? 0, unitRate: (item as any).sellingPrice ?? 0 };
    });
    setCart(newCart);
    setRefNo(data?.refNo ?? '');
    setNote(held.note ?? '');
    setInvoiceDiscount(data?.invoiceDiscount ?? 0);
    setInvoiceTax(data?.invoiceTax ?? 0);
    setInvoiceExpenses(data?.invoiceExpenses ?? 0);
    setAccountAmounts(data?.accountAmounts ?? {});
    if (data?.supplierSnapshot) setSupplier(data.supplierSnapshot as Supplier);
    try { await heldService.resumePurchase(held.id); } catch (e) { console.error('[resumePurchase]', e); }
    showToast('success', `Loaded held purchase #${held.id}`);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, [showToast]);

  // Submit / Save
  const submit = useCallback(async () => {
    if (!cart.length) return showToast('error', 'Cart is empty');
    const paymentEntries = accounts
      .filter(a => (parseFloat(accountAmounts[a.id] || '0') || 0) > 0)
      .map(a => ({ accountId: a.id, amount: parseFloat(accountAmounts[a.id]) || 0 }));

    // When no supplier: only allow paying up to grand total
    if (!supplier && paidTotal > grandTotal + 0.01) {
      return showToast('error', 'No supplier selected — payment cannot exceed the grand total');
    }
    setSaving(true);
    try {
      const po = await purchaseService.create({
        invoiceNo: refNo || undefined,
        supplierId: supplier?.id,
        payments: paymentEntries,
        discount: invoiceDiscount,
        paidAmount: paidTotal,
        taxAmount: invoiceTax,
        expenses: invoiceExpenses,
        note: note || undefined,
        items: cart.map(i => {
          const unitCost = i.qty > 0 ? i.totalCost / i.qty : 0;
          const discountPerUnit = i.qty > 0 ? i.discount / i.qty : 0;
          return {
            productId: i.product.id,
            quantity: i.qty,
            unitCost,
            sellingPrice: i.unitRate,
            totalCost: i.totalCost - i.discount,
            discount: discountPerUnit,
            taxAmount: 0,
          };
        }),
      });

      const poTyped = po as { id: number; invoiceNo?: string };
      const printData: PurchaseInvoiceData = {
        purchase: { id: poTyped.id, invoiceNo: poTyped.invoiceNo, refNumber: refNo, supplierId: supplier?.id, supplier, accountId: paymentEntries[0]?.accountId, totalAmount: itemNetTotal, paidAmount: paidTotal, discount: invoiceDiscount, taxAmount: invoiceTax, expenses: invoiceExpenses, date: new Date().toISOString(), createdAt: new Date().toISOString() },
        items: cart.map(i => ({
          name: i.product.name,
          qty: i.qty,
          unitCost: i.qty > 0 ? i.totalCost / i.qty : 0,
          discount: i.discount,
          total: i.totalCost - i.discount,
        })),
        supplier: supplier ?? null,
        subtotal: itemNetTotal + itemDiscountTotal,
        discountAmount: itemDiscountTotal + invoiceDiscount,
        taxAmount: invoiceTax,
        expenses: invoiceExpenses,
        grandTotal,
        paidAmount: paidTotal,
      };

      clearCart();
      showToast('success', `Purchase #${poTyped.invoiceNo ?? poTyped.id} saved!`);
      setPendingPrintData(printData);
      setShowPrintDialog(true);
    } catch (e) {
      showToast('error', parseError(e, 'Failed to save purchase'));
    } finally {
      setSaving(false);
    }
  }, [cart, supplier, refNo, note, invoiceDiscount, invoiceTax, invoiceExpenses, accounts, accountAmounts, paidTotal, grandTotal, clearCart, showToast, itemNetTotal, itemDiscountTotal]);

  // Stable refs
  submitRef.current = submit;
  clearCartRef.current = clearCart;
  holdRef.current = holdPurchase;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showProductModal || showHeldModal) return;
      switch (e.key) {
        case 'F2': e.preventDefault(); barcodeRef.current?.focus(); barcodeRef.current?.select(); break;
        case 'F3': e.preventDefault(); lastQtyRef.current?.focus(); lastQtyRef.current?.select(); break;
        case 'F5': e.preventDefault(); setShowProductModal(true); break;
        case 'F6': e.preventDefault(); firstAccountRef.current?.focus(); firstAccountRef.current?.select(); break;
        case 'F7': e.preventDefault(); submitRef.current(); break;
        case 'F8': e.preventDefault(); holdRef.current(); break;
        case 'F9': e.preventDefault(); setShowHeldModal(true); break;
        case 'F12': e.preventDefault(); clearCartRef.current(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showProductModal, showHeldModal]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-2rem)] lg:h-[calc(100vh-2.5rem)]">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* Product Search Modal (F5) */}
      {showProductModal && (
        <ProductSearchModal
          onSelect={v => { addProduct(v); setShowProductModal(false); setTimeout(() => barcodeRef.current?.focus(), 30); }}
          onClose={() => { setShowProductModal(false); setTimeout(() => barcodeRef.current?.focus(), 30); }}
        />
      )}

      {/* Held Purchases Modal (F9) */}
      {showHeldModal && (
        <HeldPurchasesModal
          onLoad={loadHeldPurchase}
          onClose={() => { setShowHeldModal(false); setTimeout(() => barcodeRef.current?.focus(), 30); }}
        />
      )}

      {/* Leave-page confirm dialog */}
      <ConfirmDialog
        open={showLeaveConfirm}
        title="Leave Purchase?"
        message="You have unsaved items in the cart. Leave anyway? (Use F8 to hold instead)"
        confirmLabel="Leave"
        variant="danger"
        onConfirm={handleLeaveConfirm}
        onCancel={handleLeaveCancel}
      />

      <PrintConfirmDialog
        open={showPrintDialog}
        title="Print Purchase Invoice"
        message="Purchase saved successfully. Would you like to print the invoice?"
        onPrint={async () => {
          if (pendingPrintData) await printPurchaseInvoice(pendingPrintData);
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
        onSkip={() => { setPendingPrintData(null); setShowPrintDialog(false); }}
      />

      {/* LEFT: Cart Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-0">

        {/* Barcode + Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Scan size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={barcodeRef}
                autoFocus
                type="text"
                value={barcode}
                onChange={e => { setBarcode(e.target.value); setBarcodeError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeEnter(barcode); } }}
                placeholder="Scan barcode (F2) · F5 to search"
                className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              {barcodeLoading
                ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                : barcode
                  ? <button onClick={() => { setBarcode(''); setBarcodeError(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  : null}
            </div>
            <button
              onClick={() => setShowProductModal(true)}
              title="Search Product (F5)"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap"
            >
              <Search size={14} /> <span className="hidden sm:inline">Search</span> <span className="text-xs text-primary-400">F5</span>
            </button>
          </div>
          {barcodeError && <p className="text-xs text-red-500 mt-1 pl-1">{barcodeError}</p>}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BoxIcon />
              <p className="text-sm mt-2">Cart is empty — scan a barcode or press F5 to search</p>
              <p className="text-xs mt-1 text-gray-300">F2 Scan · F3 Qty · F5 Search · F7 Save · F8 Hold · F9 Held · F12 Clear</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Product</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-center w-28">Qty</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-32">Total Cost</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-20">Disc (Rs)</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-28">Sale Rate</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-24">Profit</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-24">Net</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => {
                  const isFirst = idx === 0;
                  const unitCost = item.qty > 0 ? item.totalCost / item.qty : 0;
                  const netTotal = item.totalCost - item.discount;
                  const profitPerUnit = item.unitRate - unitCost;
                  const profitTotal = profitPerUnit * item.qty;
                  return (
                    <tr key={item.product.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-1.5">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.product.name}</p>
                        <p className="text-gray-400 text-[11px]">
                          {item.product.barcode && <span className="mr-1">{item.product.barcode}</span>}
                          <span>@ {fmt(unitCost)}/unit</span>
                        </p>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(idx, -1)} className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"><Minus size={10} /></button>
                          <input
                            ref={isFirst ? lastQtyRef : undefined}
                            type="number"
                            value={item.qty}
                            min={1}
                            onChange={e => updateField(idx, 'qty', Number(e.target.value))}
                            onKeyDown={isFirst ? e => { if (e.key === 'Enter') { e.preventDefault(); barcodeRef.current?.focus(); } } : undefined}
                            className="w-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 text-xs"
                          />
                          <button onClick={() => updateQty(idx, 1)} className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"><Plus size={10} /></button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={item.totalCost} min={0} step="0.01" onChange={e => updateField(idx, 'totalCost', Number(e.target.value))}
                          className="w-full text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={item.discount} min={0} step="0.01" onChange={e => updateField(idx, 'discount', Number(e.target.value))}
                          className="w-full text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={item.unitRate} min={0} step="0.01" onChange={e => updateField(idx, 'unitRate', Number(e.target.value))}
                          className="w-full text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-0.5 px-1 text-xs" />
                      </td>
                      <td className={`px-2 py-1.5 text-right text-xs font-medium ${profitTotal >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {profitTotal !== 0 ? fmt(profitTotal) : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(netTotal)}</td>
                      <td className="px-1 py-1.5">
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Cart footer total */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between text-xs text-gray-500 shrink-0">
            <span>{cart.reduce((a, i) => a + i.qty, 0)} items</span>
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{fmt(itemNetTotal)}</span>
          </div>
        )}
      </div>

      {/* RIGHT: Details + Totals + Actions */}
      <div className="w-full lg:w-72 flex flex-col gap-3 overflow-y-auto min-h-0">

        {/* Supplier + Ref */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Supplier <span className="normal-case font-normal text-gray-400">(optional)</span></p>
            <SupplierSearch value={supplier} onSelect={setSupplier} onCreateNew={() => setShowQuickSupplier(true)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Ref / Bill #</label>
            <input value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. INV-001"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        {/* Payment + Totals */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Payment <span className="normal-case font-normal text-gray-400">(F6)</span>
          </p>

          {!supplier ? (
            /* No supplier selected: only allow paying exactly the grand total */
            <div className="space-y-1.5">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle size={12} /> No supplier — full payment only
              </p>
              {accounts.length === 0 ? (
                <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading accounts</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account, idx) => (
                    <div key={account.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{account.name}</p>
                        <p className="text-xs text-gray-400">{account.type}</p>
                      </div>
                      <input
                        ref={idx === 0 ? firstAccountRef : undefined}
                        type="number"
                        value={accountAmounts[account.id] ?? ''}
                        min={0}
                        step="0.01"
                        placeholder="0"
                        onChange={e => setAccountAmounts(prev => ({ ...prev, [account.id]: e.target.value }))}
                        className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Supplier selected: split payments across accounts */
            accounts.length === 0 ? (
              <p className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Loading accounts</p>
            ) : (
              <div className="space-y-2">
                {accounts.map((account, idx) => (
                  <div key={account.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{account.name}</p>
                      <p className="text-xs text-gray-400">{account.type}</p>
                    </div>
                    <input
                      ref={idx === 0 ? firstAccountRef : undefined}
                      type="number"
                      value={accountAmounts[account.id] ?? ''}
                      min={0}
                      step="0.01"
                      placeholder="0"
                      onChange={e => setAccountAmounts(prev => ({ ...prev, [account.id]: e.target.value }))}
                      className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* Invoice Discount */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-500 text-xs font-medium">Invoice Discount</span>
            <input type="number" value={invoiceDiscount === 0 ? '' : invoiceDiscount} min={0} step="0.01" placeholder="0"
              onChange={e => setInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-green-600 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-500 text-xs font-medium">Invoice Tax</span>
            <input type="number" value={invoiceTax === 0 ? '' : invoiceTax} min={0} step="0.01" placeholder="0"
              onChange={e => setInvoiceTax(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-red-500 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-500 text-xs font-medium">Invoice Expenses</span>
            <input type="number" value={invoiceExpenses === 0 ? '' : invoiceExpenses} min={0} step="0.01" placeholder="0"
              onChange={e => setInvoiceExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-orange-500 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>

          {itemDiscountTotal > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Item Discounts</span><span>− {fmt(itemDiscountTotal)}</span>
            </div>
          )}
          {invoiceDiscount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Invoice Discount</span><span>− {fmt(invoiceDiscount)}</span>
            </div>
          )}
          {invoiceTax > 0 && (
            <div className="flex justify-between text-xs text-red-500">
              <span>Invoice Tax</span><span>+ {fmt(invoiceTax)}</span>
            </div>
          )}
          {invoiceExpenses > 0 && (
            <div className="flex justify-between text-xs text-orange-500">
              <span>Invoice Expenses</span><span>+ {fmt(invoiceExpenses)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-100 dark:border-gray-700">
            <span>Grand Total</span><span>{fmt(grandTotal)}</span>
          </div>

          {cart.length > 0 && paidTotal > 0 && (
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between font-bold text-sm text-gray-500">
                <span>Paid</span>
                <span className={paidTotal >= grandTotal - 0.01 ? 'text-green-600 font-medium' : 'text-gray-700'}>{fmt(paidTotal)}</span>
              </div>
              {supplier && balance > 0.009 && (
                <div className="flex justify-between text-amber-600 font-bold text-sm"><span>Overpaid</span><span>{fmt(balance)}</span></div>
              )}
              {supplier && balance < -0.009 && (
                <div className="flex justify-between text-red-500 font-bold text-sm"><span>Remaining</span><span>{fmt(-balance)}</span></div>
              )}
              {!supplier && balance > 0.009 && (
                <div className="flex justify-between text-red-500 font-bold text-sm"><span>Exceeds Total</span><span>{fmt(balance)}</span></div>
              )}
              {Math.abs(balance) <= 0.009 && (
                <div className="flex justify-between text-green-600 font-bold text-sm"><span>Status</span><span>Exact ✓</span></div>
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..."
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={submit} disabled={saving || !cart.length}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : `Save Purchase (F7) · ${fmt(grandTotal)}`}
          </button>
          <button onClick={holdPurchase} disabled={!cart.length}
            className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-gray-700 dark:text-gray-300 text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Pause size={14} /> Hold (F8)
          </button>
          <p className="text-center text-xs text-gray-400">F9 Held &nbsp;·&nbsp; F12 Clear</p>
        </div>

        {hasDraft && (
          <p className="text-center text-xs text-amber-500">Draft auto-saved</p>
        )}
      </div>
      <QuickSupplierAdd open={showQuickSupplier} onClose={() => setShowQuickSupplier(false)} onCreated={(s) => { setSupplier(s); setShowQuickSupplier(false); }} />
    </div>
  );
}

function BoxIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
