/**
 * Composites the FBR logo and a QR code side-by-side into a single base64 PNG image.
 * Layout: [FBR Logo | QR Code]
 */
import QRCode from 'qrcode';
import { FBR_LOGO_BASE64 } from './fbrLogo';

function loadImage(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
    });
}

export async function buildFbrCompositeBase64(fbrId: string, maxWidth = 400): Promise<string> {
    const padding = 8;
    const gap = 12;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(fbrId, {
        width: 160,
        margin: 1,
        errorCorrectionLevel: 'M',
    });

    // Load both images
    const [logoImg, qrImg] = await Promise.all([
        loadImage(FBR_LOGO_BASE64),
        loadImage(qrDataUrl),
    ]);

    // Scale both to fit within maxWidth side by side
    const availableWidth = maxWidth - padding * 2 - gap;
    const logoTargetWidth = Math.floor(availableWidth * 0.55);
    const qrTargetWidth = Math.floor(availableWidth * 0.45);

    const logoScale = Math.min(1, logoTargetWidth / logoImg.width);
    const qrScale = Math.min(1, qrTargetWidth / qrImg.width);

    const logoW = Math.floor(logoImg.width * logoScale);
    const logoH = Math.floor(logoImg.height * logoScale);
    const qrW = Math.floor(qrImg.width * qrScale);
    const qrH = Math.floor(qrImg.height * qrScale);

    const canvasWidth = padding + logoW + gap + qrW + padding;
    const canvasHeight = padding + Math.max(logoH, qrH) + padding;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw logo (vertically centered)
    const logoY = padding + Math.floor((Math.max(logoH, qrH) - logoH) / 2);
    ctx.drawImage(logoImg, padding, logoY, logoW, logoH);

    // Draw QR (vertically centered)
    const qrX = padding + logoW + gap;
    const qrY = padding + Math.floor((Math.max(logoH, qrH) - qrH) / 2);
    ctx.drawImage(qrImg, qrX, qrY, qrW, qrH);

    // Return raw base64 (strip data URL prefix)
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}
