/**
 * Purchase Invoice Generator for Thermal Printer
 */
import type { Purchase, Supplier } from '../../types/pos';
import {
    textLeft, textCenter, line, feed, table, cell,
    bigCenter, nativeWidth,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest, nativeDefaultWidth,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';
import { loadReceiptBusiness, businessHeaderSections } from './businessProfile';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-PK') + ' ' + dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
};

export interface PurchaseInvoiceData {
    purchase: Purchase;
    items: { name: string; qty: number; unitCost: number; discount: number; total: number }[];
    supplier?: Supplier | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    expenses: number;
    grandTotal: number;
    paidAmount: number;
}

export async function buildPurchaseInvoiceSections(data: PurchaseInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const sections: PrintSection[] = [];

    // Header — identity comes from the Business Profile in Settings.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, nativeWidth(config)));
    sections.push(line('-'));

    // Invoice info
    sections.push(textCenter('PURCHASE INVOICE', true));
    sections.push(textLeft(`Invoice: ${data.purchase.invoiceNo ?? `#${data.purchase.id}`}`));
    if (data.purchase.refNumber) sections.push(textLeft(`Ref: ${data.purchase.refNumber}`));
    sections.push(textLeft(`Date: ${fmtDate(data.purchase.date || data.purchase.createdAt)}`));
    if (data.supplier) {
        sections.push(textLeft(`Supplier: ${data.supplier.name}`));
        if (data.supplier.phone) sections.push(textLeft(`Phone: ${data.supplier.phone}`));
    }
    if (data.purchase.account) {
        sections.push(textLeft(`Account: ${data.purchase.account.name}`));
    }
    sections.push(line('-'));

    // Items table
    const is80mm = config.paperSize === 'Mm80';
    const defaultWidth = nativeDefaultWidth(config);
    const width = config.nativeColumns || defaultWidth;
    const ratio = width / defaultWidth;

    // Qty | Item | Cost | Disc | Total. The items carry a per-line discount
    // that the four-column layout silently dropped.
    //
    // Widths are derived from the real column count rather than hardcoded to
    // Font A's 48, which left the table well short of the paper.
    const qtyW = width >= 48 ? 4 : 3;
    const totalW = Math.max(8, Math.round(width * 0.19));
    const costW = Math.max(6, Math.round(width * 0.15));
    const discW = Math.max(5, Math.round(width * 0.14));
    const colWidths = [qtyW, width - qtyW - costW - discW - totalW, costW, discW, totalW];

    const header = [
        cell('Qty', 'left', true),
        cell('Item', 'left', true),
        cell('Cost', 'right', true),
        cell('Disc', 'right', true),
        cell('Total', 'right', true),
    ];
    const body = data.items.map(i => [
        cell(String(i.qty)),
        cell(i.name),
        cell(fmt(i.unitCost), 'right'),
        cell(i.discount > 0 ? `-${fmt(i.discount)}` : '-', 'right'),
        cell(fmt(i.total), 'right'),
    ]);
    sections.push(table(5, body, colWidths, header));
    sections.push(line('-'));

    // Totals
    let totalsWidth = is80mm ? [32, 16] : [20, 12];
    if (config.nativeColumns) {
        totalsWidth = totalsWidth.map(w => Math.max(1, Math.floor(w * ratio)));
        const sum = totalsWidth.reduce((a, b) => a + b, 0);
        const diff = width - sum;
        if (diff !== 0) {
            totalsWidth[0] += diff; // Adjust label column
        }
    }
    const totalsBody = [
        [cell('Subtotal:'), cell(fmt(data.subtotal), 'right')],
    ];
    if (data.discountAmount > 0) {
        totalsBody.push([cell('Discount:'), cell(`-${fmt(data.discountAmount)}`, 'right')]);
    }
    if (data.taxAmount > 0) {
        totalsBody.push([cell('Tax:'), cell(fmt(data.taxAmount), 'right')]);
    }
    if (data.expenses > 0) {
        totalsBody.push([cell('Expenses:'), cell(fmt(data.expenses), 'right')]);
    }
    sections.push(table(2, totalsBody, totalsWidth));
    sections.push(line('-'));
    sections.push(bigCenter(`TOTAL: ${fmt(data.grandTotal)}`, nativeWidth(config)));
    sections.push(line('-'));

    // Payment
    sections.push(textLeft(`Paid: ${fmt(data.paidAmount)}`));
    const balance = data.grandTotal - data.paidAmount;
    if (balance > 0) {
        sections.push(textLeft(`Balance Due: ${fmt(balance)}`));
    }
    if (data.purchase.note) {
        sections.push(line('-'));
        sections.push(textLeft(`Note: ${data.purchase.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Purchase Record'));
    sections.push(feed(3));

    return sections;
}

export async function buildPurchaseInvoiceJob(data: PurchaseInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildPurchaseInvoiceSections(data));
}

export async function printPurchaseInvoice(data: PurchaseInvoiceData): Promise<boolean> {
    const job = await buildPurchaseInvoiceJob(data);
    return printDocument(job);
}
