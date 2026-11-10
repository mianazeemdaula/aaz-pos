import React from 'react';
import { Loader2, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { Account } from '../../types/pos';
import { fmt } from './types';
import { Kbd, PanelSection, SummaryLine } from '../pos/PosKit';

interface SalePaymentSectionProps {
  accounts: Account[];
  accountAmounts: Record<number, string>;
  setAccountAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  firstAccountRef: React.RefObject<HTMLInputElement | null>;
  invoiceDiscount: number;
  setInvoiceDiscount: (val: number) => void;
  /** Largest invoice discount this cashier may apply. `null` = no limit. */
  maxInvoiceDiscount?: number | null;
  isReturnCart: boolean;
  cartLength: number;
  allowCartProfitView?: boolean;
  onOpenProfitModal?: () => void;
}

const amountInput =
  'pos-amount w-32 px-2.5 text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tabular-nums outline-none';

export function SalePaymentSection({
  accounts,
  accountAmounts,
  setAccountAmounts,
  firstAccountRef,
  invoiceDiscount,
  setInvoiceDiscount,
  maxInvoiceDiscount = null,
  isReturnCart,
  cartLength,
  allowCartProfitView,
  onOpenProfitModal,
}: SalePaymentSectionProps) {
  return (
    <>
      <PanelSection
        title={isReturnCart ? 'Refund from' : 'Payment'}
        hint={<Kbd>F6</Kbd>}
        action={
          allowCartProfitView &&
          onOpenProfitModal && (
            <button
              type="button"
              onClick={onOpenProfitModal}
              disabled={cartLength === 0}
              title={cartLength === 0 ? 'Add items to cart to view profit analysis' : 'View cart profit analysis'}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-40 disabled:pointer-events-none"
            >
              <TrendingUp size={12} /> Profit
            </button>
          )
        }
      >
        {accounts.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Loading accounts
          </p>
        ) : (
          <div className="space-y-1">
            {accounts.map((account, idx) => (
              <label key={account.id} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate">{account.name}</span>
                <input
                  ref={idx === 0 ? firstAccountRef : undefined}
                  type="number"
                  value={accountAmounts[account.id] ?? ''}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  onChange={e => setAccountAmounts(prev => ({ ...prev, [account.id]: e.target.value }))}
                  className={amountInput}
                />
              </label>
            ))}
          </div>
        )}

        <label className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <span className="text-[13px] text-gray-700 dark:text-gray-300">
            Invoice discount
            {maxInvoiceDiscount !== null && (
              <span className="block text-[10px] text-gray-400">max {fmt(maxInvoiceDiscount)}</span>
            )}
          </span>
          <input
            type="number"
            value={invoiceDiscount === 0 ? '' : invoiceDiscount}
            min={0}
            max={maxInvoiceDiscount ?? undefined}
            step="0.01"
            placeholder="0.00"
            title={maxInvoiceDiscount !== null ? `Your discount limit allows at most ${fmt(maxInvoiceDiscount)}` : undefined}
            onChange={e => {
              const raw = Math.max(0, parseFloat(e.target.value) || 0);
              // Clamped here so the field cannot be nudged past what the API
              // would refuse on submit.
              setInvoiceDiscount(maxInvoiceDiscount === null ? raw : Math.min(maxInvoiceDiscount, raw));
            }}
            className={amountInput}
          />
        </label>
      </PanelSection>

    </>
  );
}

interface SaleTotalsSectionProps {
  itemDiscountTotal: number;
  invoiceDiscount: number;
  taxTotal: number;
  grandTotal: number;
  isReturnCart: boolean;
  paidTotal: number;
  change: number;
  cartLength: number;
}

/**
 * The bill total and settlement status. Rendered outside the scrolling part of
 * the panel so the figure the cashier reads out is always on screen.
 */
export function SaleTotalsSection({
  itemDiscountTotal,
  invoiceDiscount,
  taxTotal,
  grandTotal,
  isReturnCart,
  paidTotal,
  change,
  cartLength,
}: SaleTotalsSectionProps) {
  const exact = Math.abs(change) <= 0.009 && paidTotal > 0;

  return (
    <section className="shrink-0 px-3 py-2 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
      {itemDiscountTotal > 0 && <SummaryLine label="Item discounts" value={`− ${fmt(itemDiscountTotal)}`} tone="positive" />}
      {invoiceDiscount > 0 && <SummaryLine label="Invoice discount" value={`− ${fmt(invoiceDiscount)}`} tone="positive" />}
      {taxTotal > 0 && <SummaryLine label="Tax" value={`+ ${fmt(taxTotal)}`} />}

      <div className="flex items-end justify-between gap-2 pt-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isReturnCart ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {isReturnCart ? 'Refund due' : 'Total payable'}
        </span>
        <span className={`text-2xl font-semibold tracking-tight tabular-nums leading-none ${isReturnCart ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}`}>
          {fmt(Math.abs(grandTotal))}
        </span>
      </div>

      {cartLength > 0 && (
        <div className="mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-700">
          <SummaryLine label={isReturnCart ? 'Refunded' : 'Received'} value={fmt(paidTotal)} />
          {change > 0.009 && (
            <SummaryLine
              label={isReturnCart ? 'Over refund' : 'Change'}
              value={fmt(change)}
              tone={isReturnCart ? 'negative' : 'positive'}
            />
          )}
          {change < -0.009 && (
            <SummaryLine label={isReturnCart ? 'Still to refund' : 'Remaining'} value={fmt(-change)} tone="negative" />
          )}
          {exact && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 size={13} /> Exact amount
            </p>
          )}
        </div>
      )}
    </section>
  );
}
