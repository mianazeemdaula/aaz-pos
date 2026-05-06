/**
 * htmlInvoiceRenderer.ts
 *
 * Renders an HTML string to a base64 PNG using html2canvas.
 * Works inside Tauri's WebView (Chromium/WebKit).
 */

import html2canvas from 'html2canvas';

export interface RenderOptions {
    /** Target pixel width — should match your thermal paper width in px */
    widthPx: number;
    /**
     * Device pixel ratio for sharper capture.
     * 2 = retina quality; use 1 for smaller file / faster rendering.
     */
    scale?: number;
}

/**
 * Renders an HTML string to a base64-encoded PNG.
 *
 * @param html   Full HTML document string
 * @param opts   Render options (width, scale)
 * @returns      Base64 PNG string (no "data:image/png;base64," prefix)
 */
export async function renderHtmlToBase64Png(
    html: string,
    opts: RenderOptions,
): Promise<string> {
    const { widthPx, scale = 2 } = opts;

    // 1. Create an iframe off-screen
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: `${widthPx}px`,
        height: '10px',
        border: 'none',
        overflow: 'hidden',
        zIndex: '-1',
    });
    document.body.appendChild(iframe);

    // 2. Write HTML into the iframe
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // 3. Wait for images (fonts are system fonts — no network wait needed)
    await waitForImages(iframeDoc);
    await nextAnimationFrame();

    // 4. Measure actual rendered height and resize iframe
    const body = iframeDoc.body;
    body.style.margin = '0';
    body.style.padding = '0';
    const totalHeight = body.scrollHeight;
    iframe.style.height = `${totalHeight}px`;
    await nextAnimationFrame();

    // 5. Capture with html2canvas
    let base64 = '';
    try {
        const canvas = await html2canvas(body, {
            scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: widthPx,
            height: totalHeight,
            windowWidth: widthPx,
            windowHeight: totalHeight,
            scrollX: 0,
            scrollY: 0,
            logging: false,
        });

        const dataUrl = canvas.toDataURL('image/png');
        base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    } finally {
        // 6. Always clean up
        document.body.removeChild(iframe);
    }

    return base64;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function waitForImages(doc: Document): Promise<void> {
    const images = Array.from(doc.querySelectorAll<HTMLImageElement>('img'));
    if (images.length === 0) return Promise.resolve();

    return Promise.all(
        images.map(
            img =>
                new Promise<void>(resolve => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.addEventListener('load', () => resolve(), { once: true });
                        img.addEventListener('error', () => resolve(), { once: true });
                    }
                }),
        ),
    ).then(() => undefined);
}

function nextAnimationFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}
