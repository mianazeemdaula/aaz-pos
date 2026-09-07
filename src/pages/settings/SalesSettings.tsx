import { useState, useEffect } from 'react';
import {
  Loader2, ShoppingCart, CheckCircle2, AlertCircle, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { SettingsHeader } from './SettingsHeader';
import { AdminOnly } from './AdminOnly';

export function SalesSettings() {
  const { user } = useAuth();
  const { settings: globalSettings, refreshSettings, updateAppSettings } = useGlobalSettings();

  const [appSettings, setAppSettings] = useState<Record<string, unknown>>(globalSettings.app);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAppSettings(globalSettings.app);
  }, [globalSettings.app]);

  if (user?.role !== 'ADMIN') {
    return <AdminOnly />;
  }

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateAppSettings(appSettings);
      await refreshSettings();
      setStatusMsg({ ok: true, text: 'Sales and operational rules updated successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save sales settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAppSettings(globalSettings.app);
    setStatusMsg({ ok: true, text: 'Form fields reset to saved values.' });
  };

  return (
    <div className="space-y-4">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <ShoppingCart className="text-primary-600" size={16} /> Sales & Inventory Operational Rules
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            Set cashier checkout permissions, negative inventory policies, and discount limits.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-below-cost" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Allow Sale Below Cost Price
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Permit cashiers to sell products below weighted average cost price
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-below-cost"
              checked={!!appSettings.allowSaleBelowCost}
              onChange={e => setAppSettings(a => ({ ...a, allowSaleBelowCost: e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-negative-stock" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Allow Negative Inventory Checkout
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Allow sale checkout even if item stock quantity is zero or negative
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-negative-stock"
              checked={!!appSettings.allowNegativeStock}
              onChange={e => setAppSettings(a => ({ ...a, allowNegativeStock: e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-barcode-price" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Show Retail Price on Barcode Stickers
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Include item retail price when generating and printing barcode labels
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-barcode-price"
              checked={appSettings.showBarcodePrice !== false}
              onChange={e => setAppSettings(a => ({ ...a, showBarcodePrice: e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-cart-profit" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Allow Cashiers to View Cart Profit
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Permit non-admin cashiers to see estimated profit and margin icon/modal for items in active cart
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-cart-profit"
              checked={!!appSettings['sale.allowCartProfitView']}
              onChange={e => setAppSettings(a => ({ ...a, 'sale.allowCartProfitView': e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-price-change" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Allow Cashiers to Edit Unit Prices
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Permit non-admin cashiers to override unit price in cart lines
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-price-change"
              checked={appSettings['sale.allowPriceChange'] !== false}
              onChange={e => setAppSettings(a => ({ ...a, 'sale.allowPriceChange': e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-discount-switch" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Allow Cashiers to Switch Discount Type (% / Rs)
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Permit non-admin cashiers to toggle between percentage and fixed rupee discounts
              </span>
            </div>
            <input
              type="checkbox"
              id="rule-discount-switch"
              checked={appSettings['sale.allowDiscountTypeSwitch'] !== false}
              onChange={e => setAppSettings(a => ({ ...a, 'sale.allowDiscountTypeSwitch': e.target.checked }))}
              className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
            <div className="min-w-0">
              <label htmlFor="rule-max-discount" className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer block">
                Max Cashier Discount Limit (%)
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block leading-snug">
                Maximum percentage discount allowed for non-admin cashiers
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                id="rule-max-discount"
                max={100}
                min={0}
                value={(appSettings.maxCashierDiscount as number) ?? 10}
                onChange={e => setAppSettings(a => ({ ...a, maxCashierDiscount: Number(e.target.value) }))}
                className="w-20 text-right px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 outline-none font-semibold"
              />
              <span className="text-xs text-gray-500 font-semibold">%</span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            {statusMsg && (
              <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border ${
                statusMsg.ok
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}>
                {statusMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-md text-xs transition-colors"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>Save Sales Rules</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
