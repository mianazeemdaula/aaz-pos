import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { Account, Supplier } from '../../types/pos';
import { fmt } from './types';
import { Kbd, PanelSection, SummaryLine } from '../pos/PosKit';

interface PurchasePaymentSectionProps {
  accounts: Account[];
  accountAmounts: Record<number, string>;
  setAccountAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  firstAccountRef: React.RefObject<HTMLInputElement | null>;
  invoiceDiscount: number;
  setInvoiceDiscount: (val: number) => void;
  invoiceTax: number;
  setInvoiceTax: (val: number) => void;
  invoiceExpenses: number;
  setInvoiceExpenses: (val: number) => void;
}

const amountInput =
  'pos-amount w-32 px-2.5 text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tabular-nums outline-none';

function AmountRow({
  label,
  value,
  onChange,
  inputRef,
  placeholder = '0.00',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate">{label}</span>
      <input
        ref={inputRef}
        type="number"
        value={value}
        min={0}
        step="0.01"
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={amountInput}
      />
    </label>
  );
}

export function PurchasePaymentSection({
  accounts,
  accountAmounts,
  setAccountAmounts,
  firstAccountRef,
  invoiceDiscount,
  setInvoiceDiscount,
  invoiceTax,
  setInvoiceTax,
  invoiceExpenses,
  setInvoiceExpenses,
}: PurchasePaymentSectionProps) {
  const toAmount = (v: string) => Math.max(0, parseFloat(v) || 0);

  return (
    <>
      <PanelSection title="Payment" hint={<Kbd>F6</Kbd>}>
        {accounts.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Loading accounts
          </p>
        ) : (
          <div className="space-y-1">
            {accounts.map((account, idx) => (
              <AmountRow
                key={account.id}
                label={account.name}
                value={accountAmounts[account.id] ?? ''}
                inputRef={idx === 0 ? firstAccountRef : undefined}
                onChange={v => setAccountAmounts(prev => ({ ...prev, [account.id]: v }))}
              />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Bill adjustments">
        <div className="space-y-1">
          <AmountRow label="Invoice discount" value={invoiceDiscount === 0 ? '' : invoiceDiscount} onChange={v => setInvoiceDiscount(toAmount(v))} />
          <AmountRow label="Invoice tax" value={invoiceTax === 0 ? '' : invoiceTax} onChange={v => setInvoiceTax(toAmount(v))} />
          <AmountRow label="Invoice expenses" value={invoiceExpenses === 0 ? '' : invoiceExpenses} onChange={v => setInvoiceExpenses(toAmount(v))} />
        </div>
      </PanelSection>

    </>
  );
}

interface PurchaseTotalsSectionProps {
  supplier: Supplier | null;
  invoiceDiscount: number;
  invoiceTax: number;
  invoiceExpenses: number;
  itemDiscountTotal: number;
  grandTotal: number;
  paidTotal: number;
  balance: number;
  cartLength: number;
}

/**
 * The bill total and settlement status. Rendered outside the scrolling part of
 * the panel so the total stays on screen however many adjustments are open.
 */
export function PurchaseTotalsSection({
  supplier,
  invoiceDiscount,
  invoiceTax,
  invoiceExpenses,
  itemDiscountTotal,
  grandTotal,
  paidTotal,
  balance,
  cartLength,
}: PurchaseTotalsSectionProps) {
  return (
    <section className="shrink-0 px-3 py-2 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
      {itemDiscountTotal > 0 && <SummaryLine label="Item discounts" value={`− ${fmt(itemDiscountTotal)}`} tone="positive" />}
      {invoiceDiscount > 0 && <SummaryLine label="Invoice discount" value={`− ${fmt(invoiceDiscount)}`} tone="positive" />}
      {invoiceTax > 0 && <SummaryLine label="Invoice tax" value={`+ ${fmt(invoiceTax)}`} />}
      {invoiceExpenses > 0 && <SummaryLine label="Invoice expenses" value={`+ ${fmt(invoiceExpenses)}`} />}

      <div className="flex items-end justify-between gap-2 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Bill total</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums leading-none text-gray-900 dark:text-gray-50">
          {fmt(grandTotal)}
        </span>
      </div>

      {cartLength > 0 && paidTotal > 0 && (
        <div className="mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
          <SummaryLine label="Paid" value={fmt(paidTotal)} />
          {supplier && balance > 0.009 && <SummaryLine label="Overpaid" value={fmt(balance)} tone="negative" />}
          {supplier && balance < -0.009 && <SummaryLine label="Remaining" value={fmt(-balance)} tone="negative" />}
          {!supplier && balance > 0.009 && <SummaryLine label="Exceeds total" value={fmt(balance)} tone="negative" />}
          {Math.abs(balance) <= 0.009 && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 size={13} /> Paid in full
            </p>
          )}
        </div>
      )}
    </section>
  );
}
