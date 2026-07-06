/**
 * invoiceHtmlBuilder.ts
 * Builds a styled HTML string for the sale invoice.
 * Rendered off-screen and captured as an image via html2canvas.
 *
 * Uses Windows system fonts — zero network requests, instant rendering:
 *  - "Segoe UI"               — UI labels      (Windows 7+ built-in)
 *  - "Consolas"               — numbers / IDs  (Windows 7+ built-in)
 *  - "Noto Nastaliq Urdu"     — Urdu text      (Windows 8.1+ built-in)
 *  - "Jameel Noori Nastaleeq" — Urdu fallback  (Windows 7+)
 */

import type { SaleInvoiceData } from './saleInvoice';

const fmt = (n: number) =>
    n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (d: string) => {
    const dt = new Date(d);
    return (
        dt.toLocaleDateString('en-PK') +
        '  ' +
        dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    );
};

// ─── Config ───────────────────────────────────────────────────────────────────

export interface HtmlInvoiceConfig {
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessNTN?: string;
    /** Width in px — 560 for 80mm, 384 for 58mm */
    printWidthPx: number;
    /** Optional base64 logo */
    logoBase64?: string;
    /** Optional base64 FBR composite logo + QR */
    fbrCompositeBase64?: string;
    /** Language mode for the footer / labels */
    language?: 'en' | 'ur' | 'both';
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
    item: 'Item / Description',
    price: 'Unit Price',
    total: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    grandTotal: 'GRAND TOTAL',
    paid: 'Paid',
    change: 'Change',
    fbrLabel: 'FBR Invoice #',
    footer: 'Thank you for your purchase!',
};

const UR = {
    invoice: 'سیل انوائس',
    invoiceNo: 'انوائس نمبر',
    date: 'تاریخ',
    cashier: 'کیشئر',
    customer: 'گاہک',
    phone: 'فون',
    qty: 'مقدار',
    item: 'اشیاء',
    price: 'قیمت',
    total: 'کل',
    subtotal: 'ذیلی کل',
    discount: 'رعایت',
    tax: 'ٹیکس',
    grandTotal: 'کل رقم',
    paid: 'ادا کردہ',
    change: 'واپسی',
    fbrLabel: 'ایف بی آر',
    footer: '!خریداری کا شکریہ',
};

function getLabels(lang: 'en' | 'ur' | 'both') {
    if (lang === 'ur') return UR;
    return EN; // both: EN primary
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildInvoiceHtml(
    data: SaleInvoiceData,
    config: HtmlInvoiceConfig,
): string {
    const lang = config.language ?? 'en';
    const L = getLabels(lang);
    const showUrdu = lang === 'ur' || lang === 'both';
    const w = config.printWidthPx;
    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;

    // ── Discount column — only render if at least one item has a discount ──
    const hasDiscount = data.items.some(i => i.discount > 0);
    const discColWidth = w < 450 ? 48 : 60;
    const priceColWidth = w < 450 ? 60 : 72;
    const totalColWidth = w < 450 ? 60 : 72;

    // ── Items rows ──
    const itemRows = data.items
        .map((item, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f5f5f5';
            const discCell = hasDiscount
                ? `<td class="td-right mono">${item.discount > 0 ? fmt(item.discount) : ''}</td>`
                : '';
            return `
        <tr style="background:${rowBg};">
          <td class="td-center mono">${item.qty}</td>
          <td class="td-left item-name">${escHtml(item.name)}</td>
          ${discCell}
          <td class="td-right mono">${fmt(item.price)}</td>
          <td class="td-right mono bold">${fmt(item.total)}</td>
        </tr>`;
        })
        .join('');

    // ── Totals rows ──
    const totalsRows: string[] = [];
    totalsRows.push(totalRow(L.subtotal, showUrdu ? UR.subtotal : '', fmt(data.subtotal)));
    if (data.discountAmount > 0) {
        totalsRows.push(totalRow(L.discount, showUrdu ? UR.discount : '', `-${fmt(data.discountAmount)}`, '#c0392b'));
    }
    if (data.taxAmount > 0) {
        totalsRows.push(totalRow(L.tax, showUrdu ? UR.tax : '', fmt(data.taxAmount)));
    }

    // ── Payment rows ──
    let paymentRows = '';
    if (data.sale.payments && data.sale.payments.length > 0) {
        paymentRows = data.sale.payments
            .map(p => {
                const label = p.account?.name ?? `Account #${p.accountId}`;
                return payRow(label, fmt(p.amount));
            })
            .join('');
    } else {
        paymentRows = payRow(showUrdu ? `${L.paid} / ${UR.paid}` : L.paid, fmt(data.paidAmount));
    }
    if (data.changeAmount > 0) {
        paymentRows += payRow(showUrdu ? `${L.change} / ${UR.change}` : L.change, fmt(data.changeAmount), '#15803d');
    }

    // ── Cashier ──
    const cashierLabel =
        data.sale.user?.id ?? (data.sale.userId ? `#${data.sale.userId}` : null);

    // ── FBR section ──
    const fbrSection = fbrId
        ? `
      <div class="fbr-section">
        ${config.fbrCompositeBase64 ? `
        <div style="text-align: center; margin-bottom: 8px;">
          <img src="data:image/png;base64,${config.fbrCompositeBase64}" style="max-width: 100%; height: auto;" alt="FBR Logo & QR"/>
        </div>` : ''}
        <div class="fbr-label">${L.fbrLabel}</div>
        <div class="fbr-id mono">${escHtml(fbrId.toString())}</div>
      </div>`
        : '';

    // ── Logo ──
    const logoHtml = config.logoBase64
        ? `<img src="data:image/png;base64,${config.logoBase64}" class="logo" alt="logo"/>`
        : '';

    // ── Urdu subtitle ──
    const urduTitle = showUrdu
        ? `<span class="urdu-title" dir="rtl">${UR.invoice}</span>`
        : '';

    // ── Customer block ──
    const customerBlock =
        data.customer
            ? `
        <tr>
          <td class="meta-label">${L.customer}${showUrdu ? ` / ${UR.customer}` : ''}</td>
          <td class="meta-value">${escHtml(data.customer.name)}</td>
        </tr>
        ${data.customer.phone
                ? `<tr>
                <td class="meta-label">${L.phone}${showUrdu ? ` / ${UR.phone}` : ''}</td>
                <td class="meta-value mono">${escHtml(data.customer.phone)}</td>
               </tr>`
                : ''
            }`
            : '';

    // ── Table header cells ──
    const discTh = hasDiscount
        ? `<th class="td-right" style="width:${discColWidth}px;">${L.discount}</th>`
        : '';

    // ── Ledger Balance Block ──
    const showLedger = data.customer && 
        (data.customer.previousBalance !== undefined || data.customer.newBalance !== undefined) &&
        (data.customer.previousBalance !== 0 || data.customer.newBalance !== 0 || data.paidAmount < data.grandTotal);

    const ledgerHtml = showLedger
        ? `
      <div class="ledger-block">
        <div style="text-align: center; font-weight: bold; font-size: 11px; color: #475569; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Ledger Summary</div>
        <div class="ledger-row">
          <span class="ledger-label">Previous Balance:</span>
          <span class="ledger-value">Rs ${fmt(data.customer?.previousBalance ?? 0)}</span>
        </div>
        <div class="ledger-row">
          <span class="ledger-label">This Bill:</span>
          <span class="ledger-value">Rs ${fmt(data.grandTotal)}</span>
        </div>
        <div class="ledger-row">
          <span class="ledger-label">Paid Amount:</span>
          <span class="ledger-value">Rs ${fmt(data.paidAmount)}</span>
        </div>
        <div class="ledger-row ledger-total-row">
          <span class="ledger-label" style="font-weight: 700;">Remaining Balance:</span>
          <span class="ledger-value" style="font-weight: 700; color: #0f172a;">Rs ${fmt(data.customer?.newBalance ?? 0)}</span>
        </div>
      </div>`
        : '';

    return `<!DOCTYPE html>
<html lang="${lang === 'ur' ? 'ur' : 'en'}" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    /* ── System font stacks — zero network, instant render ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: ${w}px;
      background: #ffffff;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 17px;
      color: #000000;
      -webkit-print-color-adjust: exact;
      line-height: 1.35;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: none;
      font-smoothing: none;
      text-rendering: optimizeLegibility;
    }

    .page {
      width: ${w}px;
      padding: 10px 8px 30px;
      background: #ffffff;
    }

    /* ── Font helpers ── */
    .mono  { font-family: Consolas, "Courier New", monospace; }
    .bold  { font-weight: 800; }
    .urdu  { font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Traditional Arabic", serif; direction: rtl; }

    /* ── Header — light background ── */
    .header {
      text-align: center;
      padding: 12px 12px 10px;
      border-bottom: 2.5px solid #000000;
      margin-bottom: 12px;
    }
    .logo {
      display: block;
      margin: 0 auto 8px;
      width: 110px;
      height: 110px;
      object-fit: contain;
    }
    .biz-name {
      font-size: 23px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .biz-sub {
      font-size: 15px;
      font-weight: 600;
      color: #000000;
      margin-top: 4px;
      line-height: 1.45;
    }
    .biz-ntn {
      font-size: 15px;
      color: #000000;
      margin-top: 4px;
      font-family: Consolas, monospace;
      font-weight: 700;
    }

    /* ── Invoice title ── */
    .title-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      margin-bottom: 10px;
      border-bottom: 1.5px solid #000000;
    }
    .en-title {
      font-size: 19px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .urdu-title {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      font-size: 20px;
      font-weight: 700;
      color: #000000;
      direction: rtl;
    }

    /* ── Meta table ── */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border: 1.5px solid #000000;
      border-radius: 4px;
    }
    .meta-table tr:not(:last-child) td {
      border-bottom: 1.5px solid #000000;
    }
    .meta-label {
      font-size: 15px;
      color: #000000;
      font-weight: 600;
      padding: 6px 10px;
      width: 45%;
      white-space: nowrap;
    }
    .meta-value {
      font-size: 16px;
      color: #000000;
      font-weight: 750;
      padding: 6px 10px;
      text-align: right;
    }

    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1.5px dashed #000000;
      margin: 10px 0;
    }

    /* ── Items table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
    }
    .items-table thead tr {
      background: #f1f5f9;
    }
    .items-table thead th {
      padding: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #000000;
      border-bottom: 2px solid #000000;
    }
    .items-table tbody td {
      padding: 8px;
      font-size: 16px;
      font-weight: 600;
      border-bottom: 1.5px solid #000000;
      vertical-align: middle;
      color: #000000;
    }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .item-name { font-weight: 700; }
    .td-left   { text-align: left; }
    .td-right  { text-align: right; }
    .td-center { text-align: center; }

    /* ── Totals ── */
    .totals-block {
      margin-top: 10px;
      border: 1.5px solid #000000;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 10px;
      border-bottom: 1.5px solid #000000;
    }
    .total-row:last-child { border-bottom: none; }
    .total-label {
      font-size: 16px;
      font-weight: 600;
      color: #000000;
    }
    .total-label .urdu-label {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      font-size: 15px;
      color: #000000;
      margin-right: 4px;
    }
    .total-value {
      font-family: Consolas, "Courier New", monospace;
      font-size: 16px;
      font-weight: 800;
      color: #000000;
    }

    /* ── Grand Total — no dark background ── */
    .grand-total-box {
      border: 2.5px solid #000000;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .grand-total-label {
      font-size: 19px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .urdu-gt {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      font-size: 17px;
      margin-right: 6px;
      direction: rtl;
      color: #000000;
      font-weight: 700;
    }
    .grand-total-amount {
      font-family: Consolas, "Courier New", monospace;
      font-size: 28px;
      font-weight: 800;
      color: #000000;
      letter-spacing: 1px;
    }
    .currency-sym {
      font-size: 18px;
      color: #000000;
      margin-right: 3px;
      font-weight: 700;
    }

    /* ── Payments ── */
    .payments-block {
      margin-top: 10px;
      border: 1.5px solid #000000;
      padding: 4px 0;
    }
    .pay-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      font-size: 16px;
      color: #000000;
    }
    .pay-label { color: #000000; font-weight: 600; }
    .pay-value { font-family: Consolas, "Courier New", monospace; font-weight: 800; }

    /* ── FBR ── */
    .fbr-section {
      margin-top: 12px;
      border: 2px solid #000000;
      padding: 8px 10px;
      background: #ffffff;
      text-align: center;
    }
    .fbr-label {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #000000;
    }
    .fbr-id {
      font-size: 16px;
      font-weight: 750;
      color: #000000;
      margin-top: 4px;
      word-break: break-all;
      font-family: Consolas, monospace;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 16px;
      text-align: center;
      padding-top: 12px;
      border-top: 1.5px dashed #000000;
    }
    .footer-en {
      font-size: 16px;
      font-weight: 700;
      color: #000000;
    }
    .footer-ur {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      font-size: 18px;
      color: #000000;
      font-weight: 700;
      margin-top: 4px;
      direction: rtl;
    }
    .powered {
      font-size: 13px;
      color: #000000;
      font-weight: 600;
      margin-top: 10px;
    }
    /* ── Ledger Balance ── */
    .ledger-block {
      margin-top: 10px;
      border: 1.5px solid #000000;
      padding: 6px 0;
      background: #ffffff;
    }
    .ledger-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 15px;
      color: #000000;
    }
    .ledger-label { color: #000000; font-weight: 600; }
    .ledger-value { font-family: Consolas, "Courier New", monospace; font-weight: 800; color: #000000; }
    .ledger-total-row {
      border-top: 1.5px dashed #000000;
      margin-top: 5px;
      padding-top: 6px;
      font-weight: 800;
      font-size: 16px;
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    ${logoHtml}
    <div class="biz-name">${escHtml(config.businessName)}</div>
    ${config.businessAddress ? `<div class="biz-sub">${escHtml(config.businessAddress)}</div>` : ''}
    ${config.businessPhone ? `<div class="biz-sub">Tel: ${escHtml(config.businessPhone)}</div>` : ''}
    ${config.businessNTN ? `<div class="biz-ntn">NTN: ${escHtml(config.businessNTN)}</div>` : ''}
  </div>

  <!-- TITLE -->
  <div class="title-row">
    <span class="en-title">${L.invoice}</span>
    ${urduTitle}
  </div>

  <!-- META INFO -->
  <table class="meta-table">
    <tr>
      <td class="meta-label">${L.invoiceNo}${showUrdu ? ` / ${UR.invoiceNo}` : ''}</td>
      <td class="meta-value mono">${escHtml(data.sale.invoiceNumber ?? `#${data.sale.id}`)}</td>
    </tr>
    <tr>
      <td class="meta-label">${L.date}${showUrdu ? ` / ${UR.date}` : ''}</td>
      <td class="meta-value mono">${fmtDate(data.sale.createdAt)}</td>
    </tr>
    ${cashierLabel
            ? `<tr>
            <td class="meta-label">${L.cashier}${showUrdu ? ` / ${UR.cashier}` : ''}</td>
            <td class="meta-value mono">[${escHtml(cashierLabel.toString())}]</td>
           </tr>`
            : ''
        }
    ${customerBlock}
  </table>

  <!-- ITEMS TABLE -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="td-center" style="width:30px;">${L.qty}</th>
        <th class="td-left">${L.item}</th>
        ${discTh}
        <th class="td-right" style="width:${priceColWidth}px;">${L.price}</th>
        <th class="td-right" style="width:${totalColWidth}px;">${L.total}</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals-block">
    ${totalsRows.join('')}
  </div>

  <!-- GRAND TOTAL -->
  <div class="grand-total-box">
    <span class="grand-total-label">
      ${showUrdu ? `<span class="urdu-gt">${UR.grandTotal}</span>` : ''}
      ${L.grandTotal}
    </span>
    <span class="grand-total-amount">
      <span class="currency-sym">Rs</span>${fmt(data.grandTotal)}
    </span>
  </div>

  <!-- PAYMENTS -->
  <div class="payments-block" style="margin-top:10px;">
    ${paymentRows}
  </div>

  ${ledgerHtml}

  <!-- FBR -->
  ${fbrSection}

  <!-- FOOTER -->
  <div class="footer">
    ${config.invoiceNote ? `<div class="invoice-note" style="margin-bottom: 8px; font-size: 13px; font-weight: 500; color: #1e293b; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; font-style: italic;">${escHtml(config.invoiceNote)}</div>` : ''}
    <div class="footer-en">${L.footer}</div>
    ${showUrdu ? `<div class="footer-ur">${UR.footer}</div>` : ''}
    <div class="powered">Powered by AAZify 03007395147</div>
  </div>

</div>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function totalRow(enLabel: string, urLabel: string, value: string, color?: string): string {
    const urSpan = urLabel ? `<span class="urdu-label">${urLabel} /</span>` : '';
    return `
    <div class="total-row">
      <span class="total-label">${urSpan}${enLabel}</span>
      <span class="total-value mono" style="${color ? `color:${color};` : ''}">${value}</span>
    </div>`;
}

function payRow(label: string, value: string, color?: string): string {
    return `
    <div class="pay-row">
      <span class="pay-label">${label}</span>
      <span class="pay-value" style="${color ? `color:${color};` : ''}">Rs ${value}</span>
    </div>`;
}
