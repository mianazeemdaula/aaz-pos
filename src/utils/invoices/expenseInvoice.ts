/**
 * Expense Invoice Generator for Thermal Printer
 */
import type { Expense } from '../../types/pos';
import {
    title, textLeft, textCenter, line, feed, table, cell,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface ExpenseInvoiceData {
    expense: Expense;
}

export function buildExpenseInvoiceSections(data: ExpenseInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const { expense } = data;
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    sections.push(line('='));

    // Title
    sections.push(textCenter('EXPENSE VOUCHER', true));
    sections.push(textLeft(`Voucher #${expense.id}`));
    sections.push(textLeft(`Date: ${new Date(expense.date).toLocaleDateString('en-PK')}`));
    sections.push(line('-'));

    // Details
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [32, 16] : [20, 12];

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

    sections.push(line('='));
    sections.push(textCenter(`AMOUNT: ${fmt(expense.amount)}`, true));
    sections.push(line('='));

    if (expense.note) {
        sections.push(textLeft(`Note: ${expense.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Expense Record'));
    sections.push(feed(3));

    return sections;
}

export function buildExpenseInvoiceJob(data: ExpenseInvoiceData): PrintJobRequest {
    return buildPrintJob(buildExpenseInvoiceSections(data));
}

export async function printExpenseInvoice(data: ExpenseInvoiceData): Promise<boolean> {
    const job = buildExpenseInvoiceJob(data);
    return printDocument(job);
}
