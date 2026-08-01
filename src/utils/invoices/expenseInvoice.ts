/**
 * Expense Invoice Generator for Thermal Printer
 */
import type { Expense } from '../../types/pos';
import {
    textLeft, textCenter, line, feed, table, cell,
    bigCenter, nativeWidth,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest, nativeDefaultWidth,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';
import { loadReceiptBusiness, businessHeaderSections } from './businessProfile';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface ExpenseInvoiceData {
    expense: Expense;
}

export async function buildExpenseInvoiceSections(data: ExpenseInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const { expense } = data;
    const sections: PrintSection[] = [];

    // Header — identity comes from the Business Profile in Settings.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, nativeWidth(config)));
    sections.push(line('-'));

    // Title
    sections.push(textCenter('EXPENSE VOUCHER', true));
    sections.push(textLeft(`Voucher #${expense.id}`));
    sections.push(textLeft(`Date: ${new Date(expense.date).toLocaleDateString('en-PK')}`));
    sections.push(line('-'));

    // Details
    const is80mm = config.paperSize === 'Mm80';
    const defaultWidth = nativeDefaultWidth(config);
    const width = config.nativeColumns || defaultWidth;
    const ratio = width / defaultWidth;

    let colWidths = is80mm ? [32, 16] : [20, 12];
    if (config.nativeColumns) {
        colWidths = colWidths.map(w => Math.max(1, Math.floor(w * ratio)));
        const sum = colWidths.reduce((a, b) => a + b, 0);
        const diff = width - sum;
        if (diff !== 0) {
            colWidths[0] += diff; // Adjust label column
        }
    }

    const body = [
        [cell('Description:'), cell(expense.description)],
    ];
    if (expense.category) {
        body.push([cell('Category:'), cell(expense.category)]);
    }
    if (expense.account) {
        body.push([cell('Account:'), cell(expense.account.name)]);
    }
    if (expense.user) {
        body.push([cell('By:'), cell(expense.user.name)]);
    }
    sections.push(table(2, body, colWidths));

    sections.push(line('-'));
    sections.push(bigCenter(`AMOUNT: ${fmt(expense.amount)}`, nativeWidth(config)));
    sections.push(line('-'));

    if (expense.note) {
        sections.push(textLeft(`Note: ${expense.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Expense Record'));
    sections.push(feed(3));

    return sections;
}

export async function buildExpenseInvoiceJob(data: ExpenseInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildExpenseInvoiceSections(data));
}

export async function printExpenseInvoice(data: ExpenseInvoiceData): Promise<boolean> {
    const job = await buildExpenseInvoiceJob(data);
    return printDocument(job);
}
