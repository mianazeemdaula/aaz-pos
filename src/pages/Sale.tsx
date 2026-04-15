import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Minus, Trash2, Save, Pause, Loader2, CheckCircle2, AlertCircle, X, UserPlus, Scan, Search } from 'lucide-react';
import { CustomerSearch } from '../components/ui/CustomerSearch';
import { QuickCustomerAdd } from '../components/ui/QuickCustomerAdd';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { PrintConfirmDialog } from '../components/ui/PrintConfirmDialog';
import { saleService, heldService, productService, accountService } from '../services/pos.service';
import { fbrService } from '../services/fbr.service';
import { FBRPaymentMode, FBRInvoiceType } from '../types/fbr';
import { FBR_CONFIG } from '../config/api';
import { printSaleInvoice, type SaleInvoiceData } from '../utils/invoices';
import type { Product, ProductVariant, Customer, Account, HeldSale } from '../types/pos';

type PriceType = 'MRP' | 'Retail' | 'Wholesale';

interface CartItem {
  product: Product;
  variant: ProductVariant;
  qty: number;
  priceType: PriceType;
  price: number;
  discount: number;
  taxRate: number;
  taxMethod: 'EXCLUSIVE' | 'INCLUSIVE';
  hsCode: string;
}

function getVariantPrice(variant: ProductVariant, pt: PriceType): number {
  if (pt === 'Retail' && variant.retail != null) return variant.retail;
  if (pt === 'Wholesale' && variant.wholesale != null) return variant.wholesale;
  return variant.price;
}

function computeLine(item: CartItem) {
  const gross = item.qty * item.price;
  const discAmt = gross * item.discount / 100;
  const afterDisc = gross - discAmt;
  let taxAmt: number;
  let lineTotal: number;
  if (item.taxMethod === 'INCLUSIVE' && item.taxRate > 0) {
    lineTotal = afterDisc;
    taxAmt = afterDisc * item.taxRate / (100 + item.taxRate);
  } else {
    taxAmt = afterDisc * item.taxRate / 100;
    lineTotal = afterDisc + taxAmt;
  }
  return { gross, discAmt, afterDisc, taxAmt, lineTotal };
}

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function parseError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  const ae = e as any;
  if (ae?.error?.message) return ae.error.message;
  if (typeof ae?.message === 'string') return ae.message;
  return fallback;
}

//  Held Sales Modal (F9) 
function HeldSalesModal({ onLoad, onClose }: {
  onLoad: (held: HeldSale) => void;
  onClose: () => void;
}) {
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    heldService.listSales({ pageSize: 50, status: 'HELD' })
      .then(r => setHeldSales(r?.data ?? []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, heldSales.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (heldSales[selectedIdx]) { onLoad(heldSales[selectedIdx]); onClose(); } }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [heldSales, selectedIdx, onLoad, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-xl shadow-2xl flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Pause size={16} /> Held Sales
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span> Navigate</span><span>Enter Load</span><span>ESC Close</span>
            <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading held sales
            </div>
          )}
          {!loading && heldSales.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Pause size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No held sales found</p>
            </div>
          )}
          {!loading && heldSales.map((s, idx) => {
            const data = s.saleData as any;
            const items: any[] = data?.items ?? [];
            const total = items.reduce((acc, i) => acc + (i.qty ?? 0) * (i.price ?? 0), 0);
            const isSelected = idx === selectedIdx;
            const cust = data?.customerSnapshot;
            return (
              <button
                key={s.id}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => { onLoad(s); onClose(); }}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between gap-3 transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border-l-[3px] border-l-primary-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    Hold #{s.id}
                    {cust?.name && <span className="font-normal text-gray-500 ml-1.5"> {cust.name}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {items.length} item{items.length !== 1 ? 's' : ''}  {new Date(s.createdAt).toLocaleString()}
                  </p>
                  {s.note && <p className="text-xs text-gray-400 mt-0.5 truncate">"{s.note}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-primary-600">{fmt(total)}</p>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded mt-0.5 inline-block">{s.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

//  Main Sale Component 
export function Sale() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);

  const [barcode, setBarcode] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeError, setBarcodeError] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountAmounts, setAccountAmounts] = useState<Record<number, string>>({});

  const [showProductModal, setShowProductModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<SaleInvoiceData | null>(null);
  const [returnMode, setReturnMode] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const firstAccountRef = useRef<HTMLInputElement>(null);
  const lastQtyRef = useRef<HTMLInputElement>(null);

  const submitRef = useRef<() => void>(() => { });
  const clearCartRef = useRef<() => void>(() => { });

  useEffect(() => {
    accountService.list({ pageSize: 100 }).then(r => {
      setAccounts(r.data.filter(a => a.type === 'ASSET'));
    }).catch(e => { console.error('[load accounts]', e); });
  }, []);

  const subtotal = cart.reduce((a, i) => a + i.qty * i.price, 0);
  const itemDiscountTotal = cart.reduce((a, i) => a + computeLine(i).discAmt, 0);
  const taxTotal = cart.reduce((a, i) => a + computeLine(i).taxAmt, 0);
  const grandTotal = cart.reduce((a, i) => a + computeLine(i).lineTotal, 0) - invoiceDiscount;
  const isReturnCart = grandTotal < -0.01;
  const paidTotal = Object.values(accountAmounts).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const change = paidTotal - grandTotal;

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const addToCart = useCallback((product: Product, variant: ProductVariant, priceType: PriceType = 'MRP') => {
    const enrichedVariant = { ...variant, product };
    setCart(prev => {
      const idx = prev.findIndex(i => i.variant.id === variant.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: returnMode ? next[idx].qty - 1 : next[idx].qty + 1 };
        return next;
      }
      return [{
        product,
        variant: enrichedVariant,
        qty: returnMode ? -1 : 1,
        priceType,
        price: getVariantPrice(variant, priceType),
        discount: 0,
        taxRate: product.taxRate ?? 0,
        taxMethod: product.taxMethod ?? 'EXCLUSIVE',
        hsCode: product.hsCode ?? '',
      }, ...prev];
    });
    setBarcode('');
    setTimeout(() => barcodeRef.current?.focus(), 30);
  }, [returnMode]);

  const handleBarcodeEnter = useCallback(async (bc: string) => {
    if (!bc.trim()) return;
    setBarcodeLoading(true);
    setBarcodeError('');
    try {
      const variant = await productService.getVariantByBarcode(bc.toUpperCase().trim());
      if (variant && variant.productId) {
        const fullProduct = await productService.get(variant.productId);
        const matchedVariant = fullProduct.variants?.find(v => v.barcode === variant.barcode) ?? variant;
        addToCart(fullProduct, matchedVariant);
      }
    } catch {
      setBarcodeError(`"${bc.trim()}" not found`);
      setTimeout(() => setBarcodeError(''), 2500);
    } finally {
      setBarcodeLoading(false);
    }
  }, [addToCart]);

  const updateQty = (idx: number, delta: number) =>
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, qty: returnMode ? Math.min(-1, item.qty + delta) : Math.max(1, item.qty + delta) } : item));

  const updateField = (idx: number, field: 'price' | 'discount' | 'qty', val: number) =>
    setCart(prev => prev.map((item, i) => i === idx ? { ...item, [field]: field === 'qty' ? (returnMode ? Math.min(-1, val) : Math.max(1, val)) : val } : item));

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const changeVariant = (idx: number, variantId: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newVariant = item.product.variants?.find(v => v.id === variantId);
      if (!newVariant) return item;
      const enrichedVariant = { ...newVariant, product: item.product };
      return { ...item, variant: enrichedVariant, price: getVariantPrice(newVariant, item.priceType) };
    }));
  };

  const changePriceType = (idx: number, pt: PriceType) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, priceType: pt, price: getVariantPrice(item.variant, pt) };
    }));
  };

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomer(null);
    setNote('');
    setInvoiceDiscount(0);
    setAccountAmounts({});
    setTimeout(() => barcodeRef.current?.focus(), 30);
  }, []);

  const holdSale = async () => {
    if (!cart.length) return;
    try {
      await heldService.createSale({
        saleData: {
          discount: invoiceDiscount,
          note,
          customerId: customer?.id,
          customerSnapshot: customer ? { id: customer.id, name: customer.name } : null,
          items: cart.map(i => ({
            variantId: i.variant.id,
            qty: i.qty,
            price: i.price,
            discount: i.discount,
            priceType: i.priceType,
            taxMethod: i.taxMethod,
            variantSnapshot: {
              id: i.variant.id,
              productId: i.variant.productId,
              name: i.variant.name,
              barcode: i.variant.barcode,
              price: i.variant.price,
              retail: i.variant.retail,
              wholesale: i.variant.wholesale,
              factor: i.variant.factor,
              isDefault: i.variant.isDefault,
              product: i.variant.product ? {
                id: i.variant.product.id,
                name: i.variant.product.name,
                taxRate: i.variant.product.taxRate,
                taxMethod: i.variant.product.taxMethod,
                hsCode: i.variant.product.hsCode,
                totalStock: i.variant.product.totalStock,
                category: i.variant.product.category,
                brand: i.variant.product.brand,
              } : null,
            },
            productSnapshot: i.product ? {
              id: i.product.id,
              name: i.product.name,
              taxRate: i.product.taxRate,
              taxMethod: i.product.taxMethod,
              hsCode: i.product.hsCode,
              variants: i.product.variants?.map(v => ({
                id: v.id,
                productId: v.productId,
                name: v.name,
                barcode: v.barcode,
                price: v.price,
                retail: v.retail,
                wholesale: v.wholesale,
                factor: v.factor,
                isDefault: v.isDefault,
              })),
            } : null,
          })),
        },
      });
      clearCart();
      showToast('success', 'Sale held  press F9 to resume');
    } catch (e: unknown) {
      console.error('[holdSale]', e);
      showToast('error', parseError(e, 'Failed to hold'));
    }
  };

  const loadHeldSale = useCallback(async (held: HeldSale) => {
    const data = held.saleData as any;
    const items: any[] = data?.items ?? [];
    const newCart: CartItem[] = items.map((item: any) => {
      const snap = item.variantSnapshot as any;
      const prodSnap = item.productSnapshot as any;
      const variant: ProductVariant = snap?.id ? snap : {
        id: item.variantId,
        productId: 0,
        name: `Variant #${item.variantId}`,
        barcode: '',
        price: item.price ?? 0,
        retail: null,
        wholesale: null,
        factor: 1,
        isDefault: true,
      };
      const product: Product = prodSnap?.id ? prodSnap : (snap?.product ? {
        id: snap.product.id,
        name: snap.product.name,
        categoryId: 0,
        totalStock: snap.product.totalStock ?? 0,
        avgCostPrice: 0,
        reorderLevel: 0,
        allowNegative: false,
        active: true,
        taxRate: snap.product.taxRate ?? 0,
        taxMethod: snap.product.taxMethod ?? item.taxMethod ?? 'EXCLUSIVE',
        hsCode: snap.product.hsCode ?? '',
        category: snap.product.category,
        brand: snap.product.brand,
        variants: prodSnap?.variants ?? [variant],
      } : {
        id: 0,
        name: variant.name,
        categoryId: 0,
        totalStock: 0,
        avgCostPrice: 0,
        reorderLevel: 0,
        allowNegative: false,
        active: true,
        taxRate: 0,
        taxMethod: 'EXCLUSIVE' as const,
        hsCode: '',
        variants: [variant],
      });
      return {
        product,
        variant: { ...variant, product },
        qty: item.qty ?? 1,
        priceType: (item.priceType as PriceType) ?? 'MRP',
        price: item.price ?? 0,
        discount: item.discount ?? 0,
        taxRate: product.taxRate ?? 0,
        taxMethod: product.taxMethod ?? 'EXCLUSIVE',
        hsCode: product.hsCode ?? '',
      };
    });
    setCart(newCart);
    setInvoiceDiscount(data?.discount ?? 0);
    setNote(data?.note ?? '');
    if (data?.customerSnapshot) setCustomer(data.customerSnapshot as Customer);
    try { await heldService.resumeSale(held.id); } catch (e) { console.error('[resumeSale]', e); }
    showToast('success', `Loaded held sale #${held.id}`);
    setTimeout(() => barcodeRef.current?.focus(), 50);
  }, [showToast]);

  const submit = useCallback(async () => {
    if (!cart.length) return showToast('error', 'Cart is empty');
    if (!isReturnCart && paidTotal < grandTotal - 0.01 && !customer) {
      return showToast('error', 'Payment is short. Enter the received amount.');
    }
    setSaving(true);
    try {
      const paymentEntries = accounts
        .filter(a => (parseFloat(accountAmounts[a.id] || '0') || 0) > 0)
        .map(a => ({
          amount: parseFloat(accountAmounts[a.id]) || 0,
          accountId: a.id,
          changeAmount: 0,
        }));

      const salePayload = {
        customerId: customer?.id,
        note,
        discount: invoiceDiscount,
        items: cart.map(i => ({
          variantId: i.variant.id,
          qty: i.qty,
          unitPrice: i.price,
          discount: i.discount,
          taxRate: i.taxRate,
          hsCode: i.hsCode,
        })),
        payments: paymentEntries,
      };

      const sale = await saleService.create(salePayload);

      if (FBR_CONFIG.enabled && !isReturnCart) {
        try {
          const saleVal = cart.reduce((a, i) => {
            const { afterDisc, taxAmt } = computeLine(i);
            return a + (i.taxMethod === 'INCLUSIVE' ? afterDisc - taxAmt : afterDisc);
          }, 0);
          const taxAmt = cart.reduce((a, i) => a + computeLine(i).taxAmt, 0);
          const discAmt = cart.reduce((a, i) => a + computeLine(i).discAmt, 0) + invoiceDiscount;
          const totalQty = cart.reduce((a, i) => a + i.qty, 0);
          const hasBankPayment = paymentEntries.some(p => p.accountId == 2);
          await fbrService.generateInvoice({
            InvoiceNumber: '',
            POSID: FBR_CONFIG.posId,
            USIN: String(sale.id),
            DateTime: new Date(sale.createdAt).toISOString().replace('T', ' ').slice(0, 19),
            SaleValue: saleVal,
            BuyerNTN: customer?.ntn ?? undefined,
            BuyerCNIC: customer?.cnic ?? undefined,
            BuyerName: customer?.name,
            TotalSaleValue: saleVal,
            TotalQuantity: totalQty,
            TotalTaxCharged: taxAmt,
            Discount: discAmt,
            FurtherTax: 0,
            TotalBillAmount: saleVal + taxAmt,
            PaymentMode: hasBankPayment ? FBRPaymentMode.CARD : FBRPaymentMode.CASH,
            InvoiceType: FBRInvoiceType.NEW,
            Items: cart.map(i => {
              const lc = computeLine(i);
              const itemSaleVal = i.taxMethod === 'INCLUSIVE' ? lc.afterDisc - lc.taxAmt : lc.afterDisc;
              return {
                ItemCode: i.variant.barcode ?? String(i.variant.id),
                ItemName: i.variant.product?.name ?? i.variant.name,
                Quantity: i.qty,
                PCTCode: i.hsCode || '00000000',
                TaxRate: i.taxRate,
                TaxCharged: lc.taxAmt,
                TotalAmount: lc.lineTotal,
                SaleValue: itemSaleVal,
                InvoiceType: FBRInvoiceType.NEW,
                Discount: lc.discAmt,
              };
            }),
          });
        } catch (e: unknown) {
          console.error('[FBR submit]', e);
          showToast('error', `Sale saved but FBR failed: ${parseError(e, 'FBR submission failed')}`);
          setSaving(false);
          return;
        }
      }

      const printData: SaleInvoiceData = {
        sale,
        items: cart.map(i => ({
          name: i.variant.product?.name ?? i.variant.name,
          qty: i.qty,
          price: i.price,
          discount: i.discount,
          total: computeLine(i).lineTotal,
        })),
        customer: customer ?? null,
        subtotal,
        discountAmount: itemDiscountTotal + invoiceDiscount,
        taxAmount: taxTotal,
        grandTotal,
        paidAmount: paidTotal,
        changeAmount: Math.max(0, change),
      };

      clearCart();
      showToast('success', `Sale #${sale.invoiceNumber ?? sale.id} saved!`);
      setPendingPrintData(printData);
      setShowPrintDialog(true);
    } catch (e: unknown) {
      console.error('[submit sale]', e);
      showToast('error', parseError(e, 'Failed to save sale'));
    } finally {
      setSaving(false);
    }
  }, [cart, customer, accounts, accountAmounts, grandTotal, paidTotal, invoiceDiscount, note, showToast, clearCart, subtotal, itemDiscountTotal, taxTotal, change]);



  const holdSaleRef = useRef<() => void>(() => { });
  holdSaleRef.current = holdSale;
  submitRef.current = submit;
  clearCartRef.current = clearCart;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showProductModal || showHeldModal || showNewCustomer) return;
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          barcodeRef.current?.focus();
          barcodeRef.current?.select();
          break;
        case 'F3':
          e.preventDefault();
          lastQtyRef.current?.focus();
          lastQtyRef.current?.select();
          break;
        case 'F5':
          e.preventDefault();
          setShowProductModal(true);
          break;
        case 'F6':
          e.preventDefault();
          firstAccountRef.current?.focus();
          firstAccountRef.current?.select();
          break;
        case 'F7':
          e.preventDefault();
          submitRef.current();
          break;
        case 'F8':
          e.preventDefault();
          holdSaleRef.current();
          break;
        case 'F9':
          e.preventDefault();
          setShowHeldModal(true);
          break;
        case 'F10':
          e.preventDefault();
          customerInputRef.current?.focus();
          break;
        case 'F11':
          e.preventDefault();
          setShowNewCustomer(true);
          break;
        case 'F12':
          e.preventDefault();
          clearCartRef.current();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showProductModal, showHeldModal, showNewCustomer]);

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-2rem)] lg:h-[calc(100vh-2.5rem)]">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {showProductModal && (
        <ProductSearchModal
          onSelect={(variant) => {
            const prod = variant.product;
            if (prod) {
              const defaultVariant = prod.variants?.find(v => v.isDefault) ?? variant;
              addToCart(prod, defaultVariant);
            }
          }}
          onClose={() => { setShowProductModal(false); setTimeout(() => barcodeRef.current?.focus(), 30); }}
        />
      )}

      {showHeldModal && (
        <HeldSalesModal
          onLoad={loadHeldSale}
          onClose={() => { setShowHeldModal(false); setTimeout(() => barcodeRef.current?.focus(), 30); }}
        />
      )}

      <PrintConfirmDialog
        open={showPrintDialog}
        title="Print Sale Invoice"
        message="Sale saved successfully. Would you like to print the invoice?"
        onPrint={async () => {
          if (pendingPrintData) await printSaleInvoice(pendingPrintData);
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
        onSkip={() => { setPendingPrintData(null); setShowPrintDialog(false); }}
      />

      <QuickCustomerAdd
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onCreated={(c) => { setCustomer(c); setShowNewCustomer(false); }}
      />

      {/*  LEFT: Cart Panel  */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-0">

        {/* Barcode / Scan Input */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Scan size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={barcodeRef}
                autoFocus
                type="text"
                value={barcode}
                onChange={e => { setBarcode(e.target.value); setBarcodeError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleBarcodeEnter(barcode); }
                }}
                placeholder="Scan barcode (F2)  F5 to search"
                className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
              {barcodeLoading
                ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                : barcode
                  ? <button onClick={() => { setBarcode(''); setBarcodeError(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  : null
              }
            </div>
            <button
              onClick={() => setShowProductModal(true)}
              title="Search Product (F5)"
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap"
            >
              <Search size={14} /> <span className="hidden sm:inline">Search</span> <span className="text-xs text-primary-400">F5</span>
            </button>
            <label
              title="Toggle Return Mode"
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${returnMode
                ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                }`}
            >
              <input type="checkbox" checked={returnMode} onChange={() => { setReturnMode(r => !r); setAccountAmounts({}); }} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
              Return
            </label>
          </div>
          {barcodeError && <p className="text-xs text-red-500 mt-1 pl-1">{barcodeError}</p>}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingCartIcon />
              <p className="text-sm mt-2">Cart is empty  scan a barcode or press F5 to search</p>
              <p className="text-xs mt-1 text-gray-300">F2 Scan &middot; F3 Qty &middot; F5 Search &middot; F7 Save &middot; F8 Hold &middot; F9 Held &middot; F12 Clear</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Product</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500">Varient</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-center w-28">Qty</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-center w-32">Price</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-16">Disc%</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-20">Tax</th>
                  <th className="px-2 py-2 font-medium text-gray-500 text-right w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item: CartItem, idx: number) => {
                  const isLast = idx === 0;
                  const lc = computeLine(item);
                  const variants = item.product.variants ?? [];
                  const hasRetail = item.variant.retail != null;
                  const hasWholesale = item.variant.wholesale != null;
                  return (
                    <tr key={`${item.variant.id}-${idx}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-1.5">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.product.name}</p>
                        <p className="text-gray-400 text-xs">{item.variant.barcode} &middot; {item.variant.name}</p>
                      </td>
                      <td>
                        {variants.length > 1 && (
                          <select
                            value={item.variant.id}
                            onChange={e => changeVariant(idx, Number(e.target.value))}
                            className="mt-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-1 max-w-40"
                          >
                            {variants.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.name} (×{v.factor})
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(idx, -1)} className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"><Minus size={10} /></button>
                          <input
                            ref={isLast ? lastQtyRef : undefined}
                            type="number"
                            value={item.qty}
                            min={returnMode ? -9999 : 1}
                            onChange={e => updateField(idx, 'qty', Number(e.target.value))}
                            onKeyDown={isLast ? e => { if (e.key === 'Enter') { e.preventDefault(); barcodeRef.current?.focus(); } } : undefined}
                            className="w-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 text-xs"
                          />
                          <button onClick={() => updateQty(idx, 1)} className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"><Plus size={10} /></button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {(hasRetail || hasWholesale) ? (
                            <select
                              value={item.priceType}
                              onChange={e => changePriceType(idx, e.target.value as PriceType)}
                              className="text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-1"
                            >
                              <option value="MRP">MRP</option>
                              {hasRetail && <option value="Retail">Retail</option>}
                              {hasWholesale && <option value="Wholesale">Wholesale</option>}
                            </select>
                          ) : (
                            <span className="text-[10px] text-gray-400">MRP</span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">{item.price.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={item.discount} min={0} max={100} step="0.01" onChange={e => updateField(idx, 'discount', Math.min(100, Number(e.target.value)))}
                          className="w-full text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs" />

                      </td>
                      <td className="px-2 py-1.5 text-right flex">
                        <span>
                          {item.taxRate > 0 && (
                            <p className="text-primary-600">{lc.taxAmt.toFixed(2)}</p>
                          )}
                        </span>
                        <span>
                          {item.taxMethod === 'INCLUSIVE' && item.taxRate > 0 && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded mt-0.5 inline-block">Incl.</span>
                          )}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">{fmt(lc.lineTotal)}</td>
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
      </div>

      {/*  RIGHT: Customer + Totals + Payments + Actions  */}
      <div className="w-full lg:w-72 flex flex-col gap-1 overflow-y-auto min-h-0">

        {/* Customer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Customer <span className="normal-case font-normal text-gray-400">(optional)</span></p>
            <button
              onClick={() => setShowNewCustomer(true)}
              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5">
              <UserPlus size={11} /> New <span className="text-gray-400 ml-0.5">(F11)</span>
            </button>
          </div>
          <CustomerSearch value={customer} onSelect={setCustomer} inputRef={customerInputRef} onCreateNew={() => setShowNewCustomer(true)} />
        </div>

        {/* Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Payment <span className="normal-case font-normal text-gray-400">(F6)</span>
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
          <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-gray-100 dark:border-gray-700 mt-2">
            <span className="text-gray-500 text-xs font-medium">Invoice Discount</span>
            <div className="flex items-center gap-1">
              <span className="text-green-600"></span>
              <input
                type="number"
                value={invoiceDiscount === 0 ? '' : invoiceDiscount}
                min={0}
                step="0.01"
                placeholder="0"
                onChange={e => setInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-green-600 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          {itemDiscountTotal > 0 && (
            <div className="flex justify-between text-green-600 text-xs font-medium mt-0.5">
              <span>Item Discounts</span><span>{fmt(itemDiscountTotal)}</span>
            </div>
          )}
          {taxTotal > 0 && (
            <div className="flex justify-between text-blue-600 text-xs font-medium mt-0.5">
              <span>Tax</span><span>+ {fmt(taxTotal)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-100 dark:border-gray-700 mt-1">
            <span>{isReturnCart ? 'Refund Amount' : 'Grand Total'}</span>
            <span className={isReturnCart ? 'text-red-600' : ''}>{fmt(Math.abs(grandTotal))}</span>
          </div>
          {cart.length > 0 && (
            <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-0.5 text-xs">
              <div className="flex justify-between font-bold text-sm text-gray-500">
                <span>Total Received</span>
                <span className={paidTotal >= grandTotal - 0.01 ? 'text-green-600 font-medium' : 'text-gray-700'}>{fmt(paidTotal)}</span>
              </div>
              {change > 0.009 && (
                <div className="flex justify-between text-green-600 font-bold text-sm"><span>{isReturnCart ? 'To Refund' : 'Change'}</span><span>{fmt(change)}</span></div>
              )}
              {change < -0.009 && (
                <div className="flex justify-between text-red-500 font-bold text-sm"><span>Remaining</span><span>{fmt(-change)}</span></div>
              )}
              {Math.abs(change) <= 0.009 && paidTotal > 0 && (
                <div className="flex justify-between text-green-600 font-bold text-sm"><span>Status</span><span>Exact </span></div>
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
          <input value={note} onChange={e => setNote(e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500" />
        </div>

        {/* Actions */}
        <div>
          <button
            onClick={submit}
            disabled={saving || !cart.length}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : isReturnCart ? `Process Return (F7) · ${fmt(Math.abs(grandTotal))}` : `Save Sale (F7) · ${fmt(grandTotal)}`}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            F8 Hold &nbsp;&bull;&nbsp; F9 Held &nbsp;&bull;&nbsp; F12 Clear
          </p>
        </div>
      </div>
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
