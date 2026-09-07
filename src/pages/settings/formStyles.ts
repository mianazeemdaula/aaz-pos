/**
 * Shared styling for every settings page.
 *
 * These screens are dense forms of short values. Full-size inputs with a
 * paragraph of help under each one pushed most fields below the fold, so the
 * scale here is deliberately compact and longer explanations belong in `title`
 * tooltips rather than permanent vertical space.
 *
 * Every settings page imports from here — that is what keeps the six tabs
 * looking like one screen instead of six.
 */

// ─── Page chrome ────────────────────────────────────────────────────────────

/** Outermost wrapper of a settings page. */
export const pageCls = 'space-y-4';

/** The card a settings section sits in. */
export const cardCls =
  'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-4';

/** Title block at the top of a card. */
export const cardHeaderCls = 'border-b border-gray-200 dark:border-gray-700 pb-2';

export const cardTitleCls =
  'text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2';

/** A divided sub-section within a card. */
export const subSectionCls = 'border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3';

/** Heading of a sub-section. */
export const sectionTitleCls =
  'text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5';

export const sectionNoteCls = 'text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug';

// ─── Fields ─────────────────────────────────────────────────────────────────

export const inputCls =
  'w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors disabled:opacity-50';

export const labelCls = 'block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1';

export const hintCls = 'text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug';

/** Short fields, four across on a wide screen. */
export const gridCls = 'grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2.5';

/** Longer fields (addresses, notes, URLs), two across. */
export const gridWideCls = 'grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-2.5';

export const checkboxCls =
  'h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500';

/** Label text sitting beside a checkbox. */
export const checkboxLabelCls = 'text-xs text-gray-700 dark:text-gray-300 cursor-pointer';

// ─── Buttons ────────────────────────────────────────────────────────────────

const btnBase =
  'font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50';

export const btnPrimaryCls = `px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm ${btnBase}`;

export const btnSecondaryCls = `px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 ${btnBase}`;

export const btnGhostCls = `px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${btnBase}`;

export const btnDangerCls = `px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm ${btnBase}`;

/** Icon size that matches the compact buttons. */
export const BTN_ICON = 13;

/** Icon size for card and section headings. */
export const HEAD_ICON = 16;

// ─── Feedback ───────────────────────────────────────────────────────────────

/** Action bar pinned to the bottom of a card. */
export const actionBarCls =
  'flex items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-700';

/** Inline success / failure pill. */
export const statusPillCls = (ok: boolean): string =>
  `flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border ${
    ok
      ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
  }`;

/** Callout for a note or a warning inside a card. */
export const noticeCls = (tone: 'info' | 'warn' | 'danger' = 'info'): string => {
  const tones = {
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    warn: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  };
  return `flex items-start gap-1.5 px-2.5 py-1.5 border rounded-md text-[11px] leading-snug ${tones[tone]}`;
};
