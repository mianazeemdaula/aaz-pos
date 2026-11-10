import { CheckCircle2, AlertCircle, X, Pencil, Loader2 } from 'lucide-react';
import { ProductSearchModal } from '../components/ui/ProductSearch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PrintConfirmDialog } from '../components/ui/PrintConfirmDialog';
import { QuickSupplierAdd } from '../components/ui/QuickSupplierAdd';
import { QuickProductAdd } from '../components/ui/QuickProductAdd';
import { printPurchaseInvoice } from '../utils/invoices';

import { usePurchaseLogic } from '../hooks/usePurchaseLogic';
import { HeldPurchasesModal } from '../components/purchase/HeldPurchasesModal';
import { PurchaseHeader } from '../components/purchase/PurchaseHeader';
import { PurchaseCartTable } from '../components/purchase/PurchaseCartTable';
import { PurchaseSupplierSection } from '../components/purchase/PurchaseSupplierSection';
import { PurchasePaymentSection, PurchaseTotalsSection } from '../components/purchase/PurchasePaymentSection';
import { PurchaseActionsSection } from '../components/purchase/PurchaseActionsSection';

export type { DiscountType, CartItem } from '../components/purchase/types';
export { getDiscountAmount, fmt, parseError } from '../components/purchase/types';

export function Purchase() {
  const {
    editId,
    editLoading,
    exitEdit,
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
    showQuickProduct,
    setShowQuickProduct,
    missingBarcode,
    setMissingBarcode,
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
    updateField,
    updatePermanentSellingRate,
    removeItem,
    changeVariant,
    toggleDiscountType,
    holdPurchase,
    loadHeldPurchase,
    submit,
  } = usePurchaseLogic();

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

      {/* Product Search Modal (F5) */}
      {showProductModal && (
        <ProductSearchModal
          // Closing is the modal's call, not ours — with Hold on it stays open
          // across several adds and only closes on Esc or the close button.
          onSelect={v => addProduct(v)}
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
          if (editId !== null) exitEdit();
        }}
        onSkip={() => {
          setPendingPrintData(null);
          setShowPrintDialog(false);
          if (editId !== null) exitEdit();
        }}
      />

      {/* LEFT: Cart Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-[var(--shadow-xs)] overflow-hidden min-h-[420px] lg:min-h-0">
        {editId !== null && (
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-[13px] text-amber-800 dark:text-amber-300">
            {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
            <span className="font-semibold">Editing PO-{editId}</span>
            <span className="hidden sm:inline text-amber-700/80 dark:text-amber-300/80">
              Saving updates stock, average cost, payments and the supplier ledger.
            </span>
            <button
              type="button"
              onClick={exitEdit}
              disabled={saving}
              className="ml-auto px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/20 disabled:opacity-50"
            >
              Cancel edit
            </button>
          </div>
        )}
        <PurchaseHeader
          barcode={barcode}
          setBarcode={setBarcode}
          barcodeLoading={barcodeLoading}
          barcodeError={barcodeError}
          setBarcodeError={setBarcodeError}
          barcodeRef={barcodeRef}
          onBarcodeEnter={handleBarcodeEnter}
          onOpenSearchModal={() => setShowProductModal(true)}
          onOpenQuickProduct={() => {
            setMissingBarcode('');
            setShowQuickProduct(true);
          }}
        />

        <PurchaseCartTable
          cart={cart}
          lastQtyRef={lastQtyRef}
          barcodeRef={barcodeRef}
          allowPriceChange={allowPriceChange}
          allowDiscountTypeSwitch={allowDiscountTypeSwitch}
          itemNetTotal={itemNetTotal}
          updateField={updateField}
          updatePermanentSellingRate={updatePermanentSellingRate}
          removeItem={removeItem}
          changeVariant={changeVariant}
          onToggleDiscountType={toggleDiscountType}
        />
      </div>

      {/* RIGHT: one panel — supplier, payment and totals scroll; the action is pinned. */}
      <aside className="w-full lg:w-[340px] shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-[var(--shadow-xs)] overflow-hidden min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-150 dark:divide-gray-700">
          <PurchaseSupplierSection
            supplier={supplier}
            setSupplier={setSupplier}
            refNo={refNo}
            setRefNo={setRefNo}
            onOpenQuickSupplier={() => setShowQuickSupplier(true)}
          />

          <PurchasePaymentSection
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
          />
        </div>

        <PurchaseTotalsSection
          supplier={supplier}
          invoiceDiscount={invoiceDiscount}
          invoiceTax={invoiceTax}
          invoiceExpenses={invoiceExpenses}
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
          editing={editId !== null}
          saving={saving || editLoading}
          cartLength={cart.length}
          grandTotal={grandTotal}
          hasDraft={hasDraft}
        />
      </aside>

      {/* Quick Supplier Add Modal */}
      <QuickSupplierAdd
        open={showQuickSupplier}
        onClose={() => setShowQuickSupplier(false)}
        onCreated={s => {
          setSupplier(s);
          setShowQuickSupplier(false);
        }}
      />

      {/* Quick Product Add Modal */}
      <QuickProductAdd
        open={showQuickProduct}
        initialBarcode={missingBarcode}
        onClose={() => {
          setShowQuickProduct(false);
          setMissingBarcode('');
          setTimeout(() => barcodeRef.current?.focus(), 30);
        }}
        onCreated={(_prod, variant) => {
          addProduct(variant);
          setShowQuickProduct(false);
          setMissingBarcode('');
        }}
      />
    </div>
  );
}

