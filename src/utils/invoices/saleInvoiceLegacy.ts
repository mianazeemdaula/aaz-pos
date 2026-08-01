/**
 * Sale Invoice Generator for Thermal Printer
 */
import type { Sale, Customer } from '../../types/pos';
import {
    textLeft, textCenter, textFontA, feed, image, imageFromFile,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest, nativeDefaultWidth, nativeWidthFor,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';
import { buildFbrCompositeBase64 } from './fbrComposite';
import { fetchLogoBase64 } from './saleInvoice';
import { loadReceiptBusiness, businessHeaderSections } from './businessProfile';

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-PK') + ' ' + dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

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

export async function buildSaleInvoiceSections(data: SaleInvoiceData, invoiceNote?: string): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const sections: PrintSection[] = [];
    const is80mm = config.paperSize === 'Mm80';
    const defaultWidth = nativeDefaultWidth(config);
    const width = config.nativeColumns || defaultWidth;

    const printLine = (ch: string) => textLeft(ch.repeat(width));

    // Logo (if configured)
    if (config.businessLogoPath) {
        sections.push(await imageFromFile(config.businessLogoPath, 'center', 203));
    } else {
        const logoBase64 = await fetchLogoBase64();
        if (logoBase64) {
            sections.push(image(logoBase64, 'center', 203));
        }
    }

    // Header — identity comes from the Business Profile in Settings, which the
    // admin edits on the Business Info page and which lives in the database.
    // The name prints large; everything else stays in the compact face.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, width));
    sections.push(printLine('-'));

    // Invoice info
    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;
    sections.push(textCenter('SALES INVOICE', true));
    sections.push(textLeft(`Invoice: ${data.sale.invoiceNumber ?? `#${data.sale.id}`}`));
    sections.push(textLeft(`Date: ${fmtDate(data.sale.createdAt)}`));
    if (data.sale.user) {
        sections.push(textLeft(`Cashier: ${data.sale.user.name}`));
    }
    if (data.customer) {
        sections.push(textLeft(`Customer: ${data.customer.name}`));
        if (data.customer.phone) sections.push(textLeft(`Phone: ${data.customer.phone}`));
    }
    sections.push(printLine('-'));

    // Items table: Qty | Item | Price | Disc | Total.
    //
    // Discount is its own column alongside price, and always present — the
    // original layout swapped Price out for Disc whenever any line was
    // discounted, so a discounted bill never showed unit prices at all.
    // Undiscounted lines print "-" so the column reads as deliberate.
    //
    // Widths scale with the paper so a `nativeColumns` override and 58mm rolls
    // both stay aligned.
    const qtyW = width >= 48 ? 4 : 3;
    const totalW = Math.max(8, Math.round(width * 0.19));
    const priceW = Math.max(6, Math.round(width * 0.15));
    const discW = Math.max(5, Math.round(width * 0.14));
    const itemW = width - qtyW - priceW - discW - totalW;

    const itemRow = (
        qty: string, name: string, price: string, disc: string, total: string,
    ) => formatTextRow([
        { text: qty, width: qtyW, align: 'left' },
        { text: name, width: itemW, align: 'left' },
        { text: price, width: priceW, align: 'right' },
        { text: disc, width: discW, align: 'right' },
        { text: total, width: totalW, align: 'right' },
    ]);

    sections.push(textLeft(itemRow('Qty', 'Item', 'Price', 'Disc', 'Total'), true));
    sections.push(printLine('-'));

    data.items.forEach((item, itemIdx) => {
        // A dotted rule separates one item from the next, so a wrapped name
        // cannot be mistaken for a second item.
        if (itemIdx > 0) sections.push(printLine('.'));

        const nameLines = wrapText(item.name, itemW);
        // An item with an empty name still needs its figures printed.
        if (nameLines.length === 0) nameLines.push('');
        for (let idx = 0; idx < nameLines.length; idx++) {
            const isFirst = idx === 0;
            sections.push(textLeft(itemRow(
                isFirst ? String(item.qty) : '',
                nameLines[idx],
                isFirst ? fmt(item.price) : '',
                isFirst ? (item.discount > 0 ? `-${fmt(item.discount)}` : '-') : '',
                isFirst ? fmt(item.total) : '',
            )));
        }
    });
    sections.push(printLine('-'));

    // Totals
    // Same width as the items Total column so every figure on the slip lands in
    // one right-hand gutter.
    const valWidth = totalW;
    const labelWidth = width - valWidth;
    
    sections.push(textLeft(
        'Subtotal:'.padStart(labelWidth) + fmt(data.subtotal).padStart(valWidth)
    ));
    if (data.discountAmount > 0) {
        sections.push(textLeft(
            'Discount:'.padStart(labelWidth) + `-${fmt(data.discountAmount)}`.padStart(valWidth)
        ));
    }
    if (data.taxAmount > 0) {
        sections.push(textLeft(
            'Tax:'.padStart(labelWidth) + fmt(data.taxAmount).padStart(valWidth)
        ));
    }
    sections.push(printLine('-'));

    // Grand total is the one body line in the large face (Font A), so it must
    // be laid out against Font A's narrower column count — padding it to the
    // Font B width is what pushes it onto a second line.
    const widthA = nativeWidthFor(config, 'A');
    const valWidthA = Math.max(8, Math.round(widthA * 0.19));
    sections.push(textFontA(
        'GRAND TOTAL:'.padStart(widthA - valWidthA) + fmt(data.grandTotal).padStart(valWidthA),
    ));
    sections.push(printLine('-'));

    // Payment info
    if (data.sale.payments && data.sale.payments.length > 0) {
        for (const p of data.sale.payments) {
            const label = (p.account?.name ?? `Account #${p.accountId}`) + ':';
            sections.push(textLeft(
                label.padStart(labelWidth) + fmt(p.amount).padStart(valWidth)
            ));
        }
        if (data.changeAmount > 0) {
            sections.push(textLeft(
                'Change:'.padStart(labelWidth) + fmt(data.changeAmount).padStart(valWidth)
            ));
        }
    } else {
        sections.push(textLeft(
            'Paid:'.padStart(labelWidth) + fmt(data.paidAmount).padStart(valWidth)
        ));
        if (data.changeAmount > 0) {
            sections.push(textLeft(
                'Change:'.padStart(labelWidth) + fmt(data.changeAmount).padStart(valWidth)
            ));
        }
    }

    // Customer credit section — always printed when a customer is on the bill
    if (data.customer) {
        const prev = data.customer.previousBalance ?? 0;
        const closing = data.customer.newBalance ?? prev + (data.grandTotal - data.paidAmount);

        sections.push(printLine('-'));
        sections.push(textCenter('CUSTOMER ACCOUNT', true));
        sections.push(textLeft(
            'Previous Balance:'.padStart(labelWidth) + fmt(prev).padStart(valWidth)
        ));
        sections.push(textLeft(
            'This Invoice:'.padStart(labelWidth) + fmt(data.grandTotal).padStart(valWidth)
        ));
        sections.push(textLeft(
            'Paid Now:'.padStart(labelWidth) + fmt(data.paidAmount).padStart(valWidth)
        ));
        if ((data.customer.creditLimit ?? 0) > 0) {
            sections.push(textLeft(
                'Credit Limit:'.padStart(labelWidth) + fmt(data.customer.creditLimit!).padStart(valWidth)
            ));
        }
        sections.push(printLine('-'));
        sections.push(textLeft(
            (closing < 0 ? 'Advance Balance:' : 'Balance Due:').padStart(labelWidth) +
            fmt(Math.abs(closing)).padStart(valWidth),
            true
        ));
        sections.push(printLine('-'));
    }

    // FBR Section — logo + QR code side-by-side as composite image
    if (fbrId) {
        sections.push(feed(1));
        const compositeBase64 = await buildFbrCompositeBase64(fbrId.toString(), is80mm ? 400 : 300);
        sections.push({
            Image: { data: compositeBase64, max_width: is80mm ? 400 : 300, align: 'center', dithering: false, size: 'normal' },
        });
        sections.push(feed(1));
        sections.push(textCenter(`FBR #: ${fbrId}`, true));
    }

    if (data.sale.note) {
        sections.push(printLine('-'));
        sections.push(textLeft(`Note: ${data.sale.note}`));
    }

    // Footer
    sections.push(printLine('-'));
    if (invoiceNote) {
        sections.push(textCenter(invoiceNote));
        sections.push(printLine('-'));
    }
    sections.push(textCenter('Thank you for your purchase!'));
    sections.push(textCenter('Powered by AAZify 03007395147'));
    sections.push(feed(2));
    return sections;
}

export async function buildSaleInvoiceJob(data: SaleInvoiceData, invoiceNote?: string): Promise<PrintJobRequest> {
    return buildPrintJob(await buildSaleInvoiceSections(data, invoiceNote));
}

export async function printSaleInvoice(data: SaleInvoiceData): Promise<boolean> {
    let dbCompany: Record<string, any> = {};
    try {
        const { apiClient } = await import('../../services/api');
        const { API_ENDPOINTS } = await import('../../config/api');
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch {}
    const job = await buildSaleInvoiceJob(data, dbCompany.invoiceNote);
    return printDocument(job);
}

// ─── Helpers for text wrapping and formatted text rows ────────────────────────

function formatTextRow(cols: { text: string; width: number; align: 'left' | 'right' }[]): string {
    let lineStr = '';
    for (const col of cols) {
        let txt = col.text || '';
        if (txt.length > col.width) {
            txt = txt.substring(0, col.width);
        }
        if (col.align === 'right') {
            lineStr += txt.padStart(col.width);
        } else {
            lineStr += txt.padEnd(col.width);
        }
    }
    return lineStr;
}

function wrapText(str: string, maxLen: number): string[] {
    if (!str) return [];
    const words = str.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
        if (!word) continue;
        if ((currentLine + word).length > maxLen) {
            if (currentLine) {
                lines.push(currentLine.trim());
                currentLine = '';
            }
            let w = word;
            while (w.length > maxLen) {
                lines.push(w.substring(0, maxLen));
                w = w.substring(maxLen);
            }
            currentLine = w + ' ';
        } else {
            currentLine += word + ' ';
        }
    }
    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }
    return lines;
}
