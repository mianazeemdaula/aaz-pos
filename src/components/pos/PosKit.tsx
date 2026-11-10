import type { ReactNode } from 'react';

/**
 * Shared building blocks for the two till screens (New Sale and Purchase), so
 * the cashier meets one layout, one table and one control language on both.
 */

/** A keyboard shortcut chip. */
export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-[1.125rem] px-1 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 font-sans leading-none ${className}`}
    >
      {children}
    </kbd>
  );
}

/** A labelled section inside the right-hand panel. */
export function PanelSection({
  title,
  hint,
  action,
  children,
  className = '',
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          {title}
          {hint}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** One label/value line in a totals breakdown. */
export function SummaryLine({
  label,
  value,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: 'positive' | 'negative' | 'muted';
}) {
  const valueTone =
    tone === 'positive'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'negative'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-800 dark:text-gray-200';
  return (
    <div className="flex items-center justify-between text-[13px] leading-6">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`tabular-nums font-medium ${valueTone}`}>{value}</span>
    </div>
  );
}

/** Styling shared by the cart tables. */
export const posTable = {
  th: 'sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 px-1.5 h-7 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 whitespace-nowrap',
  td: 'px-1.5 py-0.5 align-middle border-b border-gray-100 dark:border-gray-750 whitespace-nowrap',
  input:
    'w-full px-1.5 border border-gray-250 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tabular-nums outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15',
  select:
    'w-full px-1.5 border border-gray-250 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:border-primary-500',
  removeBtn:
    'w-6 h-6 grid place-items-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors',
};

/** Row background: the latest-scanned line is marked, returns are tinted. */
export function rowTone({ latest, isReturn }: { latest: boolean; isReturn?: boolean }): string {
  if (isReturn) return 'bg-red-50/60 dark:bg-red-500/[0.06]';
  if (latest) return 'bg-primary-50/60 dark:bg-primary-500/[0.07]';
  return 'hover:bg-gray-50 dark:hover:bg-gray-700/30';
}

/** Empty-cart state, shared by both screens. */
export function EmptyCart({ icon, title, shortcuts }: { icon: ReactNode; title: string; shortcuts: [string, string][] }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 grid place-items-center text-gray-400 mb-3">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scan a barcode, or press <Kbd>F5</Kbd> to search products.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5 max-w-md">
        {shortcuts.map(([key, label]) => (
          <span key={key} className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Kbd>{key}</Kbd> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const SHORTCUTS: [string, string][] = [
  ['F2', 'Scan'],
  ['F3', 'Qty'],
  ['F5', 'Search'],
  ['F6', 'Payment'],
  ['F7', 'Save'],
  ['F8', 'Hold'],
  ['F9', 'Held'],
  ['F12', 'Clear'],
];
