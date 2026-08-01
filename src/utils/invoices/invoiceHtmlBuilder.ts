/**
 * invoiceHtmlBuilder.ts
 * Builds a styled HTML string for the sale invoice.
 * Rendered off-screen and captured as an image via html2canvas.
 *
 * Typography and layout primitives live in ./receiptTheme — everything is sized
 * in `rem` off a width-derived root size, so 80mm and 58mm receipts stay
 * proportional. Small, dense type; pure black on white for a crisp thermal burn.
 *
 * English only — the receipt was previously bilingual, but the interleaved
 * Urdu made every label read as two competing phrases and the Nastaliq script
 * is illegible at thermal resolutions.
 *
 * Uses Windows system fonts — zero network requests, instant rendering:
 *  - Arial / Segoe UI          — labels
 *  - Consolas                  — numbers / IDs
 */

import type { SaleInvoiceData } from './saleInvoice';
import { formatInvoiceNumber } from './invoiceNumber';
import {
    receiptBaseCss,
    escHtml,
    fmtAmount,
    fmtDateTime,
    amountInWords,
} from './receiptTheme';

const fmt = fmtAmount;

// ─── Config ───────────────────────────────────────────────────────────────────

export interface HtmlInvoiceConfig {
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessNTN?: string;
    /** Width in px — 576 for 80mm, 384 for 58mm */
    printWidthPx: number;
    /** Optional base64 logo */
    logoBase64?: string;
    /** Optional base64 FBR composite logo + QR */
    fbrCompositeBase64?: string;
    /** Optional custom invoice note printed at footer */
    invoiceNote?: string;
}

// ─── Label Maps ───────────────────────────────────────────────────────────────

const EN = {
    invoice: 'SALE INVOICE',
    invoiceNo: 'Invoice #',
    date: 'Date',
    cashier: 'Cashier',
    customer: 'Customer',
    phone: 'Phone',
    qty: 'Qty',
    item: 'Description',
    price: 'Rate',
    total: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    grandTotal: 'Total',
    paid: 'Paid',
    change: 'Change',
    fbrLabel: 'FBR Invoice #',
    footer: 'Thank you for your purchase!',
};

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildInvoiceHtml(
    data: SaleInvoiceData,
    config: HtmlInvoiceConfig,
): string {
    const L = EN;
    const w = config.printWidthPx;
    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;

    // ── Discount column — only render if at least one item has a discount ──
    const hasDiscount = data.items.some(i => i.discount > 0);

    // Percentage widths keep the grid identical at 80mm and 58mm.
    const wQty = 8;
    const wDisc = hasDiscount ? 15 : 0;
    const wRate = 17;
    const wAmt = 20;
    const wName = 100 - wQty - wDisc - wRate - wAmt;

    // ── Items rows ──
    const itemRows = data.items
        .map(item => {
            const discCell = hasDiscount
                ? `<td class="right mono">${item.discount > 0 ? fmt(item.discount) : '—'}</td>`
                : '';
            return `
        <tr>
          <td class="center mono">${fmt(item.qty)}</td>
          <td class="iname">${escHtml(item.name)}</td>
          ${discCell}
          <td class="right mono">${fmt(item.price)}</td>
          <td class="right mono b">${fmt(item.total)}</td>
        </tr>`;
        })
        .join('');

    const itemCount = data.items.length;
    const totalQty = data.items.reduce((a, i) => a + (i.qty || 0), 0);

    // ── Totals rows ──
    // With no discount and no tax the subtotal just restates the grand total,
    // so the whole block is dropped rather than printed twice.
    const hasAdjustments = data.discountAmount > 0 || data.taxAmount > 0;
    const totalsRows: string[] = [];
    if (hasAdjustments) {
        totalsRows.push(totalRow(L.subtotal, fmt(data.subtotal)));
        if (data.discountAmount > 0) {
            totalsRows.push(totalRow(L.discount, `- ${fmt(data.discountAmount)}`));
        }
        if (data.taxAmount > 0) {
            totalsRows.push(totalRow(L.tax, fmt(data.taxAmount)));
        }
    }

    // ── Payment rows ──
    // Only caption the group when payments are itemised by account; a single
    // "Paid" line is self-describing and a header above it just reads as a
    // duplicate.
    const itemisedPayments = data.sale.payments ?? [];
    let paymentRows = '';
    let paymentHeader = '';
    if (itemisedPayments.length > 0) {
        paymentHeader = `<div class="group-h">Payment</div>`;
        paymentRows = itemisedPayments
            .map(p => payRow(p.account?.name ?? `Account #${p.accountId}`, fmt(p.amount)))
            .join('');
    } else {
        paymentRows = payRow(L.paid, fmt(data.paidAmount));
    }
    if (data.changeAmount > 0) {
        paymentRows += payRow(L.change, fmt(data.changeAmount));
    }

    // ── Cashier ──
    const cashierLabel =
        data.sale.user?.name ?? data.sale.user?.id ?? (data.sale.userId ? `#${data.sale.userId}` : null);

    // ── FBR section ──
    const fbrSection = fbrId
        ? `
      <div class="box fbr">
        ${config.fbrCompositeBase64 ? `
        <div class="center" style="margin-bottom:0.25rem;">
          <img src="data:image/png;base64,${config.fbrCompositeBase64}" style="max-width:100%;height:auto;" alt="FBR Logo & QR"/>
        </div>` : ''}
        <div class="fbr-label">${L.fbrLabel}</div>
        <div class="fbr-id mono">${escHtml(fbrId.toString())}</div>
      </div>`
        : '';

    // ── Logo ──
    const logoHtml = config.logoBase64
        ? `<img src="data:image/png;base64,${config.logoBase64}" class="logo" alt="logo"/>`
        : '';

    // ── Meta rows ──
    const metaRows: string[] = [
        metaRow(`${L.invoiceNo}`, escHtml(formatInvoiceNumber(data.sale)), true),
        metaRow(`${L.date}`, fmtDateTime(data.sale.createdAt), true),
    ];
    if (cashierLabel) {
        metaRows.push(metaRow(`${L.cashier}`, escHtml(cashierLabel.toString())));
    }
    if (data.customer) {
        metaRows.push(metaRow(`${L.customer}`, escHtml(data.customer.name)));
        if (data.customer.phone) {
            metaRows.push(metaRow(`${L.phone}`, escHtml(data.customer.phone), true));
        }
    }

    // ── Customer credit / ledger block — always shown when a customer is on the bill ──
    const ledgerHtml = data.customer ? buildLedgerBlock(data) : '';

    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    ${receiptBaseCss(w)}

    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; margin-top: 0.15rem; table-layout: fixed; }
    .items thead th {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.22rem 0.18rem;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .items tbody td {
      font-size: 0.94rem;
      font-weight: 600;
      padding: 0.26rem 0.18rem;
      border-bottom: 1px dotted #000;
      vertical-align: top;
      word-break: break-word;
    }
    .items tbody tr:last-child td { border-bottom: 2px solid #000; }
    .iname { font-weight: 700; line-height: 1.22; }

    .items-summary {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.2rem 0.18rem 0;
    }

    /* ── Totals ── */
    .totals { margin-top: 0.3rem; }
    .tot {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.95rem;
      padding: 0.13rem 0.18rem;
    }
    .tot-l { font-weight: 600; }
    .tot-v { font-family: Consolas, "Courier New", monospace; font-weight: 800; }

    /* ── Payments ── */
    .group-h {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0 0.18rem 0.1rem;
    }
    .pay-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.92rem;
      padding: 0.13rem 0.18rem;
    }
    .pay-l { font-weight: 600; }
    .pay-v { font-family: Consolas, "Courier New", monospace; font-weight: 800; }

    /* ── Ledger ── */
    .led {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 0.92rem;
      padding: 0.12rem 0;
    }
    .led-l { font-weight: 600; }
    .led-v { font-family: Consolas, "Courier New", monospace; font-weight: 800; }
    .led-due {
      border-top: 1px solid #000;
      margin-top: 0.22rem;
      padding-top: 0.24rem;
      font-size: 1.02rem;
    }
    .led-due .led-l, .led-due .led-v { font-weight: 800; }
    .led-sub { border-top: 1px dashed #000; margin-top: 0.22rem; padding-top: 0.22rem; }
    .led-tag {
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
      margin-top: 0.24rem;
      border: 1px solid #000;
      padding: 0.14rem;
    }

    /* ── FBR ── */
    .fbr-label {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
    }
    .fbr-id {
      font-size: 0.95rem;
      font-weight: 800;
      text-align: center;
      margin-top: 0.12rem;
      word-break: break-all;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  ${logoHtml}
  <div class="biz">${escHtml(config.businessName)}</div>
  ${config.businessAddress ? `<div class="biz-sub">${escHtml(config.businessAddress)}</div>` : ''}
  ${config.businessPhone ? `<div class="biz-sub">Tel: ${escHtml(config.businessPhone)}</div>` : ''}
  ${config.businessNTN ? `<div class="biz-id">NTN: ${escHtml(config.businessNTN)}</div>` : ''}

  <!-- TITLE -->
  <div class="bar">
    <span class="bar-en">${L.invoice}</span>
  </div>

  <!-- META -->
  ${metaRows.join('')}

  <!-- ITEMS -->
  <table class="items">
    <thead>
      <tr>
        <th class="center" style="width:${wQty}%;">${L.qty}</th>
        <th style="width:${wName}%;text-align:left;">${L.item}</th>
        ${hasDiscount ? `<th class="right" style="width:${wDisc}%;">${L.discount}</th>` : ''}
        <th class="right" style="width:${wRate}%;">${L.price}</th>
        <th class="right" style="width:${wAmt}%;">${L.total}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>
  <div class="items-summary">
    <span>Items: ${itemCount}</span>
    <span>Total Qty: ${fmt(totalQty)}</span>
  </div>

  <!-- TOTALS -->
  ${totalsRows.length ? `<div class="totals">${totalsRows.join('')}</div>` : ''}

  <!-- GRAND TOTAL -->
  <div class="gt">
    <span class="gt-l">
      ${L.grandTotal}
    </span>
    <span class="gt-v"><span class="gt-cur">Rs</span>${fmt(data.grandTotal)}</span>
  </div>

  <div class="words">${escHtml(amountInWords(data.grandTotal))}</div>

  <!-- PAYMENTS -->
  <div class="rule-dash"></div>
  ${paymentHeader}
  ${paymentRows}

  <!-- CUSTOMER CREDIT -->
  ${ledgerHtml}

  <!-- FBR -->
  ${fbrSection}

  <!-- TRANSACTION NOTE -->
  ${data.sale.note ? `<div class="box" style="margin-top:0.25rem;"><div class="box-h">Note / Remarks</div><div style="font-size:0.85rem;font-weight:600;padding:0.1rem 0;">${escHtml(data.sale.note)}</div></div>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    ${config.invoiceNote ? `<div class="footer-note">${escHtml(config.invoiceNote)}</div>` : ''}
    <div class="footer-en">${L.footer}</div>
    <div class="powered">Powered by AAZify 03007395147</div>
  </div>

</div>
</body>
</html>`;
}

// ─── Blocks ───────────────────────────────────────────────────────────────────

/**
 * Customer credit summary. Printed whenever a customer is attached to the sale
 * so the buyer always leaves with their running account position.
 */
function buildLedgerBlock(data: SaleInvoiceData): string {
    const c = data.customer!;
    const prev = c.previousBalance ?? 0;
    const closing = c.newBalance ?? prev + (data.grandTotal - data.paidAmount);
    const creditLimit = c.creditLimit ?? 0;

    // Positive balance = customer owes us; negative = advance held on account.
    const dueLabel = closing > 0 ? 'Balance Due' : closing < 0 ? 'Advance Balance' : 'Balance Due';

    const limitRow =
        creditLimit > 0
            ? `<div class="led led-sub"><span class="led-l">Credit Limit</span><span class="led-v">${fmtAmount(creditLimit)}</span></div>
               <div class="led"><span class="led-l">Available Credit</span><span class="led-v">${fmtAmount(Math.max(0, creditLimit - Math.max(0, closing)))}</span></div>`
            : '';

    const overLimit = creditLimit > 0 && closing > creditLimit
        ? `<div class="led-tag">Credit limit exceeded</div>`
        : '';

    return `
      <div class="box">
        <div class="box-h">Customer Account</div>
        <div class="led"><span class="led-l">Previous Balance</span><span class="led-v">${fmtAmount(prev)}</span></div>
        <div class="led"><span class="led-l">This Invoice</span><span class="led-v">${fmtAmount(data.grandTotal)}</span></div>
        <div class="led"><span class="led-l">Paid Now</span><span class="led-v">- ${fmtAmount(data.paidAmount)}</span></div>
        <div class="led led-due">
          <span class="led-l">${dueLabel}</span>
          <span class="led-v">Rs ${fmtAmount(Math.abs(closing))}</span>
        </div>
        ${limitRow}
        ${overLimit}
      </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function metaRow(label: string, value: string, mono = false): string {
    return `<div class="kv"><span class="kv-k">${label}</span><span class="kv-v${mono ? ' mono' : ''}">${value}</span></div>`;
}

function totalRow(label: string, value: string): string {
    return `
    <div class="tot">
      <span class="tot-l">${label}</span>
      <span class="tot-v">${value}</span>
    </div>`;
}

function payRow(label: string, value: string): string {
    return `
    <div class="pay-row">
      <span class="pay-l">${label}</span>
      <span class="pay-v">Rs ${value}</span>
    </div>`;
}
