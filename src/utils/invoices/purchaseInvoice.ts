/**
 * Purchase Invoice Generator for Thermal Printer
 */
import type { Purchase, Supplier } from '../../types/pos';
import {
    title, textLeft, textCenter, line, feed, table, cell,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
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

export function buildPurchaseInvoiceSections(data: PurchaseInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    if (config.businessPhone) sections.push(textCenter(`Tel: ${config.businessPhone}`));
    sections.push(line('='));

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
    sections.push(line('='));

    // Items table
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [3, 21, 10, 14] : [3, 13, 7, 9];
    const header = [
        cell('Qty', 'left', true),
        cell('Item', 'left', true),
        cell('Cost', 'right', true),
        cell('Total', 'right', true),
    ];
    const body = data.items.map(i => [
        cell(String(i.qty)),
        cell(i.name),
        cell(fmt(i.unitCost), 'right'),
        cell(fmt(i.total), 'right'),
    ]);
    sections.push(table(4, body, colWidths, header));
    sections.push(line('='));

    // Totals
    const totalsWidth = is80mm ? [32, 16] : [20, 12];
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
    sections.push(line('='));
    sections.push(textCenter(`TOTAL: ${fmt(data.grandTotal)}`, true));
    sections.push(line('='));

    // Payment
    sections.push(textLeft(`Paid: ${fmt(data.paidAmount)}`));
    const balance = data.grandTotal - data.paidAmount;
    if (balance > 0) {
        sections.push(textLeft(`Balance Due: ${fmt(balance)}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Purchase Record'));
    sections.push(feed(3));

    return sections;
}

export function buildPurchaseInvoiceJob(data: PurchaseInvoiceData): PrintJobRequest {
    return buildPrintJob(buildPurchaseInvoiceSections(data));
}

export async function printPurchaseInvoice(data: PurchaseInvoiceData): Promise<boolean> {
    const job = buildPurchaseInvoiceJob(data);
    return printDocument(job);
}
