/**
 * Human-facing invoice numbers: `INV-YYYYMMDD-NNNN`.
 *
 * There is no `invoiceNumber` column on `Sale` — the backend has never
 * populated one, so receipts fell back to a bare `#id`. The number is therefore
 * derived from the sale's own date and id, which keeps it stable (the same sale
 * always formats to the same string, on any till, at any later reprint) without
 * needing a server-side counter.
 */

/** Zero-pad the sequence to four digits, letting it grow past 9999 naturally. */
const pad4 = (n: number): string => String(Math.max(0, Math.trunc(n))).padStart(4, '0');

/**
 * Date part in the *local* timezone.
 *
 * Deliberately not `toISOString()`: that is UTC, so an evening sale in PKT
 * would be stamped with the following day's date and the invoice number would
 * disagree with the date printed beside it.
 */
function yyyymmdd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

export interface InvoiceNumberSource {
    id: number;
    /** Honoured as-is when the server ever starts issuing real numbers. */
    invoiceNumber?: string | null;
    createdAt?: string | Date | null;
}

/**
 * Format a document number, e.g. `INV-20260801-0042`.
 *
 * An explicit `invoiceNumber` from the server wins — a number someone else
 * assigned must never be rewritten by the printer.
 */
export function formatInvoiceNumber(
    source: InvoiceNumberSource,
    prefix = 'INV',
): string {
    const explicit = source.invoiceNumber?.trim();
    if (explicit) return explicit;

    const raw = source.createdAt ? new Date(source.createdAt) : new Date();
    const date = Number.isNaN(raw.getTime()) ? new Date() : raw;

    return `${prefix}-${yyyymmdd(date)}-${pad4(source.id)}`;
}

/** Same string, safe to use as a filename. */
export function invoiceNumberSlug(source: InvoiceNumberSource, prefix = 'INV'): string {
    return formatInvoiceNumber(source, prefix).replace(/[^A-Za-z0-9._-]+/g, '-');
}
