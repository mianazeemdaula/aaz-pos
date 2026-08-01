/**
 * Payment Invoice Generator for Thermal Printer
 * Handles both Customer payments (receipt) and Supplier payments (voucher).
 *
 * Primary path renders a styled HTML slip to a PNG (same design system as the
 * sale invoice); the original ESC/POS text mode is kept as the fallback and is
 * used directly when the printer is configured for `native` invoice mode.
 */
import type { Customer, Supplier, CustomerPayment, SupplierPayment } from '../../types/pos';
import {
    textLeft, textCenter, line, feed, table, cell,
    bigCenter, nativeWidth,
    buildPrintJob, printDocument,
    loadThermalConfig,
    type PrintSection, type PrintJobRequest, nativeDefaultWidth,
} from '../thermalPrinter';
import { buildPaymentSlipHtml, type PaymentSlipConfig, type PaymentSlipData } from './paymentSlipHtmlBuilder';
import { renderHtmlToBase64Png } from './htmlInvoiceRenderer';
import { fetchLogoBase64 } from './saleInvoice';
import { showReceiptPreview } from './receiptExport';
import { loadReceiptBusiness, businessHeaderSections } from './businessProfile';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Paper width in pixels for each supported paper size
const PAPER_WIDTH_PX: Record<string, number> = {
    Mm80: 576,
    Mm58: 384,
};

export interface CustomerPaymentInvoiceData {
    payment: CustomerPayment;
    customer: Customer;
}

export interface SupplierPaymentInvoiceData {
    payment: SupplierPayment;
    supplier: Supplier;
}

// ─── Balance resolution ───────────────────────────────────────────────────────

/**
 * A payment reduces what is owed, so when the API did not return the balances
 * alongside the payment we reconstruct them from the party's current balance.
 */
function resolveBalances(
    payment: { amount: number; previousBalance?: number; newBalance?: number },
    currentBalance: number,
): { previousBalance: number; newBalance: number } {
    const newBalance = payment.newBalance ?? currentBalance;
    const previousBalance = payment.previousBalance ?? newBalance + payment.amount;
    return { previousBalance, newBalance };
}

// ─── HTML image pipeline ──────────────────────────────────────────────────────

async function buildSlipConfig(): Promise<PaymentSlipConfig> {
    const config = loadThermalConfig();
    const defaultWidth = PAPER_WIDTH_PX[config.paperSize] ?? 576;
    const widthPx = config.imageWidth || defaultWidth;

    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[PaymentSlip] Failed to fetch company settings from DB', e);
    }

    return {
        businessName: dbCompany.businessName || config.businessName,
        businessAddress: dbCompany.address || config.businessAddress,
        businessPhone: dbCompany.phone || config.businessPhone,
        businessNTN: dbCompany.ntn || config.businessNTN,
        printWidthPx: widthPx,
        logoBase64: await fetchLogoBase64(),
    };
}

/** Renders the slip to the exact PNG that would be sent to the printer. */
async function renderSlipPng(data: PaymentSlipData): Promise<{ base64: string; widthPx: number }> {
    const slipConfig = await buildSlipConfig();
    const html = buildPaymentSlipHtml(data, slipConfig);
    const base64 = await renderHtmlToBase64Png(html, { widthPx: slipConfig.printWidthPx });
    return { base64, widthPx: slipConfig.printWidthPx };
}

async function buildSlipImageSection(data: PaymentSlipData): Promise<PrintSection> {
    const { base64, widthPx } = await renderSlipPng(data);

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

/** Renders the slip and opens it on screen for inspection / download. */
async function exportSlipImage(data: PaymentSlipData): Promise<boolean> {
    const { base64, widthPx } = await renderSlipPng(data);
    const label = `${data.docTitle.toLowerCase().replace(/\s+/g, '-')}-${data.docNo}`;
    await showReceiptPreview(base64, {
        title: `${data.docTitle} — ${data.docNoLabel}${data.docNo}`,
        fileLabel: label,
        widthPx,
    });
    return true;
}

export async function exportCustomerPaymentImage(data: CustomerPaymentInvoiceData): Promise<boolean> {
    return exportSlipImage(customerSlipData(data));
}

export async function exportSupplierPaymentImage(data: SupplierPaymentInvoiceData): Promise<boolean> {
    return exportSlipImage(supplierSlipData(data));
}

function customerSlipData(data: CustomerPaymentInvoiceData): PaymentSlipData {
    const { payment, customer } = data;
    const { previousBalance, newBalance } = resolveBalances(payment, customer.balance);

    return {
        docTitle: 'PAYMENT RECEIPT',
        docNoLabel: 'Receipt #',
        docNo: String(payment.id),
        date: payment.date,
        partyLabel: 'Customer',
        partyName: customer.name,
        partyPhone: customer.phone,
        partyAddress: customer.address,
        amountLabel: 'Amount Received',
        amount: payment.amount,
        accountName: payment.account?.name,
        paymentType: payment.type,
        note: payment.note,
        previousBalance,
        newBalance,
        signLeft: 'Received By',
        signRight: 'Customer Signature',
        footerLine: 'Thank you for your payment!',
    };
}

function supplierSlipData(data: SupplierPaymentInvoiceData): PaymentSlipData {
    const { payment, supplier } = data;
    const { previousBalance, newBalance } = resolveBalances(payment, supplier.balance);

    return {
        docTitle: 'PAYMENT VOUCHER',
        docNoLabel: 'Voucher #',
        docNo: String(payment.id),
        date: payment.date,
        partyLabel: 'Supplier',
        partyName: supplier.name,
        partyPhone: supplier.phone,
        partyAddress: supplier.address,
        amountLabel: 'Amount Paid',
        amount: payment.amount,
        accountName: payment.account?.name,
        paymentType: payment.type,
        note: payment.note,
        previousBalance,
        newBalance,
        signLeft: 'Paid By',
        signRight: 'Supplier Signature',
        footerLine: 'Payment Record',
    };
}

// ─── Native ESC/POS fallback ──────────────────────────────────────────────────

/** Column widths for the two-column native table, scaled to the configured width. */
function nativeColWidths(): number[] {
    const config = loadThermalConfig();
    const is80mm = config.paperSize === 'Mm80';
    const defaultWidth = nativeDefaultWidth(config);
    const width = config.nativeColumns || defaultWidth;

    let colWidths = is80mm ? [32, 16] : [20, 12];
    if (config.nativeColumns) {
        const ratio = width / defaultWidth;
        colWidths = colWidths.map(w => Math.max(1, Math.floor(w * ratio)));
        const diff = width - colWidths.reduce((a, b) => a + b, 0);
        if (diff !== 0) colWidths[0] += diff; // Adjust label column
    }
    return colWidths;
}

export async function buildCustomerPaymentSections(data: CustomerPaymentInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const { payment, customer } = data;
    const sections: PrintSection[] = [];

    // Header — identity comes from the Business Profile in Settings.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, nativeWidth(config)));
    sections.push(line('-'));

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
    const body = [
        [cell('Amount Received:'), cell(fmt(payment.amount), 'right')],
    ];
    if (payment.account) {
        body.push([cell('Account:'), cell(payment.account.name)]);
    }
    sections.push(table(2, body, nativeColWidths()));

    sections.push(line('-'));
    sections.push(bigCenter(`AMOUNT: ${fmt(payment.amount)}`, nativeWidth(config)));
    sections.push(line('-'));

    // Balance
    const { previousBalance, newBalance } = resolveBalances(payment, customer.balance);
    sections.push(textLeft(`Previous Balance: ${fmt(previousBalance)}`));
    sections.push(textLeft(`${newBalance < 0 ? 'Advance Balance' : 'Balance Due'}: ${fmt(Math.abs(newBalance))}`, true));

    if (payment.note) {
        sections.push(textLeft(`Note: ${payment.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Thank you for your payment!'));
    sections.push(feed(3));

    return sections;
}

export async function buildSupplierPaymentSections(data: SupplierPaymentInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const { payment, supplier } = data;
    const sections: PrintSection[] = [];

    // Header — identity comes from the Business Profile in Settings.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, nativeWidth(config)));
    sections.push(line('-'));

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
    const body = [
        [cell('Amount Paid:'), cell(fmt(payment.amount), 'right')],
    ];
    if (payment.account) {
        body.push([cell('Account:'), cell(payment.account.name)]);
    }
    sections.push(table(2, body, nativeColWidths()));

    sections.push(line('-'));
    sections.push(bigCenter(`AMOUNT: ${fmt(payment.amount)}`, nativeWidth(config)));
    sections.push(line('-'));

    // Balance
    const { previousBalance, newBalance } = resolveBalances(payment, supplier.balance);
    sections.push(textLeft(`Previous Balance: ${fmt(previousBalance)}`));
    sections.push(textLeft(`${newBalance < 0 ? 'Advance Balance' : 'Balance Due'}: ${fmt(Math.abs(newBalance))}`, true));

    if (payment.note) {
        sections.push(textLeft(`Note: ${payment.note}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Payment Record'));
    sections.push(feed(3));

    return sections;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildCustomerPaymentJob(data: CustomerPaymentInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildCustomerPaymentSections(data));
}

export async function buildSupplierPaymentJob(data: SupplierPaymentInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildSupplierPaymentSections(data));
}

export async function printCustomerPayment(data: CustomerPaymentInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    if (config.exportInsteadOfPrint) {
        return exportCustomerPaymentImage(data);
    }
    if (config.invoiceMode === 'native') {
        return printDocument(await buildCustomerPaymentJob(data));
    }
    try {
        const section = await buildSlipImageSection(customerSlipData(data));
        return await printDocument(buildPrintJob([section, feed(3)]));
    } catch (err) {
        console.warn('[PaymentSlip] HTML render failed, falling back to text mode:', err);
        return printDocument(await buildCustomerPaymentJob(data));
    }
}

export async function printSupplierPayment(data: SupplierPaymentInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    if (config.exportInsteadOfPrint) {
        return exportSupplierPaymentImage(data);
    }
    if (config.invoiceMode === 'native') {
        return printDocument(await buildSupplierPaymentJob(data));
    }
    try {
        const section = await buildSlipImageSection(supplierSlipData(data));
        return await printDocument(buildPrintJob([section, feed(3)]));
    } catch (err) {
        console.warn('[PaymentSlip] HTML render failed, falling back to text mode:', err);
        return printDocument(await buildSupplierPaymentJob(data));
    }
}
