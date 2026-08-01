/**
 * Business identity for receipt headers.
 *
 * Every native slip prints the same name / address / phone block at the top.
 * The authoritative copy lives in the Business Profile in Settings (server
 * side); the values stored alongside the printer config are the fallback for
 * when the server is unreachable, which on a POS till must never stop a receipt
 * from printing.
 */
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { headline, textCenter } from '../thermalPrinter';
import type { ThermalPrinterConfig, PrintSection } from '../thermalPrinter';

export interface ReceiptBusiness {
    name: string;
    address?: string;
    phone?: string;
    ntn?: string;
    strn?: string;
    /** Footer line shown under the totals, when configured. */
    invoiceNote?: string;
}

/**
 * Cached for the session: a busy till prints many slips and the profile only
 * changes when someone edits Settings, which calls `invalidateReceiptBusiness`.
 */
let cached: Record<string, unknown> | null = null;
let inFlight: Promise<Record<string, unknown>> | null = null;

async function fetchCompany(): Promise<Record<string, unknown>> {
    if (cached) return cached;
    // Collapse concurrent calls — a multi-slip print would otherwise fire one
    // request per slip.
    if (!inFlight) {
        inFlight = apiClient
            .get<Record<string, unknown>>(API_ENDPOINTS.settings.get)
            .then(res => {
                cached = res ?? {};
                return cached;
            })
            .catch(e => {
                console.warn('[Receipt] Business profile unavailable, using local config', e);
                return {};
            })
            .finally(() => {
                inFlight = null;
            });
    }
    return inFlight;
}

/**
 * The header block every native slip opens with: business name, then address
 * and phone together on one row.
 *
 * Shared so the five slip builders cannot drift apart. Tax numbers are
 * deliberately not printed here — they belong on the FBR block, not the
 * letterhead.
 *
 * The combined contact row falls back to two lines when it would not fit the
 * paper, since a centred line longer than the column count wraps at an
 * arbitrary point and looks like a fault.
 */
export function businessHeaderSections(biz: ReceiptBusiness, width: number): PrintSection[] {
    const sections: PrintSection[] = [headline(biz.name, width)];

    const tel = biz.phone ? `Tel: ${biz.phone}` : undefined;
    const parts = [biz.address, tel].filter((p): p is string => !!p);
    if (parts.length === 0) return sections;

    const oneRow = parts.join('  |  ');
    if (oneRow.length <= width) {
        sections.push(textCenter(oneRow));
    } else {
        for (const part of parts) sections.push(textCenter(part));
    }
    return sections;
}

/** Call after saving Settings so the next slip picks up the new details. */
export function invalidateReceiptBusiness(): void {
    cached = null;
}

const str = (v: unknown): string | undefined => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : undefined;
};

/**
 * Resolve the header block for a receipt: server profile first, printer config
 * second, and a last-resort name so a slip is never headed by an empty line.
 */
export async function loadReceiptBusiness(
    config: ThermalPrinterConfig,
): Promise<ReceiptBusiness> {
    const company = await fetchCompany();

    return {
        name: str(company.businessName) ?? str(config.businessName) ?? 'Aazify POS',
        address: str(company.address) ?? str(config.businessAddress),
        phone: str(company.phone) ?? str(config.businessPhone),
        ntn: str(company.ntn) ?? str(config.businessNTN),
        strn: str(company.strn),
        invoiceNote: str(company.invoiceNote),
    };
}
