/**
 * Sale Invoice Generator for Thermal Printer
 */
import type { Sale, Customer } from '../../types/pos';
import {
    title, textLeft, textCenter, textRight, line, feed, table, cell, imageFromFile,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';
import { buildFbrCompositeBase64 } from './fbrComposite';

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

export async function buildSaleInvoiceSections(data: SaleInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const sections: PrintSection[] = [];
    const is80mm = config.paperSize === 'Mm80';

    // Logo (if configured)
    if (config.businessLogoPath) {
        sections.push(await imageFromFile(config.businessLogoPath));
    }

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    if (config.businessPhone) sections.push(textCenter(`Tel: ${config.businessPhone}`));
    if (config.businessNTN) sections.push(textCenter(`NTN: ${config.businessNTN}`));
    sections.push(line('-'));

    // Invoice info
    sections.push(textCenter('SALE INVOICE', true));
    sections.push(line('-'));
    sections.push(textLeft(`Invoice: ${data.sale.invoiceNumber ?? `#${data.sale.id}`}`));
    const cashierLabel = data.sale.user?.id ?? (data.sale.userId ? `#${data.sale.userId}` : '');
    sections.push(textLeft(`Date: ${fmtDate(data.sale.createdAt)}`));
    if (cashierLabel) {
        sections.push(textLeft(`Cashier: [${cashierLabel}]`));
    }

    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;

    if (data.customer) {
        sections.push(textLeft(`Customer: ${data.customer.name}`));
        if (data.customer.phone) sections.push(textLeft(`Phone: ${data.customer.phone}`));
    }
    sections.push(line('-'));

    // Items table
    const colWidths = is80mm ? [4, 24, 10, 10] : [3, 15, 7, 7];
    const header = [
        cell('Qty', 'left', true),
        cell('Item', 'left', true),
        cell('Price', 'right', true),
        cell('Total', 'right', true),
    ];
    const body = data.items.map(i => [
        cell(String(i.qty)),
        cell(i.name),
        cell(fmt(i.price), 'right'),
        cell(fmt(i.total), 'right'),
    ]);
    sections.push(table(4, body, colWidths, header));
    sections.push(line('-'));

    // Totals
    const totalsWidth = is80mm ? [30, 18] : [18, 14];
    const totalsBody = [
        [cell('Subtotal:', 'right'), cell(fmt(data.subtotal), 'right')],
    ];
    if (data.discountAmount > 0) {
        totalsBody.push([cell('Discount:', 'right'), cell(`-${fmt(data.discountAmount)}`, 'right')]);
    }
    if (data.taxAmount > 0) {
        totalsBody.push([cell('Tax:', 'right'), cell(fmt(data.taxAmount), 'right')]);
    }
    sections.push(table(2, totalsBody, totalsWidth));
    sections.push(line('='));
    sections.push(textRight(`TOTAL: ${fmt(data.grandTotal)}`, true));
    sections.push(line('='));

    // Payment info
    if (data.sale.payments && data.sale.payments.length > 0) {
        const payments = [...data.sale.payments];
        for (const p of payments) {
            const label = p.account?.name ?? `Account #${p.accountId}`;
            sections.push(textRight(`${label}: ${fmt(p.amount)}`));
        }
        if (data.changeAmount > 0) {
            sections.push(textRight(`Change: ${fmt(data.changeAmount)}`));
        }
    } else {
        sections.push(textRight(`Paid: ${fmt(data.paidAmount)}`));
        if (data.changeAmount > 0) {
            sections.push(textRight(`Change: ${fmt(data.changeAmount)}`));
        }
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

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Thank you for your purchase!'));
    return sections;
}

export async function buildSaleInvoiceJob(data: SaleInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildSaleInvoiceSections(data));
}

export async function printSaleInvoice(data: SaleInvoiceData): Promise<boolean> {
    const job = await buildSaleInvoiceJob(data);
    return printDocument(job);
}
