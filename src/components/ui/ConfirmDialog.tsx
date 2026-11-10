import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({ open, onConfirm, onCancel, title, message, confirmLabel = 'Confirm', variant = 'default' }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px]" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded-lg shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${variant === 'danger'
            ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>
            <AlertTriangle size={16} />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-150 dark:border-gray-750 rounded-b-lg">
          <button type="button" onClick={onCancel}
            className="h-8 px-3 text-[13px] font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} autoFocus
            className={`h-8 px-3 text-[13px] rounded-md text-white font-semibold ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
