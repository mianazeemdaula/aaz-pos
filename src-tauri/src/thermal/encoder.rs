use tiny_skia::Pixmap;
use crate::thermal::models::ThermalPrinterConfig;

pub struct EscPosEncoder;

impl EscPosEncoder {
    /// Convert an anti-aliased RGBA Pixmap into a 1-bit monochrome ESC/POS byte stream.
    pub fn encode_pixmap(pixmap: &Pixmap, config: &ThermalPrinterConfig) -> Vec<u8> {
        let width = pixmap.width() as usize;
        let height = pixmap.height() as usize;

        // Thermal printers require width in full bytes (multiple of 8 bits)
        let bytes_per_row = (width + 7) / 8;
        let mut mono_bits = vec![0u8; bytes_per_row * height];

        let pixels = pixmap.data();

        for y in 0..height {
            let row_offset = y * bytes_per_row;
            for x in 0..width {
                let p_idx = (y * width + x) * 4;
                let r = pixels[p_idx] as u32;
                let g = pixels[p_idx + 1] as u32;
                let b = pixels[p_idx + 2] as u32;
                let a = pixels[p_idx + 3] as u32;

                // Thresholding: high contrast for crisp thermal burn
                // Transparent or white/light gray is paper (0), dark pixel is thermal burn (1)
                let is_black = if a < 128 {
                    false
                } else {
                    let luminance = (299 * r + 587 * g + 114 * b) / 1000;
                    luminance < 170
                };

                if is_black {
                    let byte_idx = row_offset + (x / 8);
                    let bit_mask = 0x80 >> (x % 8);
                    mono_bits[byte_idx] |= bit_mask;
                }
            }
        }

        let mut escpos = Vec::new();

        // 1. Initialize printer
        escpos.extend_from_slice(&[0x1B, 0x40]);

        // 2. Open Cash Drawer if requested (kick before print for immediate drawer release)
        if config.open_cash_drawer.unwrap_or(false) {
            escpos.extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]);
        }

        // 3. Center alignment for raster image
        escpos.extend_from_slice(&[0x1B, 0x61, 0x01]);

        // 4. Send raster image chunks via GS v 0
        // Chunk height max 256 lines to prevent memory overrun on budget thermal receipt printers
        let max_chunk_height = 256;
        let x_l = (bytes_per_row & 0xFF) as u8;
        let x_h = ((bytes_per_row >> 8) & 0xFF) as u8;

        for chunk_start in (0..height).step_by(max_chunk_height) {
            let chunk_h = (height - chunk_start).min(max_chunk_height);
            let y_l = (chunk_h & 0xFF) as u8;
            let y_h = ((chunk_h >> 8) & 0xFF) as u8;

            // GS v 0 m xL xH yL yH
            escpos.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00, x_l, x_h, y_l, y_h]);

            let start_byte = chunk_start * bytes_per_row;
            let end_byte = start_byte + chunk_h * bytes_per_row;
            escpos.extend_from_slice(&mono_bits[start_byte..end_byte]);
        }

        // 5. Line feeds
        let feeds = config.feed_lines.unwrap_or(3);
        for _ in 0..feeds {
            escpos.push(0x0A);
        }

        // 6. Sound buzzer/beep if requested
        if config.beep.unwrap_or(false) {
            escpos.extend_from_slice(&[0x1B, 0x42, 0x02, 0x02]);
        }

        // 7. Cut paper if requested
        if config.cut_paper.unwrap_or(true) {
            // GS V B 0 (Partial cut with feed)
            escpos.extend_from_slice(&[0x1D, 0x56, 0x42, 0x00]);
        }

        escpos
    }
}
