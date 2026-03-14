/**
 * Sale Invoice Generator for Thermal Printer
 */
import type { Sale, Customer } from '../../types/pos';
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
}

export function buildSaleInvoiceSections(data: SaleInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    if (config.businessPhone) sections.push(textCenter(`Tel: ${config.businessPhone}`));
    if (config.businessNTN) sections.push(textCenter(`NTN: ${config.businessNTN}`));
    sections.push(line('='));

    // Invoice info
    sections.push(textCenter('SALE INVOICE', true));
    sections.push(textLeft(`Invoice: ${data.sale.invoiceNumber ?? `#${data.sale.id}`}`));
    sections.push(textLeft(`Date: ${fmtDate(data.sale.createdAt)}`));
    if (data.customer) {
        sections.push(textLeft(`Customer: ${data.customer.name}`));
        if (data.customer.phone) sections.push(textLeft(`Phone: ${data.customer.phone}`));
    }
    sections.push(line('='));

    // Items table
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [3, 21, 10, 14] : [3, 13, 7, 9];
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
    sections.push(table(2, totalsBody, totalsWidth));
    sections.push(line('-'));
    sections.push(textCenter(`TOTAL: ${fmt(data.grandTotal)}`, true));
    sections.push(line('-'));

    // Payment info
    if (data.sale.payments && data.sale.payments.length > 0) {
        data.sale.payments.forEach(p => {
            const label = p.account?.name ?? `Account #${p.accountId}`;
            sections.push(textLeft(`${label}: ${fmt(p.amount)}`));
        });
    } else {
        sections.push(textLeft(`Paid: ${fmt(data.paidAmount)}`));
    }
    if (data.changeAmount > 0) {
        sections.push(textLeft(`Change: ${fmt(data.changeAmount)}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Thank you for your purchase!'));
    sections.push(feed(3));

    return sections;
}

export function buildSaleInvoiceJob(data: SaleInvoiceData): PrintJobRequest {
    return buildPrintJob(buildSaleInvoiceSections(data));
}

export async function printSaleInvoice(data: SaleInvoiceData): Promise<boolean> {
    const job = buildSaleInvoiceJob(data);
    return printDocument(job);
}
