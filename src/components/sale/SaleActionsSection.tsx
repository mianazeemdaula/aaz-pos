import { Save, Loader2 } from 'lucide-react';
import { fmt } from './types';

interface SaleActionsSectionProps {
  note: string;
  setNote: (val: string) => void;
  onSubmit: () => void;
  saving: boolean;
  cartLength: number;
  isReturnCart: boolean;
  grandTotal: number;
}

export function SaleActionsSection({
  note,
  setNote,
  onSubmit,
  saving,
  cartLength,
  isReturnCart,
  grandTotal,
}: SaleActionsSectionProps) {
  return (
    <>
      {/* Note */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Actions */}
      <div>
        <button
          onClick={onSubmit}
          disabled={saving || !cartLength}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving
            ? 'Saving…'
            : isReturnCart
            ? `Process Return (F7) · ${fmt(Math.abs(grandTotal))}`
            : `Save Sale (F7) · ${fmt(grandTotal)}`}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          F8 Hold &nbsp;&bull;&nbsp; F9 Held &nbsp;&bull;&nbsp; F12 Clear
        </p>
      </div>
    </>
  );
}
