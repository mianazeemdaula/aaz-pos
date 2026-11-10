import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { PrintConfirmDialog } from '../components/ui/PrintConfirmDialog';
import { QuickCustomerAdd } from '../components/ui/QuickCustomerAdd';
import { printSaleInvoice } from '../utils/invoices';

import { useSaleLogic } from '../hooks/useSaleLogic';
import { HeldSalesModal } from '../components/sale/HeldSalesModal';
import { CartProfitModal } from '../components/sale/CartProfitModal';
import { SaleHeader } from '../components/sale/SaleHeader';
import { SaleCartTable } from '../components/sale/SaleCartTable';
import { SaleCartSummary } from '../components/sale/SaleCartSummary';
import { SaleCustomerSection } from '../components/sale/SaleCustomerSection';
import { SalePaymentSection, SaleTotalsSection } from '../components/sale/SalePaymentSection';
import { SaleActionsSection } from '../components/sale/SaleActionsSection';

export type { PriceType, DiscountType, CartItem } from '../components/sale/types';
export { computeLine, getVariantPrice, fmt, parseError } from '../components/sale/types';

export function Sale() {
  const {
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
    originalInvoiceId,
    setOriginalInvoiceId,
    hasReturnLines,
    allowPriceChange,
    allowDiscountTypeSwitch,
    maxDiscountPercent,
    maxInvoiceDiscount,
    allowCartProfitView,
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
    updateField,
    removeItem,
    changeVariant,
    changePriceType,
    toggleDiscountType,
    loadHeldSale,
    holdSale,
    submit,
  } = useSaleLogic();

  return (
    // Fills the workspace under the menu bar (3rem bar + the 0.75rem till inset).
    <div className="flex flex-col lg:flex-row gap-1.5 lg:h-[calc(100vh-3.75rem)]">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed top-14 right-4 z-50 flex items-center gap-2 pl-3 pr-2 py-2.5 rounded-md shadow-lg text-[13px] font-medium text-white max-w-md ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Product Search Modal */}
      {showProductModal && (
        <ProductSearchModal
          // Add the variant the user actually picked. The modal lists every
          // variant as its own button, so substituting the default one here
          // ignored the choice they just made.
          onSelect={variant => {
            const prod = variant.product;
            if (prod) addToCart(prod, variant);
          }}
          onClose={() => {
            setShowProductModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
        />
      )}

      {/* Held Sales Modal */}
      {showHeldModal && (
        <HeldSalesModal
          onLoad={loadHeldSale}
          onClose={() => {
            setShowHeldModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
        />
      )}

      {/* Cart Profit Analysis Modal */}
      {showProfitModal && (
        <CartProfitModal
          cart={cart}
          invoiceDiscount={invoiceDiscount}
          onClose={() => {
            setShowProfitModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
        />
      )}

      {/* Print Confirm Dialog */}
      <PrintConfirmDialog
        open={showPrintDialog}
        title="Print Sale Invoice"
        message="Sale saved successfully. Would you like to print the invoice?"
        onPrint={async () => {
          if (pendingPrintData) await printSaleInvoice(pendingPrintData);
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
        onSkip={() => {
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
      />

      {/* Quick Customer Add Modal */}
      <QuickCustomerAdd
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        onCreated={c => {
          setCustomer(c);
          setShowNewCustomer(false);
        }}
      />

      {/* LEFT: Cart Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-[var(--shadow-xs)] overflow-hidden min-h-[420px] lg:min-h-0">
        <SaleHeader
          barcode={barcode}
          setBarcode={setBarcode}
          barcodeLoading={barcodeLoading}
          barcodeError={barcodeError}
          setBarcodeError={setBarcodeError}
          barcodeRef={barcodeRef}
          onBarcodeEnter={handleBarcodeEnter}
          onOpenSearchModal={() => setShowProductModal(true)}
          returnMode={returnMode}
          setReturnMode={setReturnMode}
          setAccountAmounts={setAccountAmounts}
          hasReturnLines={hasReturnLines}
          originalInvoiceId={originalInvoiceId}
          setOriginalInvoiceId={setOriginalInvoiceId}
        />

        <SaleCartTable
          cart={cart}
          lastQtyRef={lastQtyRef}
          barcodeRef={barcodeRef}
          returnMode={returnMode}
          allowPriceChange={allowPriceChange}
          maxDiscountPercent={maxDiscountPercent}
          allowDiscountTypeSwitch={allowDiscountTypeSwitch}
          updateField={updateField}
          removeItem={removeItem}
          changeVariant={changeVariant}
          changePriceType={changePriceType}
          onToggleDiscountType={toggleDiscountType}
        />

        <SaleCartSummary
          cart={cart}
          subtotal={subtotal}
          itemDiscountTotal={itemDiscountTotal}
          invoiceDiscount={invoiceDiscount}
          taxTotal={taxTotal}
          grandTotal={grandTotal}
          isReturnCart={isReturnCart}
        />
      </div>

      {/* RIGHT: one panel — customer, payment and totals scroll; the action is pinned. */}
      <aside className="w-full lg:w-[340px] shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-[var(--shadow-xs)] overflow-hidden min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-150 dark:divide-gray-700">
          <SaleCustomerSection
            customer={customer}
            setCustomer={setCustomer}
            customerInputRef={customerInputRef}
            onOpenNewCustomer={() => setShowNewCustomer(true)}
          />

          <SalePaymentSection
            accounts={accounts}
            accountAmounts={accountAmounts}
            setAccountAmounts={setAccountAmounts}
            firstAccountRef={firstAccountRef}
            invoiceDiscount={invoiceDiscount}
            setInvoiceDiscount={setInvoiceDiscount}
            maxInvoiceDiscount={maxInvoiceDiscount}
            isReturnCart={isReturnCart}
            cartLength={cart.length}
            allowCartProfitView={allowCartProfitView}
            onOpenProfitModal={() => setShowProfitModal(true)}
          />
        </div>

        <SaleTotalsSection
          itemDiscountTotal={itemDiscountTotal}
          invoiceDiscount={invoiceDiscount}
          taxTotal={taxTotal}
          grandTotal={grandTotal}
          isReturnCart={isReturnCart}
          paidTotal={paidTotal}
          change={change}
          cartLength={cart.length}
        />

        <SaleActionsSection
          note={note}
          setNote={setNote}
          onSubmit={submit}
          onHold={holdSale}
          saving={saving}
          cartLength={cart.length}
          isReturnCart={isReturnCart}
          grandTotal={grandTotal}
        />
      </aside>
    </div>
  );
}
