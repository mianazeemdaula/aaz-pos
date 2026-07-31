import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Account, Supplier } from '../../types/pos';
import { fmt } from './types';

interface PurchasePaymentSectionProps {
  supplier: Supplier | null;
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
  itemDiscountTotal: number;
  grandTotal: number;
  paidTotal: number;
  balance: number;
  cartLength: number;
}

export function PurchasePaymentSection({
  supplier,
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
  itemDiscountTotal,
  grandTotal,
  paidTotal,
  balance,
  cartLength,
}: PurchasePaymentSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase">
        Payment <span className="normal-case font-normal text-gray-400">(F6)</span>
      </p>

      {!supplier ? (
        /* No supplier selected: only allow paying exactly the grand total */
        <div className="space-y-1.5">
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle size={12} /> No supplier — full payment only
          </p>
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
        </div>
      ) : accounts.length === 0 ? (
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

      {/* Invoice Discount */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-gray-500 text-xs font-medium">Invoice Discount</span>
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
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-gray-500 text-xs font-medium">Invoice Tax</span>
        <input
          type="number"
          value={invoiceTax === 0 ? '' : invoiceTax}
          min={0}
          step="0.01"
          placeholder="0"
          onChange={e => setInvoiceTax(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-red-500 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-gray-500 text-xs font-medium">Invoice Expenses</span>
        <input
          type="number"
          value={invoiceExpenses === 0 ? '' : invoiceExpenses}
          min={0}
          step="0.01"
          placeholder="0"
          onChange={e => setInvoiceExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-orange-500 py-1 px-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {itemDiscountTotal > 0 && (
        <div className="flex justify-between text-xs text-green-600">
          <span>Item Discounts</span>
          <span>− {fmt(itemDiscountTotal)}</span>
        </div>
      )}
      {invoiceDiscount > 0 && (
        <div className="flex justify-between text-xs text-green-600">
          <span>Invoice Discount</span>
          <span>− {fmt(invoiceDiscount)}</span>
        </div>
      )}
      {invoiceTax > 0 && (
        <div className="flex justify-between text-xs text-red-500">
          <span>Invoice Tax</span>
          <span>+ {fmt(invoiceTax)}</span>
        </div>
      )}
      {invoiceExpenses > 0 && (
        <div className="flex justify-between text-xs text-orange-500">
          <span>Invoice Expenses</span>
          <span>+ {fmt(invoiceExpenses)}</span>
        </div>
      )}

      <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100 pt-1.5 border-t border-gray-100 dark:border-gray-700">
        <span>Grand Total</span>
        <span>{fmt(grandTotal)}</span>
      </div>

      {cartLength > 0 && paidTotal > 0 && (
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between font-bold text-sm text-gray-500">
            <span>Paid</span>
            <span className={paidTotal >= grandTotal - 0.01 ? 'text-green-600 font-medium' : 'text-gray-700'}>
              {fmt(paidTotal)}
            </span>
          </div>
          {supplier && balance > 0.009 && (
            <div className="flex justify-between text-amber-600 font-bold text-sm">
              <span>Overpaid</span>
              <span>{fmt(balance)}</span>
            </div>
          )}
          {supplier && balance < -0.009 && (
            <div className="flex justify-between text-red-500 font-bold text-sm">
              <span>Remaining</span>
              <span>{fmt(-balance)}</span>
            </div>
          )}
          {!supplier && balance > 0.009 && (
            <div className="flex justify-between text-red-500 font-bold text-sm">
              <span>Exceeds Total</span>
              <span>{fmt(balance)}</span>
            </div>
          )}
          {Math.abs(balance) <= 0.009 && (
            <div className="flex justify-between text-green-600 font-bold text-sm">
              <span>Status</span>
              <span>Exact ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
