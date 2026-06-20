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

// Paper width in pixels for each supported paper size
const PAPER_WIDTH_PX: Record<string, number> = {
    Mm80: 560,
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

// ─── HTML image pipeline ──────────────────────────────────────────────────────

async function buildSaleInvoiceImageSection(data: SaleInvoiceData): Promise<PrintSection> {
    const config = loadThermalConfig();
    const widthPx = PAPER_WIDTH_PX[config.paperSize] ?? 560;

    const logoBase64 = await fetchLogoBase64();

    const htmlConfig: HtmlInvoiceConfig = {
        businessName: config.businessName,
        businessAddress: config.businessAddress,
        businessPhone: config.businessPhone,
        businessNTN: config.businessNTN,
        printWidthPx: widthPx,
        language: 'both',
        logoBase64,
    };

    const html = buildInvoiceHtml(data, htmlConfig);
    const base64 = await renderHtmlToBase64Png(html, { widthPx, scale: 2 });

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
export async function printSaleInvoice(data: SaleInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    if (config.invoiceMode === 'native') {
        const sections = await buildLegacySections(data);
        return printDocument(buildPrintJob(sections));
    }
    try {
        const job = await buildSaleInvoiceJob(data);
        return await printDocument(job);
    } catch (err) {
        console.warn('[SaleInvoice] HTML image render failed, falling back to text mode:', err);
        const sections = await buildLegacySections(data);
        return printDocument(buildPrintJob(sections));
    }
}
