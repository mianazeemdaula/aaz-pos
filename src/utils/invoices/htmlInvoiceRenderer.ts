/**
 * htmlInvoiceRenderer.ts
 *
 * Renders an HTML string to a base64 PNG using html2canvas.
 * Works inside Tauri's WebView (Chromium/WebKit).
 *
 * Quality pipeline
 * ────────────────
 * A thermal head is 1-bit: every dot is either burnt or not. Rasterising the
 * receipt straight at the printer's dot width leaves each glyph edge covered in
 * grey anti-aliasing pixels, and the printer's own thresholding then turns those
 * into ragged, washed-out strokes.
 *
 * So instead we:
 *   1. rasterise at `supersample`× the target width (sharp, plenty of detail),
 *   2. box-filter it down to exactly the printer's dot width, which converts
 *      that extra detail into accurate edge coverage, and
 *   3. hard-threshold to pure #000 / #fff so the printer has no decision left
 *      to make.
 *
 * The result is crisp stems and clean counters at small point sizes.
 */

import html2canvas from 'html2canvas';

export interface RenderOptions {
    /** Target pixel width — must match the printer's dot width (576 = 80mm) */
    widthPx: number;
    /**
     * Rasterisation factor before downsampling. 3 is the sweet spot for small
     * text; 4 is sharper still but noticeably slower on large receipts.
     */
    supersample?: number;
    /**
     * Luma cut-off (0–255) for the 1-bit conversion. Higher keeps more pixels
     * black, which thickens thin strokes. Pass `null` to skip thresholding and
     * keep an anti-aliased greyscale image.
     */
    threshold?: number | null;
}

/**
 * Renders an HTML string to a base64-encoded PNG at exactly `widthPx`.
 *
 * @returns Base64 PNG string (no "data:image/png;base64," prefix)
 */
export async function renderHtmlToBase64Png(
    html: string,
    opts: RenderOptions,
): Promise<string> {
    const { widthPx, supersample = 3, threshold = 176 } = opts;

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
    const totalHeight = Math.ceil(body.scrollHeight);
    iframe.style.height = `${totalHeight}px`;
    await nextAnimationFrame();

    // 5. Capture supersampled, then reduce to the printer's exact dot grid.
    //    A long receipt at 3× can reach tens of millions of pixels, so step the
    //    factor down rather than risk the WebView refusing to allocate.
    const MAX_PIXELS = 40_000_000;
    let factor = supersample;
    while (factor > 1 && widthPx * totalHeight * factor * factor > MAX_PIXELS) {
        factor -= 1;
    }

    let base64 = '';
    try {
        const hiRes = await html2canvas(body, {
            scale: factor,
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

        const canvas = downsample(hiRes, widthPx, totalHeight);
        if (threshold !== null && threshold !== undefined) {
            binarise(canvas, threshold);
        }

        const dataUrl = canvas.toDataURL('image/png');
        base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    } finally {
        // 6. Always clean up
        document.body.removeChild(iframe);
    }

    return base64;
}

// ─── Image processing ─────────────────────────────────────────────────────────

/** Box-filters the supersampled capture down to the printer's dot grid. */
function downsample(source: HTMLCanvasElement, widthPx: number, heightPx: number): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = widthPx;
    target.height = heightPx;

    const ctx = target.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, widthPx, heightPx);

    return target;
}

/**
 * Collapses the image to pure black and white so the printer has no grey pixels
 * left to guess at.
 */
function binarise(canvas: HTMLCanvasElement, threshold: number): void {
    const ctx = canvas.getContext('2d')!;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
        // Rec. 601 luma, then composite over white using the alpha channel so
        // transparent regions resolve to paper rather than black.
        const a = d[i + 3] / 255;
        const luma = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a);
        const v = luma < threshold ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
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
