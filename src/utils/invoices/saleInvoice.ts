/**
 * Sale Invoice Generator for Thermal Printer
 *
 * Uses an HTML → html2canvas → PNG image pipeline for a rich, styled receipt.
 * Falls back to the original ESC/POS text mode if image rendering fails.
 */
import type { Sale, Customer } from '../../types/pos';
import {
    feed,
    buildPrintJob, printDocument,
    loadThermalConfig,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { buildInvoiceHtml, type HtmlInvoiceConfig } from './invoiceHtmlBuilder';
import { renderHtmlToBase64Png } from './htmlInvoiceRenderer';
import { buildSaleInvoiceSections as buildLegacySections } from './saleInvoiceLegacy';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { buildFbrCompositeBase64 } from './fbrComposite';
import { showReceiptPreview } from './receiptExport';
import { invoiceNumberSlug } from './invoiceNumber';

// Paper width in pixels for each supported paper size
const PAPER_WIDTH_PX: Record<string, number> = {
    Mm80: 576,
    Mm58: 384,
};

// Cache logo base64 in memory so we only fetch once per session
let _cachedLogoBase64: string | null | undefined = undefined; // undefined = not yet fetched

export async function fetchLogoBase64(): Promise<string | undefined> {
    if (_cachedLogoBase64 !== undefined) return _cachedLogoBase64 ?? undefined;
    try {
        const res = await apiClient.get<{ base64: string }>(API_ENDPOINTS.settings.logo);
        _cachedLogoBase64 = res.base64 ?? null;
    } catch {
        _cachedLogoBase64 = null;
    }
    return _cachedLogoBase64 ?? undefined;
}

/** Call this after uploading a new logo so the next print picks it up. */
export function invalidateLogoCache(): void {
    _cachedLogoBase64 = undefined;
}

export interface SaleInvoiceData {
    sale: Sale;
    items: { name: string; qty: number; price: number; discount: number; total: number }[];
    customer?: Customer | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    changeAmount: number;
    fbrInvoiceId?: string | null;
    fbrQrUrl?: string | null;
}

// ─── Customer credit resolution ───────────────────────────────────────────────

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Fills in `previousBalance` / `newBalance` on the invoice's customer so the
 * receipt can always print the credit summary.
 *
 * The server balance is authoritative and already reflects this sale, so it is
 * taken as the closing balance and the opening balance is derived from the
 * amount left unpaid on this bill. Falls back to the customer snapshot held in
 * memory (which is pre-sale) if the lookup fails.
 */
async function resolveCustomerBalances(data: SaleInvoiceData): Promise<SaleInvoiceData> {
    const c = data.customer;
    if (!c) return data;
    if (c.previousBalance !== undefined && c.newBalance !== undefined) return data;

    const dueOnThisBill = round2(data.grandTotal - data.paidAmount);

    let newBalance = c.newBalance;
    if (newBalance === undefined) {
        try {
            const fresh = await apiClient.get<Customer>(API_ENDPOINTS.customers.detail(c.id));
            newBalance = fresh.balance;
        } catch (e) {
            console.warn('[SaleInvoice] Could not fetch customer balance, using snapshot', e);
            newBalance = round2((c.balance ?? 0) + dueOnThisBill);
        }
    }

    const previousBalance = c.previousBalance ?? round2(newBalance - dueOnThisBill);

    return { ...data, customer: { ...c, previousBalance, newBalance } };
}

// ─── HTML image pipeline ──────────────────────────────────────────────────────

/**
 * Renders the invoice to the exact PNG that would be sent to the printer.
 * Shared by the print path and the image-export / preview path.
 */
export async function renderSaleInvoicePng(
    input: SaleInvoiceData,
): Promise<{ base64: string; widthPx: number }> {
    const data = await resolveCustomerBalances(input);
    const config = loadThermalConfig();
    const defaultWidth = PAPER_WIDTH_PX[config.paperSize] ?? 560;
    const widthPx = config.imageWidth || defaultWidth;

    const logoBase64 = await fetchLogoBase64();

    // Fetch fresh company settings from DB to get invoiceNote and other business details
    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[SaleInvoice] Failed to fetch company settings from DB', e);
    }

    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;
    let fbrCompositeBase64: string | undefined = undefined;
    if (fbrId) {
        try {
            fbrCompositeBase64 = await buildFbrCompositeBase64(fbrId.toString(), widthPx - 24);
        } catch (e) {
            console.error('[SaleInvoice] Failed to build FBR composite base64', e);
        }
    }

    const htmlConfig: HtmlInvoiceConfig = {
        businessName: dbCompany.businessName || config.businessName,
        businessAddress: dbCompany.address || config.businessAddress,
        businessPhone: dbCompany.phone || config.businessPhone,
        businessNTN: dbCompany.ntn || config.businessNTN,
        printWidthPx: widthPx,
        logoBase64,
        fbrCompositeBase64,
        invoiceNote: dbCompany.invoiceNote,
    };

    const html = buildInvoiceHtml(data, htmlConfig);
    const base64 = await renderHtmlToBase64Png(html, { widthPx });

    return { base64, widthPx };
}

async function buildSaleInvoiceImageSection(input: SaleInvoiceData): Promise<PrintSection> {
    const { base64, widthPx } = await renderSaleInvoicePng(input);

    return {
        Image: {
            data: base64,
            max_width: widthPx,
            align: 'center',
            dithering: false,
            size: 'normal',
        },
    };
}

/**
 * Renders the invoice and opens it on screen for inspection / download instead
 * of printing it. Used by the "export image" test mode and by explicit
 * "preview" actions in the UI.
 */
export async function exportSaleInvoiceImage(input: SaleInvoiceData): Promise<boolean> {
    const { base64, widthPx } = await renderSaleInvoicePng(input);
    const label = invoiceNumberSlug(input.sale);
    await showReceiptPreview(base64, {
        title: `Sale Invoice — ${label}`,
        fileLabel: label,
        widthPx,
    });
    return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildSaleInvoiceSections(data: SaleInvoiceData): Promise<PrintSection[]> {
    const imageSection = await buildSaleInvoiceImageSection(data);
    return [imageSection, feed(3)];
}

export async function buildSaleInvoiceJob(data: SaleInvoiceData): Promise<PrintJobRequest> {
    const imageSection = await buildSaleInvoiceImageSection(data);
    return buildPrintJob([imageSection, feed(3)]);
}

/**
 * Renders and prints the sale invoice as a styled PNG image.
 * Falls back to the legacy ESC/POS text mode if image rendering fails,
 * or immediately uses native mode if configured.
 */
export async function printSaleInvoice(input: SaleInvoiceData): Promise<boolean> {
    const data = await resolveCustomerBalances(input);
    const config = loadThermalConfig();

    // Fetch fresh company settings from DB to get STRN, NTN and invoiceNote
    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[SaleInvoice] Failed to fetch company settings from DB', e);
    }

    const invoiceNote = dbCompany.invoiceNote;

    // Test mode — show the rendered image instead of sending it to the printer.
    if (config.exportInsteadOfPrint) {
        return exportSaleInvoiceImage(data);
    }

    if (config.invoiceMode === 'native') {
        const sections = await buildLegacySections(data, invoiceNote);
        return printDocument(buildPrintJob(sections));
    }
    try {
        const job = await buildSaleInvoiceJob(data);
        return await printDocument(job);
    } catch (err) {
        console.warn('[SaleInvoice] HTML image render failed, falling back to text mode:', err);
        const sections = await buildLegacySections(data, invoiceNote);
        return printDocument(buildPrintJob(sections));
    }
}
