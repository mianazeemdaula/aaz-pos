import { Save, Pause, Loader2 } from 'lucide-react';
import { fmt } from './types';

interface PurchaseActionsSectionProps {
  note: string;
  setNote: (val: string) => void;
  onSubmit: () => void;
  onHold: () => void;
  saving: boolean;
  cartLength: number;
  grandTotal: number;
  hasDraft: boolean;
}

export function PurchaseActionsSection({
  note,
  setNote,
  onSubmit,
  onHold,
  saving,
  cartLength,
  grandTotal,
  hasDraft,
}: PurchaseActionsSectionProps) {
  return (
    <>
      {/* Note */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Note</p>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional note..."
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onSubmit}
          disabled={saving || !cartLength}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : `Save Purchase (F7) · ${fmt(grandTotal)}`}
        </button>
        <button
          onClick={onHold}
          disabled={!cartLength}
          className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 disabled:opacity-40 text-gray-700 dark:text-gray-300 text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Pause size={14} /> Hold (F8)
        </button>
        <p className="text-center text-xs text-gray-400">F9 Held &nbsp;·&nbsp; F12 Clear</p>
      </div>

      {hasDraft && <p className="text-center text-xs text-amber-500">Draft auto-saved</p>}
    </>
  );
}
