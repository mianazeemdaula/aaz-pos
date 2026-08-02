import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseService, heldService, productService, accountService } from '../services/pos.service';
import { useSaleSettings } from '../hooks/useSaleSettings';
import type { Product, ProductVariant, Supplier, HeldPurchase, Account } from '../types/pos';
import type { PurchaseInvoiceData } from '../utils/invoices';
import type { CartItem, DiscountType } from '../components/purchase/types';
import { getDiscountAmount, parseError, loadDraft, saveDraft, clearDraft, round2 } from '../components/purchase/types';

export function usePurchaseLogic() {
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

  const { allowPriceChange, allowDiscountTypeSwitch } = useSaleSettings();

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const firstAccountRef = useRef<HTMLInputElement>(null);
  const lastQtyRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<() => void>(() => {});
  const clearCartRef = useRef<() => void>(() => {});
  const holdRef = useRef<() => void>(() => {});

  // Derived totals
  const itemNetTotal = cart.reduce((a, i) => a + (i.totalCost - getDiscountAmount(i)), 0);
  const itemDiscountTotal = cart.reduce((a, i) => a + getDiscountAmount(i), 0);
  const grandTotal = Math.max(0, itemNetTotal - invoiceDiscount + invoiceTax + invoiceExpenses);
  const paidTotal = Object.values(accountAmounts).reduce((a, v) => a + (parseFloat(v) || 0), 0);
  const balance = paidTotal - grandTotal;

  const hasDraft = cart.length > 0;

  // Load ASSET accounts on mount
  useEffect(() => {
    accountService
      .list({ pageSize: 100 })
      .then(r => {
        setAccounts(r.data.filter((a: Account) => a.type === 'ASSET'));
      })
      .catch(e => {
        console.error('[load accounts]', e);
      });
  }, []);

  // Leave-page guard (works with BrowserRouter)
  const navigate = useNavigate();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const pendingNavRef = useRef<string | null>(null);

  // Intercept back/forward button when cart has items
  useEffect(() => {
    if (!hasDraft) return;
    window.history.pushState({ purchaseDraft: true }, '');
    const handler = (_e: PopStateEvent) => {
      if (hasDraft && !saving) {
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
    setCart(
      draft.cart.map(i => ({
        ...i,
        discountType: (i.discountType ?? 'FIXED') as DiscountType,
        unitCost: (i as any).unitCost ?? (i.qty > 0 ? i.totalCost / i.qty : 0),
      }))
    );
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
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasDraft]);

  // Cart actions — scan/search returns a variant; we use its parent product for the purchase
  const addProduct = useCallback(async (v: ProductVariant) => {
    const product = v.product;
    if (!product) return;

    let baseCost = product.avgCostPrice || 0;
    try {
      const history = await productService.getHistory(product.id);
      if (history && history.recentPurchases && history.recentPurchases.length > 0) {
        baseCost = history.recentPurchases[0].unitCost || 0;
      }
    } catch (err) {
      console.error('Failed to fetch product history:', err);
    }
    const costPerUnit = round2(baseCost * (v.factor || 1));

    setCart(prev => {
      const idx = prev.findIndex(i => i.variant.id === v.id);
      if (idx >= 0) {
        const next = [...prev];
        const cur = next[idx];
        const newQty = cur.qty + 1;
        next[idx] = { ...cur, qty: newQty, totalCost: round2(newQty * cur.unitCost) };
        return next;
      }
      const sellingPrice = round2(v.price || 0);
      return [
        {
          product,
          variant: { ...v, product },
          qty: 1,
          unitCost: costPerUnit,
          totalCost: costPerUnit,
          discount: 0,
          discountType: 'FIXED' as DiscountType,
          unitRate: sellingPrice,
        },
        ...prev,
      ];
    });
    setBarcode('');
    setTimeout(() => barcodeRef.current?.focus(), 30);
  }, []);

  const handleBarcodeEnter = useCallback(
    async (bc: string) => {
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
    },
    [addProduct]
  );

  const updateQty = (idx: number, delta: number) =>
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const currentQty = item.qty || 0;
        const newQty = Math.max(1, currentQty + delta);
        return { ...item, qty: newQty, totalCost: round2(newQty * item.unitCost) };
      })
    );

  const updateField = (
    idx: number,
    field: 'qty' | 'unitCost' | 'totalCost' | 'discount' | 'unitRate',
    val: number
  ) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'qty') {
          const newQty = Math.max(0, isNaN(val) ? 0 : val);
          return { ...item, qty: newQty, totalCost: round2(newQty * item.unitCost) };
        }
        if (field === 'unitCost') {
          const newUnitCost = round2(Math.max(0, val));
          return { ...item, unitCost: newUnitCost, totalCost: round2(item.qty * newUnitCost) };
        }
        if (field === 'totalCost') {
          const newTotal = round2(Math.max(0, val));
          const newUnitCost = item.qty > 0 ? round2(newTotal / item.qty) : 0;
          return { ...item, totalCost: newTotal, unitCost: newUnitCost };
        }
        if (field === 'discount') return { ...item, discount: round2(Math.max(0, val)) };
        if (field === 'unitRate') return { ...item, unitRate: round2(Math.max(0, val)) };
        return item;
      })
    );
    // Update default variant's retail price when sale price (unitRate) changes
    if (field === 'unitRate') {
      const item = cart[idx];
      if (item) {
        const defaultVariant = item.product.variants?.find(v => v.factor === 1);
        if (defaultVariant) {
          productService.updateVariant(item.product.id, defaultVariant.id, { retail: round2(Math.max(0, val)) }).catch(() => {});
        }
      }
    }
  };

  const updatePermanentSellingRate = useCallback(
    async (idx: number, newRate: number) => {
      const item = cart[idx];
      if (!item) return;

      const roundedRate = round2(newRate);
      if (roundedRate < 0) return;

      try {
        const variants = item.product.variants ?? [];
        const defaultVariant = variants.find(v => v.isDefault || v.factor === 1) || item.variant;
        const factor = item.variant.factor || 1;

        // Base selling price for factor=1 unit
        const basePrice = round2(roundedRate / factor);

        // Update default variant in DB (backend updateVariant automatically updates all other variants)
        await productService.updateVariant(item.product.id, defaultVariant.id, {
          price: basePrice,
          retail: basePrice,
        });

        // Also update specific variant directly if different from default variant
        if (defaultVariant.id !== item.variant.id) {
          await productService.updateVariant(item.product.id, item.variant.id, {
            price: roundedRate,
            retail: roundedRate,
          });
        }

        // Re-fetch product variants to get updated DB records
        let freshVariants = variants;
        try {
          freshVariants = await productService.getVariants(item.product.id);
        } catch {
          /* fallback */
        }

        setCart(prev =>
          prev.map((cartItem, i) => {
            if (i !== idx) return cartItem;
            const updatedProduct = {
              ...cartItem.product,
              variants: freshVariants,
            };
            const updatedCurrentVariant = freshVariants.find(v => v.id === cartItem.variant.id) ?? {
              ...cartItem.variant,
              price: roundedRate,
              retail: roundedRate,
            };
            return {
              ...cartItem,
              product: updatedProduct,
              variant: { ...updatedCurrentVariant, product: updatedProduct },
              unitRate: roundedRate,
            };
          })
        );

        showToast(
          'success',
          `Sale rate updated permanently to Rs ${roundedRate.toFixed(2)} in DB (all variants updated)`
        );
      } catch (e: unknown) {
        console.error('[updatePermanentSellingRate]', e);
        showToast('error', parseError(e, 'Failed to update selling price in database'));
      }
    },
    [cart, showToast]
  );

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const changeVariant = (idx: number, variantId: number) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newVariant = item.product.variants?.find(v => v.id === variantId);
        if (!newVariant) return item;
        return { ...item, variant: { ...newVariant, product: item.product }, unitRate: newVariant.price || 0 };
      })
    );
  };

  const toggleDiscountType = (idx: number) => {
    setCart(prev =>
      prev.map((ci, i) =>
        i === idx
          ? { ...ci, discountType: ci.discountType === 'PERCENTAGE' ? 'FIXED' : 'PERCENTAGE', discount: 0 }
          : ci
      )
    );
  };

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
            variantId: i.variant.id,
            qty: i.qty,
            totalCost: i.totalCost,
            unitCost: i.unitCost,
            discount: i.discount,
            discountType: i.discountType,
            sellingPrice: i.unitRate,
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
            },
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
  const loadHeldPurchase = useCallback(
    async (held: HeldPurchase) => {
      const data = held.purchaseData as {
        items?: {
          productId: number;
          variantId?: number;
          qty?: number;
          totalCost?: number;
          discount?: number;
          productSnapshot?: Product;
          variantSnapshot?: ProductVariant;
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
        const varSnap = item.variantSnapshot as any;
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
        const variant: ProductVariant = varSnap?.id
          ? { ...varSnap, product }
          : {
              id: item.variantId ?? 0,
              productId: item.productId,
              name: 'unit',
              barcode: '',
              price: (item as any).sellingPrice ?? 0,
              retail: null,
              wholesale: null,
              factor: 1,
              isDefault: true,
              product,
            };
        const tc = item.totalCost ?? 0;
        const q = item.qty ?? 1;
        const uc = (item as any).unitCost ?? (q > 0 ? tc / q : 0);
        return {
          product,
          variant,
          qty: q,
          unitCost: uc,
          totalCost: tc,
          discount: item.discount ?? 0,
          discountType: ((item as any).discountType as DiscountType) ?? 'FIXED',
          unitRate: (item as any).sellingPrice ?? 0,
        };
      });
      setCart(newCart);
      setRefNo(data?.refNo ?? '');
      setNote(held.note ?? '');
      setInvoiceDiscount(data?.invoiceDiscount ?? 0);
      setInvoiceTax(data?.invoiceTax ?? 0);
      setInvoiceExpenses(data?.invoiceExpenses ?? 0);
      setAccountAmounts(data?.accountAmounts ?? {});
      if (data?.supplierSnapshot) setSupplier(data.supplierSnapshot as Supplier);
      try {
        await heldService.resumePurchase(held.id);
      } catch (e) {
        console.error('[resumePurchase]', e);
      }
      showToast('success', `Loaded held purchase #${held.id}`);
      setTimeout(() => barcodeRef.current?.focus(), 50);
    },
    [showToast]
  );

  // Submit / Save
  const submit = useCallback(async () => {
    if (!cart.length) return showToast('error', 'Cart is empty');
    for (const i of cart) {
      if (!i.qty || i.qty === 0) {
        return showToast('error', `Please enter a valid quantity for ${i.product?.name ?? i.variant?.name ?? 'item'}.`);
      }
    }
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
          const unitCost = i.unitCost;
          const discAmt = getDiscountAmount(i);
          const discountPerUnit = i.qty > 0 ? discAmt / i.qty : 0;
          return {
            productId: i.product.id,
            variantId: i.variant.id,
            factor: i.variant.factor,
            quantity: i.qty,
            unitCost,
            sellingPrice: i.unitRate,
            totalCost: i.totalCost - discAmt,
            discount: discountPerUnit,
            taxAmount: 0,
          };
        }),
      });

      const poTyped = po as { id: number; invoiceNo?: string };
      const printData: PurchaseInvoiceData = {
        purchase: {
          id: poTyped.id,
          invoiceNo: poTyped.invoiceNo,
          refNumber: refNo,
          supplierId: supplier?.id,
          supplier,
          accountId: paymentEntries[0]?.accountId,
          totalAmount: itemNetTotal,
          paidAmount: paidTotal,
          discount: invoiceDiscount,
          taxAmount: invoiceTax,
          expenses: invoiceExpenses,
          note: note || undefined,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        items: cart.map(i => ({
          name: i.product.name,
          qty: i.qty,
          unitCost: i.unitCost,
          discount: getDiscountAmount(i),
          total: i.totalCost - getDiscountAmount(i),
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
  }, [
    cart,
    supplier,
    refNo,
    note,
    invoiceDiscount,
    invoiceTax,
    invoiceExpenses,
    accounts,
    accountAmounts,
    paidTotal,
    grandTotal,
    clearCart,
    showToast,
    itemNetTotal,
    itemDiscountTotal,
  ]);

  // Stable refs
  submitRef.current = submit;
  clearCartRef.current = clearCart;
  holdRef.current = holdPurchase;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showProductModal || showHeldModal) return;
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
          holdRef.current();
          break;
        case 'F9':
          e.preventDefault();
          setShowHeldModal(true);
          break;
        case 'F12':
          e.preventDefault();
          clearCartRef.current();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showProductModal, showHeldModal]);

  return {
    cart,
    addProduct,
    supplier,
    setSupplier,
    showQuickSupplier,
    setShowQuickSupplier,
    note,
    setNote,
    refNo,
    setRefNo,
    invoiceDiscount,
    setInvoiceDiscount,
    invoiceTax,
    setInvoiceTax,
    invoiceExpenses,
    setInvoiceExpenses,
    barcode,
    setBarcode,
    barcodeLoading,
    barcodeError,
    setBarcodeError,
    handleBarcodeEnter,
    accounts,
    accountAmounts,
    setAccountAmounts,
    showProductModal,
    setShowProductModal,
    showHeldModal,
    setShowHeldModal,
    saving,
    toast,
    setToast,
    showPrintDialog,
    setShowPrintDialog,
    pendingPrintData,
    setPendingPrintData,
    allowPriceChange,
    allowDiscountTypeSwitch,
    barcodeRef,
    firstAccountRef,
    lastQtyRef,
    itemNetTotal,
    itemDiscountTotal,
    grandTotal,
    paidTotal,
    balance,
    hasDraft,
    showLeaveConfirm,
    handleLeaveConfirm,
    handleLeaveCancel,
    updateQty,
    updateField,
    updatePermanentSellingRate,
    removeItem,
    changeVariant,
    toggleDiscountType,
    clearCart,
    holdPurchase,
    loadHeldPurchase,
    submit,
  };
}
