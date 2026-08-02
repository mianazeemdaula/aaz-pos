import { useState, useRef, useCallback, useEffect } from 'react';
import { saleService, heldService, productService, accountService } from '../services/pos.service';
import { useSaleSettings } from '../hooks/useSaleSettings';
import { fbrService } from '../services/fbr.service';
import { FBRPaymentMode, FBRInvoiceType } from '../types/fbr';
import { type SaleInvoiceData } from '../utils/invoices';
import type { Product, ProductVariant, Customer, Account, HeldSale } from '../types/pos';
import type { CartItem, PriceType, DiscountType } from '../components/sale/types';
import { getVariantPrice, computeLine, computeCartProfit, parseError } from '../components/sale/types';

export function useSaleLogic() {
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
  const [showProfitModal, setShowProfitModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<SaleInvoiceData | null>(null);
  const [returnMode, setReturnMode] = useState(false);

  const { allowPriceChange, allowDiscountTypeSwitch, allowCartProfitView } = useSaleSettings();
  const cartProfitInfo = computeCartProfit(cart, invoiceDiscount);

  const barcodeRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const firstAccountRef = useRef<HTMLInputElement>(null);
  const lastQtyRef = useRef<HTMLInputElement>(null);

  const submitRef = useRef<() => void>(() => {});
  const clearCartRef = useRef<() => void>(() => {});
  const holdSaleRef = useRef<() => void>(() => {});

  useEffect(() => {
    accountService
      .list({ pageSize: 100 })
      .then(r => {
        setAccounts(r.data.filter(a => a.type === 'ASSET'));
      })
      .catch(e => {
        console.error('[load accounts]', e);
      });
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

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, priceType: PriceType = 'MRP') => {
      const enrichedVariant = { ...variant, product };
      setCart(prev => {
        const idx = prev.findIndex(i => i.variant.id === variant.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: returnMode ? next[idx].qty - 1 : next[idx].qty + 1 };
          return next;
        }
        return [
          {
            product,
            variant: enrichedVariant,
            qty: returnMode ? -1 : 1,
            priceType,
            price: getVariantPrice(variant, priceType),
            discount: 0,
            discountType: 'PERCENTAGE' as DiscountType,
            taxRate: product.taxRate ?? 0,
            taxMethod: product.taxMethod ?? 'EXCLUSIVE',
            hsCode: product.hsCode ?? '',
          },
          ...prev,
        ];
      });
      setBarcode('');
      setTimeout(() => barcodeRef.current?.focus(), 30);
    },
    [returnMode]
  );

  const handleBarcodeEnter = useCallback(
    async (bc: string) => {
      const cleanBc = bc.trim();
      if (!cleanBc) return;
      setBarcodeLoading(true);
      setBarcodeError('');
      try {
        const variant = await productService.getVariantByBarcode(cleanBc);
        if (variant && variant.product) {
          const fullProduct = variant.product as Product;
          const matchedVariant = fullProduct.variants?.find(v => v.id === variant.id || v.barcode === variant.barcode) ?? variant;
          addToCart(fullProduct, matchedVariant);
        }
      } catch {
        setBarcodeError(`"${cleanBc}" not found`);
        setTimeout(() => setBarcodeError(''), 2500);
      } finally {
        setBarcodeLoading(false);
      }
    },
    [addToCart]
  );

  const updateQty = (idx: number, delta: number) =>
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const currentQty = item.qty || 0;
        const newQty = returnMode
          ? Math.min(-1, currentQty + delta)
          : Math.max(1, currentQty + delta);
        return { ...item, qty: newQty };
      })
    );

  const updateField = (idx: number, field: 'price' | 'discount' | 'qty', val: number) =>
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'qty') {
          const cleanVal = isNaN(val) ? 0 : val;
          const newQty = returnMode
            ? (cleanVal === 0 ? 0 : -Math.abs(cleanVal))
            : Math.max(0, cleanVal);
          return { ...item, qty: newQty };
        }
        return { ...item, [field]: val };
      })
    );

  const removeItem = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const changeVariant = (idx: number, variantId: number) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newVariant = item.product.variants?.find(v => v.id === variantId);
        if (!newVariant) return item;
        const enrichedVariant = { ...newVariant, product: item.product };
        return { ...item, variant: enrichedVariant, price: getVariantPrice(newVariant, item.priceType) };
      })
    );
  };

  const changePriceType = (idx: number, pt: PriceType) => {
    setCart(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        return { ...item, priceType: pt, price: getVariantPrice(item.variant, pt) };
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
            discountType: i.discountType,
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
              product: i.variant.product
                ? {
                    id: i.variant.product.id,
                    name: i.variant.product.name,
                    taxRate: i.variant.product.taxRate,
                    taxMethod: i.variant.product.taxMethod,
                    hsCode: i.variant.product.hsCode,
                    totalStock: i.variant.product.totalStock,
                    category: i.variant.product.category,
                    brand: i.variant.product.brand,
                  }
                : null,
            },
            productSnapshot: i.product
              ? {
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
                }
              : null,
          })),
        },
      });
      clearCart();
      showToast('success', 'Sale held • press F9 to resume');
    } catch (e: unknown) {
      console.error('[holdSale]', e);
      showToast('error', parseError(e, 'Failed to hold'));
    }
  };

  const loadHeldSale = useCallback(
    async (held: HeldSale) => {
      const data = held.saleData as any;
      const items: any[] = data?.items ?? [];
      const newCart: CartItem[] = items.map((item: any) => {
        const snap = item.variantSnapshot as any;
        const prodSnap = item.productSnapshot as any;
        const variant: ProductVariant = snap?.id
          ? snap
          : {
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
        const product: Product = prodSnap?.id
          ? prodSnap
          : snap?.product
          ? {
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
            }
          : {
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
            };
        return {
          product,
          variant: { ...variant, product },
          qty: item.qty ?? 1,
          priceType: (item.priceType as PriceType) ?? 'MRP',
          price: item.price ?? 0,
          discount: item.discount ?? 0,
          discountType: (item.discountType as DiscountType) ?? 'PERCENTAGE',
          taxRate: product.taxRate ?? 0,
          taxMethod: product.taxMethod ?? 'EXCLUSIVE',
          hsCode: product.hsCode ?? '',
        };
      });
      setCart(newCart);
      setInvoiceDiscount(data?.discount ?? 0);
      setNote(data?.note ?? '');
      if (data?.customerSnapshot) setCustomer(data.customerSnapshot as Customer);
      try {
        await heldService.resumeSale(held.id);
      } catch (e) {
        console.error('[resumeSale]', e);
      }
      showToast('success', `Loaded held sale #${held.id}`);
      setTimeout(() => barcodeRef.current?.focus(), 50);
    },
    [showToast]
  );

  const submit = useCallback(async () => {
    if (!cart.length) return showToast('error', 'Cart is empty');
    if (!isReturnCart && paidTotal < grandTotal - 0.01 && !customer) {
      return showToast('error', 'Payment is short. Enter the received amount.');
    }

    for (const i of cart) {
      if (!i.qty || i.qty === 0) {
        return showToast('error', `Please enter a valid quantity for ${i.product?.name ?? i.variant?.name ?? 'item'}.`);
      }
    }

    // Validate discount and cost price limits
    let totalCostOfNonBelowCostItems = 0;
    let totalNetOfNonBelowCostItems = 0;
    let hasNonBelowCostItems = false;

    for (const i of cart) {
      const discountAmount = i.discountType === 'FIXED' ? i.discount : (i.price * i.discount) / 100;
      const netPrice = i.price - discountAmount;
      const costPrice = (i.variant.product?.avgCostPrice ?? 0) * i.variant.factor;
      if (netPrice < 0) {
        return showToast(
          'error',
          `Discount cannot exceed selling price for ${i.variant.product?.name ?? i.variant.name}.`
        );
      }
      if (i.variant.product && !i.variant.product.saleBelowCost && netPrice < costPrice) {
        return showToast(
          'error',
          `Discount cannot make selling price below cost price for ${
            i.variant.product.name
          } (Cost: Rs ${costPrice.toFixed(2)}, Net Price: Rs ${netPrice.toFixed(2)}).`
        );
      }

      if (i.variant.product && !i.variant.product.saleBelowCost) {
        totalCostOfNonBelowCostItems += costPrice * i.qty;
        totalNetOfNonBelowCostItems += netPrice * i.qty;
        hasNonBelowCostItems = true;
      }
    }

    if (hasNonBelowCostItems) {
      const maxOverallDiscount = totalNetOfNonBelowCostItems - totalCostOfNonBelowCostItems;
      if (invoiceDiscount > maxOverallDiscount) {
        return showToast(
          'error',
          `Overall invoice discount cannot exceed Rs ${maxOverallDiscount.toFixed(
            2
          )} (the margin above cost price for non-sale-below-cost items).`
        );
      }
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
          discount: i.discountType === 'FIXED' ? i.discount : (i.price * i.discount) / 100,
          taxRate: i.taxRate,
          hsCode: i.hsCode,
        })),
        payments: paymentEntries,
      };

      // Snapshot cart data for print & FBR before clearing
      const cartSnapshot = cart.map(i => ({ ...i }));
      const snapshotCustomer = customer;
      const snapshotSubtotal = subtotal;
      const snapshotItemDiscountTotal = itemDiscountTotal;
      const snapshotTaxTotal = taxTotal;
      const snapshotGrandTotal = grandTotal;
      const snapshotPaidTotal = paidTotal;
      const snapshotChange = change;
      const snapshotInvoiceDiscount = invoiceDiscount;

      const sale = await saleService.create(salePayload);

      // Build print data immediately (FBR ID added later if available)
      const printData: SaleInvoiceData = {
        sale,
        items: cartSnapshot.map(i => ({
          name: i.variant.product?.name ?? i.variant.name,
          qty: i.qty,
          price: i.price,
          discount: computeLine(i).discAmt,
          total: computeLine(i).lineTotal,
        })),
        customer: snapshotCustomer ?? null,
        subtotal: snapshotSubtotal,
        discountAmount: snapshotItemDiscountTotal + snapshotInvoiceDiscount,
        taxAmount: snapshotTaxTotal,
        grandTotal: snapshotGrandTotal,
        paidAmount: snapshotPaidTotal,
        changeAmount: Math.max(0, snapshotChange),
      };

      // Clear cart immediately so user can start next sale
      clearCart();
      showToast('success', `Sale #${sale.id} saved!`);

      // FBR: fire-and-forget — don't block the UI
      if (fbrService.isEnabled() && !isReturnCart) {
        const fbrPromise = (async () => {
          try {
            const saleVal = cartSnapshot.reduce((a, i) => {
              const { afterDisc, taxAmt } = computeLine(i);
              return a + (i.taxMethod === 'INCLUSIVE' ? afterDisc - taxAmt : afterDisc);
            }, 0);
            const taxAmt = cartSnapshot.reduce((a, i) => a + computeLine(i).taxAmt, 0);
            const discAmt = cartSnapshot.reduce((a, i) => a + computeLine(i).discAmt, 0) + snapshotInvoiceDiscount;
            const totalQty = cartSnapshot.reduce((a, i) => a + i.qty, 0);
            const hasBankPayment = paymentEntries.some(p => p.accountId == 2);
            const fbrResponse = await fbrService.generateInvoice({
              InvoiceNumber: '',
              POSID: fbrService.getConfig().posId,
              USIN: String(sale.id),
              DateTime: new Date(sale.createdAt).toISOString().replace('T', ' ').slice(0, 19),
              SaleValue: saleVal,
              BuyerNTN: snapshotCustomer?.ntn ?? undefined,
              BuyerCNIC: snapshotCustomer?.cnic ?? undefined,
              BuyerName: snapshotCustomer?.name,
              TotalSaleValue: saleVal,
              TotalQuantity: totalQty,
              TotalTaxCharged: taxAmt,
              Discount: discAmt,
              FurtherTax: 0,
              TotalBillAmount: saleVal + taxAmt,
              PaymentMode: hasBankPayment ? FBRPaymentMode.CARD : FBRPaymentMode.CASH,
              InvoiceType: FBRInvoiceType.NEW,
              Items: cartSnapshot.map(i => {
                const lc = computeLine(i);
                const itemSaleVal = i.taxMethod === 'INCLUSIVE' ? lc.afterDisc - lc.taxAmt : lc.afterDisc;
                return {
                  ItemCode: i.variant.barcode ?? String(i.variant.id),
                  ItemName: i.variant.product?.name ?? i.variant.name,
                  Quantity: i.qty,
                  PCTCode: i.hsCode ? i.hsCode.replace(/\./g, '') : '00000000',
                  TaxRate: i.taxRate,
                  TaxCharged: lc.taxAmt,
                  TotalAmount: lc.lineTotal,
                  SaleValue: itemSaleVal,
                  InvoiceType: FBRInvoiceType.NEW,
                  Discount: lc.discAmt,
                };
              }),
            });

            const fbrInvoiceId = fbrResponse.InvoiceNumber;
            if (fbrInvoiceId) {
              // Persist FBR invoice number to the sale record
              saleService
                .updateTaxInvoice(sale.id, fbrInvoiceId)
                .catch(err => console.error('[FBR save taxInvoiceId]', err));
              // Update print data with FBR info
              printData.fbrInvoiceId = fbrInvoiceId;
              printData.fbrQrUrl = `https://tp.fbr.gov.pk/InvoiceVerification?InvoiceNo=${encodeURIComponent(
                fbrInvoiceId
              )}`;
              setPendingPrintData(prev => (prev ? { ...prev, fbrInvoiceId, fbrQrUrl: printData.fbrQrUrl } : prev));
            }
          } catch (e: unknown) {
            console.error('[FBR submit]', e);
            showToast('error', `FBR error: ${parseError(e, 'Failed to report to FBR')}`);
          }
        })();
        // Wait briefly for FBR (up to 3s) before showing print dialog
        await Promise.race([fbrPromise, new Promise(r => setTimeout(r, 3000))]);
      }

      setPendingPrintData(printData);
      setShowPrintDialog(true);
    } catch (e: unknown) {
      console.error('[submit sale]', e);
      showToast('error', parseError(e, 'Failed to save sale'));
    } finally {
      setSaving(false);
    }
  }, [
    cart,
    customer,
    accounts,
    accountAmounts,
    grandTotal,
    paidTotal,
    invoiceDiscount,
    note,
    showToast,
    clearCart,
    subtotal,
    itemDiscountTotal,
    taxTotal,
    change,
    isReturnCart,
  ]);

  holdSaleRef.current = holdSale;
  submitRef.current = submit;
  clearCartRef.current = clearCart;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showProductModal || showHeldModal || showNewCustomer || showProfitModal) return;
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
  }, [showProductModal, showHeldModal, showNewCustomer, showProfitModal]);

  return {
    cart,
    addToCart,
    customer,
    setCustomer,
    note,
    setNote,
    invoiceDiscount,
    setInvoiceDiscount,
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
    showProfitModal,
    setShowProfitModal,
    saving,
    toast,
    setToast,
    showNewCustomer,
    setShowNewCustomer,
    showPrintDialog,
    setShowPrintDialog,
    pendingPrintData,
    setPendingPrintData,
    returnMode,
    setReturnMode,
    allowPriceChange,
    allowDiscountTypeSwitch,
    allowCartProfitView,
    cartProfitInfo,
    barcodeRef,
    customerInputRef,
    firstAccountRef,
    lastQtyRef,
    subtotal,
    itemDiscountTotal,
    taxTotal,
    grandTotal,
    isReturnCart,
    paidTotal,
    change,
    updateQty,
    updateField,
    removeItem,
    changeVariant,
    changePriceType,
    toggleDiscountType,
    clearCart,
    holdSale,
    loadHeldSale,
    submit,
  };
}
