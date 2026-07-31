import { useEffect } from 'react';
import { TrendingUp, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { CartItem } from './types';
import { computeCartProfit, fmt } from './types';

interface CartProfitModalProps {
  cart: CartItem[];
  invoiceDiscount: number;
  onClose: () => void;
}

export function CartProfitModal({ cart, invoiceDiscount, onClose }: CartProfitModalProps) {
  const summary = computeCartProfit(cart, invoiceDiscount);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh] border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Cart Profit & Cost Analysis</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Itemized breakdown of cost, revenue, and profit margin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-750/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Net Revenue</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">{fmt(summary.totalRevenue)}</p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-750/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Cost</p>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">{fmt(summary.totalCost)}</p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-750/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Invoice Disc.</p>
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{fmt(invoiceDiscount)}</p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                summary.profit >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <p
                  className={`text-[11px] font-semibold uppercase ${
                    summary.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  Est. Net Profit
                </p>
                {summary.profit >= 0 ? (
                  <ArrowUpRight size={14} className="text-emerald-600" />
                ) : (
                  <ArrowDownRight size={14} className="text-red-600" />
                )}
              </div>
              <p
                className={`text-base font-bold mt-0.5 ${
                  summary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {fmt(summary.profit)}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{summary.margin.toFixed(1)}% margin</p>
            </div>
          </div>

          {/* Itemized Profit Breakdown Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-medium uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-2 py-2.5 text-center">Qty</th>
                  <th className="px-2 py-2.5 text-right">Unit Cost</th>
                  <th className="px-2 py-2.5 text-right">Unit Price</th>
                  <th className="px-2 py-2.5 text-right">Total Cost</th>
                  <th className="px-2 py-2.5 text-right">Net Revenue</th>
                  <th className="px-3 py-2.5 text-right">Profit</th>
                  <th className="px-2 py-2.5 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {summary.items.map((detail, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{detail.item.product.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {detail.item.variant.name}{' '}
                        {detail.item.variant.factor > 1 ? `(×${detail.item.variant.factor})` : ''}
                      </p>
                    </td>
                    <td className="px-2 py-2.5 text-center font-medium text-gray-700 dark:text-gray-300">
                      {detail.item.qty}
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-500 dark:text-gray-400">
                      {detail.unitCost.toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-gray-700 dark:text-gray-300">
                      {detail.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                      {fmt(detail.totalCost)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-gray-900 dark:text-gray-100">
                      {fmt(detail.netRevenue)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-bold ${
                        detail.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {fmt(detail.profit)}
                    </td>
                    <td
                      className={`px-2 py-2.5 text-right font-semibold text-[11px] ${
                        detail.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {detail.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {summary.items.length} item{summary.items.length !== 1 ? 's' : ''} in active cart
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
