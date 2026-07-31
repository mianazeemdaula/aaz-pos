import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PrintConfirmDialog } from '../components/ui/PrintConfirmDialog';
import { QuickSupplierAdd } from '../components/ui/QuickSupplierAdd';
import { printPurchaseInvoice } from '../utils/invoices';

import { usePurchaseLogic } from '../hooks/usePurchaseLogic';
import { HeldPurchasesModal } from '../components/purchase/HeldPurchasesModal';
import { PurchaseHeader } from '../components/purchase/PurchaseHeader';
import { PurchaseCartTable } from '../components/purchase/PurchaseCartTable';
import { PurchaseSupplierSection } from '../components/purchase/PurchaseSupplierSection';
import { PurchasePaymentSection } from '../components/purchase/PurchasePaymentSection';
import { PurchaseActionsSection } from '../components/purchase/PurchaseActionsSection';

export type { DiscountType, CartItem } from '../components/purchase/types';
export { getDiscountAmount, fmt, parseError } from '../components/purchase/types';

export function Purchase() {
  const {
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
    removeItem,
    changeVariant,
    toggleDiscountType,
    holdPurchase,
    loadHeldPurchase,
    submit,
  } = usePurchaseLogic();

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

      {/* Product Search Modal (F5) */}
      {showProductModal && (
        <ProductSearchModal
          onSelect={v => {
            addProduct(v);
            setShowProductModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
          onClose={() => {
            setShowProductModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
        />
      )}

      {/* Held Purchases Modal (F9) */}
      {showHeldModal && (
        <HeldPurchasesModal
          onLoad={loadHeldPurchase}
          onClose={() => {
            setShowHeldModal(false);
            setTimeout(() => barcodeRef.current?.focus(), 30);
          }}
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

      {/* Print Confirm Dialog */}
      <PrintConfirmDialog
        open={showPrintDialog}
        title="Print Purchase Invoice"
        message="Purchase saved successfully. Would you like to print the invoice?"
        onPrint={async () => {
          if (pendingPrintData) await printPurchaseInvoice(pendingPrintData);
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
        onSkip={() => {
          setPendingPrintData(null);
          setShowPrintDialog(false);
        }}
      />

      {/* LEFT: Cart Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-h-0">
        <PurchaseHeader
          barcode={barcode}
          setBarcode={setBarcode}
          barcodeLoading={barcodeLoading}
          barcodeError={barcodeError}
          setBarcodeError={setBarcodeError}
          barcodeRef={barcodeRef}
          onBarcodeEnter={handleBarcodeEnter}
          onOpenSearchModal={() => setShowProductModal(true)}
        />

        <PurchaseCartTable
          cart={cart}
          lastQtyRef={lastQtyRef}
          barcodeRef={barcodeRef}
          allowPriceChange={allowPriceChange}
          allowDiscountTypeSwitch={allowDiscountTypeSwitch}
          itemNetTotal={itemNetTotal}
          updateQty={updateQty}
          updateField={updateField}
          removeItem={removeItem}
          changeVariant={changeVariant}
          onToggleDiscountType={toggleDiscountType}
        />
      </div>

      {/* RIGHT: Supplier + Details + Totals + Actions */}
      <div className="w-full lg:w-72 flex flex-col gap-3 overflow-y-auto min-h-0">
        <PurchaseSupplierSection
          supplier={supplier}
          setSupplier={setSupplier}
          refNo={refNo}
          setRefNo={setRefNo}
          onOpenQuickSupplier={() => setShowQuickSupplier(true)}
        />

        <PurchasePaymentSection
          supplier={supplier}
          accounts={accounts}
          accountAmounts={accountAmounts}
          setAccountAmounts={setAccountAmounts}
          firstAccountRef={firstAccountRef}
          invoiceDiscount={invoiceDiscount}
          setInvoiceDiscount={setInvoiceDiscount}
          invoiceTax={invoiceTax}
          setInvoiceTax={setInvoiceTax}
          invoiceExpenses={invoiceExpenses}
          setInvoiceExpenses={setInvoiceExpenses}
          itemDiscountTotal={itemDiscountTotal}
          grandTotal={grandTotal}
          paidTotal={paidTotal}
          balance={balance}
          cartLength={cart.length}
        />

        <PurchaseActionsSection
          note={note}
          setNote={setNote}
          onSubmit={submit}
          onHold={holdPurchase}
          saving={saving}
          cartLength={cart.length}
          grandTotal={grandTotal}
          hasDraft={hasDraft}
        />
      </div>

      {/* Quick Supplier Add Modal */}
      <QuickSupplierAdd
        open={showQuickSupplier}
        onClose={() => setShowQuickSupplier(false)}
        onCreated={s => {
          setSupplier(s);
          setShowQuickSupplier(false);
        }}
      />
    </div>
  );
}
