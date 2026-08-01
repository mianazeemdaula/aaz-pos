/**
 * receiptTheme.ts
 *
 * Shared typography / layout system for every HTML-rendered thermal document
 * (sale invoice, payment receipt, payment voucher).
 *
 * Design goals
 *  - Small, dense type. Everything is sized in `rem` off a single root size that
 *    scales with the paper width, so an 80mm and a 58mm receipt keep identical
 *    proportions.
 *  - Pure black on pure white. Thermal heads are 1-bit — grey fills turn to
 *    noise, so emphasis comes from weight, rules and inverted bars instead.
 *  - Windows system fonts only — no network fetch, instant render.
 */

/** Root font size in px for a given print width. 1 CSS px === 1 printer dot. */
export function rootFontPx(widthPx: number): number {
    return widthPx < 450 ? 10 : 13;
}

/** Money: no decimals when the value is whole, 2 decimals otherwise. */
export function fmtAmount(n: number): string {
    const v = Number.isFinite(n) ? n : 0;
    const whole = Math.abs(v % 1) < 0.005;
    return v.toLocaleString('en-PK', {
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: whole ? 0 : 2,
    });
}

export const fmtMoney = (n: number) => `Rs ${fmtAmount(n)}`;

export function fmtDateTime(d: string | Date): string {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return (
        dt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) +
        '  ' +
        dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
    );
}

export function escHtml(str: string): string {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Amount in words (Pakistani numbering: crore / lakh / thousand) ───────────

const ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function under100(n: number): string {
    if (n < 20) return ONES[n];
    const t = TENS[Math.floor(n / 10)];
    const o = ONES[n % 10];
    return o ? `${t} ${o}` : t;
}

function under1000(n: number): string {
    if (n < 100) return under100(n);
    const h = `${ONES[Math.floor(n / 100)]} Hundred`;
    const r = n % 100;
    return r ? `${h} ${under100(r)}` : h;
}

/** "Rupees Twelve Thousand Five Hundred and Fifty Paisa Only" */
export function amountInWords(amount: number): string {
    const abs = Math.abs(amount);
    const rupees = Math.floor(abs + 1e-6);
    const paisa = Math.round((abs - rupees) * 100);

    const groups: string[] = [];
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const rest = rupees % 1000;

    if (crore) groups.push(`${under1000(crore)} Crore`);
    if (lakh) groups.push(`${under1000(lakh)} Lakh`);
    if (thousand) groups.push(`${under1000(thousand)} Thousand`);
    if (rest) groups.push(under1000(rest));

    const sign = amount < 0 ? 'Minus ' : '';
    if (groups.length === 0 && !paisa) return `${sign}Rupees Zero Only`;

    let out = `${sign}Rupees ${groups.join(' ')}`.trim();
    if (paisa) out += ` and ${under100(paisa)} Paisa`;
    return `${out} Only`;
}

// ─── Base stylesheet ──────────────────────────────────────────────────────────

/**
 * Shared CSS for every receipt document. Callers append their own
 * document-specific rules after this block.
 */
export function receiptBaseCss(widthPx: number): string {
    const root = rootFontPx(widthPx);

    return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { font-size: ${root}px; }

    body {
      width: ${widthPx}px;
      background: #ffffff;
      color: #000000;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: 1rem;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page { width: ${widthPx}px; padding: 0.5rem 0.55rem 2.2rem; }

    /* ── Utilities ── */
    .mono { font-family: Consolas, "Courier New", monospace; font-variant-numeric: tabular-nums; }
    .b    { font-weight: 800; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .nowrap { white-space: nowrap; }

    /* ── Rules ── */
    .rule       { border-top: 1px solid #000; margin: 0.4rem 0; }
    .rule-dash  { border-top: 1px dashed #000; margin: 0.4rem 0; }
    .rule-thick { border-top: 2px solid #000; margin: 0.4rem 0; }

    /* ── Business header ── */
    .logo {
      display: block;
      margin: 0 auto 0.35rem;
      width: 5.6rem;
      height: 5.6rem;
      object-fit: contain;
    }
    .biz {
      text-align: center;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .biz-sub {
      text-align: center;
      font-size: 0.9rem;
      font-weight: 600;
      margin-top: 0.12rem;
      line-height: 1.3;
    }
    .biz-id {
      text-align: center;
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.88rem;
      font-weight: 700;
      margin-top: 0.12rem;
      letter-spacing: 0.04em;
    }

    /* ── Inverted title bar ── */
    .bar {
      background: #000000;
      color: #ffffff;
      text-align: center;
      padding: 0.26rem 0.4rem;
      margin: 0.5rem 0 0.45rem;
    }
    .bar-en {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    /* ── Key / value meta rows ── */
    .kv {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 0.6rem;
      font-size: 0.92rem;
      padding: 0.1rem 0.05rem;
    }
    .kv-k { font-weight: 600; white-space: nowrap; }
    .kv-v { font-weight: 800; text-align: right; word-break: break-word; }

    /* ── Bordered block ── */
    .box { border: 2px solid #000; padding: 0.32rem 0.42rem; margin-top: 0.45rem; }
    .box-h {
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 0.2rem;
      margin-bottom: 0.26rem;
    }

    /* ── Grand total / emphasis bar ── */
    .gt {
      background: #000000;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.34rem 0.5rem;
      margin-top: 0.4rem;
    }
    .gt-l {
      font-size: 1.02rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .gt-v {
      font-family: Consolas, "Courier New", monospace;
      font-size: 1.5rem;
      font-weight: 800;
      white-space: nowrap;
    }
    .gt-cur { font-size: 0.95rem; font-weight: 700; margin-right: 0.15rem; }

    /* ── Words line ── */
    .words {
      font-size: 0.85rem;
      font-weight: 600;
      font-style: italic;
      line-height: 1.35;
      padding: 0.3rem 0.05rem 0;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 0.6rem;
      padding-top: 0.4rem;
      border-top: 1px dashed #000;
      text-align: center;
    }
    .footer-note {
      font-size: 0.85rem;
      font-weight: 600;
      font-style: italic;
      line-height: 1.35;
      padding-bottom: 0.3rem;
      margin-bottom: 0.3rem;
      border-bottom: 1px dashed #000;
    }
    .footer-en { font-size: 0.98rem; font-weight: 800; letter-spacing: 0.04em; }
    .powered { font-size: 0.78rem; font-weight: 600; margin-top: 0.5rem; letter-spacing: 0.03em; }
  `;
}

/** `<div class="kv">` row. */
export function kvRow(label: string, value: string, mono = false): string {
    return `<div class="kv"><span class="kv-k">${label}</span><span class="kv-v${mono ? ' mono' : ''}">${value}</span></div>`;
}
