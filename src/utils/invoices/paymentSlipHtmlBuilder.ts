/**
 * paymentSlipHtmlBuilder.ts
 *
 * Builds the HTML for a customer payment receipt or a supplier payment voucher.
 * Rendered off-screen and captured as a PNG, exactly like the sale invoice, so
 * both documents share one typographic system (see ./receiptTheme).
 */

import {
    receiptBaseCss,
    escHtml,
    fmtAmount,
    fmtDateTime,
    amountInWords,
} from './receiptTheme';

export interface PaymentSlipConfig {
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessNTN?: string;
    /** Width in px — 576 for 80mm, 384 for 58mm */
    printWidthPx: number;
    logoBase64?: string;
    /** Optional custom note printed above the footer */
    invoiceNote?: string;
}

export interface PaymentSlipData {
    /** Big inverted title, e.g. "PAYMENT RECEIPT" */
    docTitle: string;
    /** e.g. "Receipt #" / "Voucher #" */
    docNoLabel: string;
    docNo: string;
    date: string | Date;

    /** "Customer" / "Supplier" */
    partyLabel: string;
    partyName: string;
    partyPhone?: string | null;
    partyAddress?: string | null;

    /** "Amount Received" / "Amount Paid" */
    amountLabel: string;
    amount: number;

    /** Payment mode / account name */
    accountName?: string | null;
    /** e.g. "RECEIVED" | "SENT" */
    paymentType?: string | null;
    note?: string | null;

    previousBalance: number;
    newBalance: number;

    /** Left signature caption, e.g. "Received By" */
    signLeft: string;
    /** Right signature caption, e.g. "Authorised Signature" */
    signRight: string;

    footerLine: string;
}

export function buildPaymentSlipHtml(
    data: PaymentSlipData,
    config: PaymentSlipConfig,
): string {
    const w = config.printWidthPx;

    const logoHtml = config.logoBase64
        ? `<img src="data:image/png;base64,${config.logoBase64}" class="logo" alt="logo"/>`
        : '';

    const metaRows = [
        row(data.docNoLabel, escHtml(data.docNo), true),
        row('Date', fmtDateTime(data.date), true),
        row(data.partyLabel, escHtml(data.partyName)),
    ];
    if (data.partyPhone) metaRows.push(row('Phone', escHtml(data.partyPhone), true));
    if (data.partyAddress) metaRows.push(row('Address', escHtml(data.partyAddress)));
    if (data.accountName) metaRows.push(row('Paid Via', escHtml(data.accountName)));
    if (data.paymentType) metaRows.push(row('Type', escHtml(data.paymentType)));

    const prev = data.previousBalance;
    const closing = data.newBalance;
    const closingLabel = closing < 0 ? 'Advance Balance' : 'Balance Due';

    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    ${receiptBaseCss(w)}

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

    .note {
      font-size: 0.88rem;
      font-weight: 600;
      line-height: 1.35;
      padding: 0.3rem 0.05rem 0;
    }

    /* ── Signatures ── */
    .signs { display: flex; gap: 1.2rem; margin-top: 1.6rem; }
    .sign { flex: 1; text-align: center; }
    .sign-line { border-top: 1px solid #000; margin-bottom: 0.18rem; }
    .sign-cap {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
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
    <span class="bar-en">${escHtml(data.docTitle)}</span>
  </div>

  <!-- META -->
  ${metaRows.join('')}

  <!-- AMOUNT -->
  <div class="gt">
    <span class="gt-l">${escHtml(data.amountLabel)}</span>
    <span class="gt-v"><span class="gt-cur">Rs</span>${fmtAmount(data.amount)}</span>
  </div>

  <div class="words">${escHtml(amountInWords(data.amount))}</div>

  <!-- ACCOUNT POSITION -->
  <div class="box">
    <div class="box-h">Account Summary</div>
    <div class="led"><span class="led-l">Previous Balance</span><span class="led-v">${fmtAmount(prev)}</span></div>
    <div class="led"><span class="led-l">${escHtml(data.amountLabel)}</span><span class="led-v">- ${fmtAmount(data.amount)}</span></div>
    <div class="led led-due">
      <span class="led-l">${closingLabel}</span>
      <span class="led-v">Rs ${fmtAmount(Math.abs(closing))}</span>
    </div>
  </div>

  ${data.note ? `<div class="note"><span class="b">Note:</span> ${escHtml(data.note)}</div>` : ''}

  <!-- SIGNATURES -->
  <div class="signs">
    <div class="sign"><div class="sign-line"></div><div class="sign-cap">${escHtml(data.signLeft)}</div></div>
    <div class="sign"><div class="sign-line"></div><div class="sign-cap">${escHtml(data.signRight)}</div></div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${config.invoiceNote ? `<div class="footer-note">${escHtml(config.invoiceNote)}</div>` : ''}
    <div class="footer-en">${escHtml(data.footerLine)}</div>
    <div class="powered">Powered by AAZify 03007395147</div>
  </div>

</div>
</body>
</html>`;
}

function row(label: string, value: string, mono = false): string {
    return `<div class="kv"><span class="kv-k">${label}</span><span class="kv-v${mono ? ' mono' : ''}">${value}</span></div>`;
}
