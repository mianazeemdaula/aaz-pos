/**
 * receiptExport.ts
 *
 * Test / preview harness for the HTML receipt pipeline.
 *
 * When "export instead of print" is enabled in the thermal printer settings, the
 * print functions render exactly the same PNG they would have sent to the
 * printer and hand it to `showReceiptPreview` instead — so a receipt can be
 * checked pixel-for-pixel without paper.
 *
 * Deliberately dependency-free: the overlay is plain DOM (no React, no Tailwind)
 * so it can be opened from anywhere, including deep inside a print utility, and
 * the download uses an `<a download>` blob which works both in the Tauri WebView
 * and in a plain browser without any extra Tauri plugin or capability.
 */

const OVERLAY_ID = 'aaz-receipt-preview-overlay';

function base64ToBlob(base64: string, mime = 'image/png'): Blob {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

/** Builds a filesystem-safe, timestamped file name. */
export function receiptFileName(label: string): string {
    const ts = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', '_')
        .replace(/:/g, '-');
    const safe = label.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
    return `${safe || 'receipt'}_${ts}.png`;
}

/** Saves the rendered receipt PNG to the user's downloads. */
export function downloadReceiptImage(base64: string, fileName: string): void {
    const url = URL.createObjectURL(base64ToBlob(base64));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke late — some WebViews read the blob asynchronously.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface ReceiptPreviewMeta {
    /** Shown in the header, e.g. "Sale Invoice INV-2026-01042" */
    title: string;
    /** Suggested download name without extension, e.g. "sale-invoice-1042" */
    fileLabel: string;
    /** Print width in px, shown alongside the rendered height */
    widthPx: number;
}

/**
 * Shows the rendered receipt in a modal overlay at 1:1 pixel scale, with a
 * download button. Resolves once the overlay is dismissed.
 */
export function showReceiptPreview(base64: string, meta: ReceiptPreviewMeta): Promise<void> {
    // Only one preview at a time.
    document.getElementById(OVERLAY_ID)?.remove();

    return new Promise<void>(resolve => {
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            background: 'rgba(15,23,42,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            font: '13px/1.4 system-ui, "Segoe UI", sans-serif',
        } as CSSStyleDeclaration);

        const panel = document.createElement('div');
        Object.assign(panel.style, {
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
        } as CSSStyleDeclaration);

        // ── Header ──
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
        } as CSSStyleDeclaration);

        const heading = document.createElement('div');
        const h = document.createElement('div');
        h.textContent = meta.title;
        Object.assign(h.style, { fontWeight: '700', color: '#0f172a', fontSize: '14px' } as CSSStyleDeclaration);
        const sub = document.createElement('div');
        sub.textContent = 'Print preview — not sent to the printer';
        Object.assign(sub.style, { color: '#64748b', fontSize: '12px', marginTop: '2px' } as CSSStyleDeclaration);
        heading.append(h, sub);

        const actions = document.createElement('div');
        Object.assign(actions.style, { display: 'flex', gap: '8px' } as CSSStyleDeclaration);

        const btn = (text: string, primary: boolean) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = text;
            Object.assign(b.style, {
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                border: primary ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                background: primary ? '#2563eb' : '#ffffff',
                color: primary ? '#ffffff' : '#334155',
            } as CSSStyleDeclaration);
            return b;
        };

        const downloadBtn = btn('Download PNG', true);
        const closeBtn = btn('Close', false);
        actions.append(downloadBtn, closeBtn);
        header.append(heading, actions);

        // ── Image ──
        const scroller = document.createElement('div');
        Object.assign(scroller.style, {
            overflow: 'auto',
            padding: '20px',
            background: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
        } as CSSStyleDeclaration);

        const img = document.createElement('img');
        img.src = `data:image/png;base64,${base64}`;
        img.alt = meta.title;
        Object.assign(img.style, {
            display: 'block',
            width: `${meta.widthPx}px`,
            height: 'auto',
            background: '#ffffff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            imageRendering: 'pixelated',
        } as CSSStyleDeclaration);
        img.addEventListener('load', () => {
            sub.textContent = `Print preview — ${img.naturalWidth} × ${img.naturalHeight} px · not sent to the printer`;
        });
        scroller.appendChild(img);

        panel.append(header, scroller);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // ── Behaviour ──
        const close = () => {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            resolve();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };

        downloadBtn.addEventListener('click', () =>
            downloadReceiptImage(base64, receiptFileName(meta.fileLabel)),
        );
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', e => {
            if (e.target === overlay) close();
        });
        document.addEventListener('keydown', onKey);
    });
}
