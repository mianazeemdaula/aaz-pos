import React from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import type { Account } from '../../types/pos';
import { fmt } from './types';

interface SalePaymentSectionProps {
  accounts: Account[];
  accountAmounts: Record<number, string>;
  setAccountAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  firstAccountRef: React.RefObject<HTMLInputElement | null>;
  invoiceDiscount: number;
  setInvoiceDiscount: (val: number) => void;
  itemDiscountTotal: number;
  taxTotal: number;
  grandTotal: number;
  isReturnCart: boolean;
  paidTotal: number;
  change: number;
  cartLength: number;
  allowCartProfitView?: boolean;
  onOpenProfitModal?: () => void;
}

export function SalePaymentSection({
  accounts,
  accountAmounts,
  setAccountAmounts,
  firstAccountRef,
  invoiceDiscount,
  setInvoiceDiscount,
  itemDiscountTotal,
  taxTotal,
  grandTotal,
  isReturnCart,
  paidTotal,
  change,
  cartLength,
  allowCartProfitView,
  onOpenProfitModal,
}: SalePaymentSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          Payment <span className="normal-case font-normal text-gray-400">(F6)</span>
        </p>
        {allowCartProfitView && cartLength > 0 && onOpenProfitModal && (
          <button
            type="button"
            onClick={onOpenProfitModal}
            title="View Cart Profit Analysis"
            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-md px-1.5 py-0.5 font-medium transition-colors"
          >
            <TrendingUp size={12} />
            <span className="text-[11px]">Profit</span>
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading accounts
        </p>
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
        <span className="text-gray-500 text-sm font-medium">Invoice Discount</span>
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
          <span>Item Discounts</span>
          <span>{fmt(itemDiscountTotal)}</span>
        </div>
      )}
      {taxTotal > 0 && (
        <div className="flex justify-between text-blue-600 text-xs font-medium mt-0.5">
          <span>Tax</span>
          <span>+ {fmt(taxTotal)}</span>
        </div>
      )}

      <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-100 dark:border-gray-700 mt-1">
        <span>{isReturnCart ? 'Refund Amount' : 'Grand Total'}</span>
        <span className={isReturnCart ? 'text-red-600' : ''}>{fmt(Math.abs(grandTotal))}</span>
      </div>

      {cartLength > 0 && (
        <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-0.5 text-xs">
          <div className="flex justify-between font-bold text-sm text-gray-500">
            <span>Total Received</span>
            <span className={paidTotal >= grandTotal - 0.01 ? 'text-green-600 font-medium' : 'text-gray-700'}>
              {fmt(paidTotal)}
            </span>
          </div>
          {change > 0.009 && (
            <div className="flex justify-between text-green-600 font-bold text-sm">
              <span>{isReturnCart ? 'To Refund' : 'Change'}</span>
              <span>{fmt(change)}</span>
            </div>
          )}
          {change < -0.009 && (
            <div className="flex justify-between text-red-500 font-bold text-sm">
              <span>Remaining</span>
              <span>{fmt(-change)}</span>
            </div>
          )}
          {Math.abs(change) <= 0.009 && paidTotal > 0 && (
            <div className="flex justify-between text-green-600 font-bold text-sm">
              <span>Status</span>
              <span>Exact</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
