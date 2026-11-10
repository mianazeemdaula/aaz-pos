import { Save, Pause, Loader2, CloudCheck } from 'lucide-react';
import { fmt } from './types';
import { Kbd } from '../pos/PosKit';

interface PurchaseActionsSectionProps {
  note: string;
  setNote: (val: string) => void;
  onSubmit: () => void;
  onHold: () => void;
  /** Editing a saved purchase: no hold/held/clear, and the button says Update. */
  editing?: boolean;
  saving: boolean;
  cartLength: number;
  grandTotal: number;
  hasDraft: boolean;
}

/** The pinned footer of the right-hand panel: note, then the one primary action. */
export function PurchaseActionsSection({
  note,
  setNote,
  onSubmit,
  onHold,
  editing = false,
  saving,
  cartLength,
  grandTotal,
  hasDraft,
}: PurchaseActionsSectionProps) {
  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 space-y-1.5 bg-white dark:bg-gray-800">
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note to this purchase…"
        aria-label="Note"
        className="w-full px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
      />

      <div className="flex gap-2">
        {!editing && (
          <button
            type="button"
            onClick={onHold}
            disabled={!cartLength || saving}
            title="Hold this purchase (F8)"
            className="h-11 px-3 inline-flex flex-col items-center justify-center gap-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <Pause size={15} />
            <span className="text-[10px] font-semibold">Hold</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || !cartLength}
          className="flex-1 h-11 px-4 rounded-md bg-primary-600 hover:bg-primary-700 text-white font-semibold flex items-center justify-between gap-3 transition-colors disabled:opacity-50"
        >
          <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : editing ? 'Update Purchase' : 'Save Purchase'}
          </span>
          <span className="min-w-0 truncate text-base tabular-nums">{fmt(grandTotal)}</span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1"><Kbd>F7</Kbd> {editing ? 'Update' : 'Save'}</span>
        {!editing && (
          <>
            <span className="inline-flex items-center gap-1"><Kbd>F8</Kbd> Hold</span>
            <span className="inline-flex items-center gap-1"><Kbd>F9</Kbd> Held</span>
            <span className="inline-flex items-center gap-1"><Kbd>F12</Kbd> Clear</span>
          </>
        )}
        {hasDraft && !editing && (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <CloudCheck size={12} /> Draft saved
          </span>
        )}
      </div>
    </div>
  );
}
