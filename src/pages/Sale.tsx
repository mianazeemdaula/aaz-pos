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
import { SaleCustomerSection } from '../components/sale/SaleCustomerSection';
import { SalePaymentSection } from '../components/sale/SalePaymentSection';
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
    allowPriceChange,
    allowDiscountTypeSwitch,
    allowCartProfitView,
    barcodeRef,
    customerInputRef,
    firstAccountRef,
    lastQtyRef,
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
    loadHeldSale,
    submit,
  } = useSaleLogic();

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-2rem)] lg:h-[calc(100vh-2.5rem)]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${
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
          onSelect={variant => {
            const prod = variant.product;
            if (prod) {
              const defaultVariant = prod.variants?.find(v => v.isDefault) ?? variant;
              addToCart(prod, defaultVariant);
            }
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
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-0">
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
        />

        <SaleCartTable
          cart={cart}
          lastQtyRef={lastQtyRef}
          barcodeRef={barcodeRef}
          returnMode={returnMode}
          allowPriceChange={allowPriceChange}
          allowDiscountTypeSwitch={allowDiscountTypeSwitch}
          updateQty={updateQty}
          updateField={updateField}
          removeItem={removeItem}
          changeVariant={changeVariant}
          changePriceType={changePriceType}
          onToggleDiscountType={toggleDiscountType}
        />
      </div>

      {/* RIGHT: Customer + Totals + Payments + Actions */}
      <div className="w-full lg:w-72 flex flex-col gap-1 overflow-y-auto min-h-0">
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
          itemDiscountTotal={itemDiscountTotal}
          taxTotal={taxTotal}
          grandTotal={grandTotal}
          isReturnCart={isReturnCart}
          paidTotal={paidTotal}
          change={change}
          cartLength={cart.length}
          allowCartProfitView={allowCartProfitView}
          onOpenProfitModal={() => setShowProfitModal(true)}
        />

        <SaleActionsSection
          note={note}
          setNote={setNote}
          onSubmit={submit}
          saving={saving}
          cartLength={cart.length}
          isReturnCart={isReturnCart}
          grandTotal={grandTotal}
        />
      </div>
    </div>
  );
}
