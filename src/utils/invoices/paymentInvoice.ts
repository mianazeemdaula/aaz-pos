/**
 * Payment Invoice Generator for Thermal Printer
 * Handles both Customer and Supplier payments
 */
import type { Customer, Supplier, CustomerPayment, SupplierPayment } from '../../types/pos';
import {
    title, textLeft, textCenter, line, feed, table, cell,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface CustomerPaymentInvoiceData {
    payment: CustomerPayment;
    customer: Customer;
}

export interface SupplierPaymentInvoiceData {
    payment: SupplierPayment;
    supplier: Supplier;
}

export function buildCustomerPaymentSections(data: CustomerPaymentInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const { payment, customer } = data;
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    if (config.businessPhone) sections.push(textCenter(`Tel: ${config.businessPhone}`));
    sections.push(line('='));

    // Title
    sections.push(textCenter('PAYMENT RECEIPT', true));
    sections.push(textLeft(`Receipt #${payment.id}`));
    sections.push(textLeft(`Date: ${new Date(payment.date).toLocaleDateString('en-PK')}`));
    sections.push(line('-'));

    // Customer info
    sections.push(textLeft(`Customer: ${customer.name}`));
    if (customer.phone) sections.push(textLeft(`Phone: ${customer.phone}`));
    sections.push(line('-'));

    // Payment details
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [32, 16] : [20, 12];
    const body = [
        [cell('Amount Received:'), cell(fmt(payment.amount), 'right')],
    ];
    if (payment.account) {
        body.push([cell('Account:'), cell(payment.account.name)]);
    }
    sections.push(table(2, body, colWidths));

    sections.push(line('='));
    sections.push(textCenter(`AMOUNT: ${fmt(payment.amount)}`, true));
    sections.push(line('='));

    // Balance
    sections.push(textLeft(`Previous Balance: ${fmt(customer.balance + payment.amount)}`));
    sections.push(textLeft(`Current Balance: ${fmt(customer.balance)}`));

    if (payment.note) {
        sections.push(textLeft(`Note: ${payment.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Thank you for your payment!'));
    sections.push(feed(3));

    return sections;
}

export function buildSupplierPaymentSections(data: SupplierPaymentInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const { payment, supplier } = data;
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    if (config.businessPhone) sections.push(textCenter(`Tel: ${config.businessPhone}`));
    sections.push(line('='));

    // Title
    sections.push(textCenter('PAYMENT VOUCHER', true));
    sections.push(textLeft(`Voucher #${payment.id}`));
    sections.push(textLeft(`Date: ${new Date(payment.date).toLocaleDateString('en-PK')}`));
    sections.push(line('-'));

    // Supplier info
    sections.push(textLeft(`Supplier: ${supplier.name}`));
    if (supplier.phone) sections.push(textLeft(`Phone: ${supplier.phone}`));
    sections.push(line('-'));

    // Payment details
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [32, 16] : [20, 12];
    const body = [
        [cell('Amount Paid:'), cell(fmt(payment.amount), 'right')],
    ];
    if (payment.account) {
        body.push([cell('Account:'), cell(payment.account.name)]);
    }
    sections.push(table(2, body, colWidths));

    sections.push(line('='));
    sections.push(textCenter(`AMOUNT: ${fmt(payment.amount)}`, true));
    sections.push(line('='));

    // Balance
    sections.push(textLeft(`Previous Balance: ${fmt(supplier.balance + payment.amount)}`));
    sections.push(textLeft(`Current Balance: ${fmt(supplier.balance)}`));

    if (payment.note) {
        sections.push(textLeft(`Note: ${payment.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Payment Record'));
    sections.push(feed(3));

    return sections;
}

export function buildCustomerPaymentJob(data: CustomerPaymentInvoiceData): PrintJobRequest {
    return buildPrintJob(buildCustomerPaymentSections(data));
}

export function buildSupplierPaymentJob(data: SupplierPaymentInvoiceData): PrintJobRequest {
    return buildPrintJob(buildSupplierPaymentSections(data));
}

export async function printCustomerPayment(data: CustomerPaymentInvoiceData): Promise<boolean> {
    return printDocument(buildCustomerPaymentJob(data));
}

export async function printSupplierPayment(data: SupplierPaymentInvoiceData): Promise<boolean> {
    return printDocument(buildSupplierPaymentJob(data));
}
