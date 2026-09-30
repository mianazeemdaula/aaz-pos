use tiny_skia::Pixmap;
use crate::thermal::models::ThermalPrinterConfig;

pub struct EscPosEncoder;

impl EscPosEncoder {
    /// Convert an anti-aliased RGBA Pixmap into 1-bit monochrome pixel bits.
    fn pixmap_to_mono_bits(pixmap: &Pixmap) -> (usize, usize, usize, Vec<u8>) {
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

        (width, height, bytes_per_row, mono_bits)
    }

    /// Determines if the target printer is configured for or detected as Star Line Mode.
    pub fn is_star_printer(config: &ThermalPrinterConfig) -> bool {
        match config.emulation.as_deref() {
            Some("star") => true,
            Some("escpos") => false,
            _ => {
                // Auto-detect based on printer name
                if let Some(name) = &config.printer_name {
                    let lower = name.to_lowercase();
                    lower.contains("star") || lower.contains("tsp")
                } else {
                    false
                }
            }
        }
    }

    /// Convert an anti-aliased RGBA Pixmap into a byte stream (ESC/POS or Star Line Mode).
    pub fn encode_pixmap(pixmap: &Pixmap, config: &ThermalPrinterConfig) -> Vec<u8> {
        let (_width, height, bytes_per_row, mono_bits) = Self::pixmap_to_mono_bits(pixmap);

        if Self::is_star_printer(config) {
            Self::encode_star(&mono_bits, height, bytes_per_row, config)
        } else {
            Self::encode_escpos(&mono_bits, height, bytes_per_row, config)
        }
    }

    /// Standard ESC/POS encoding (for Epson, Black Copper, Smart POS, Xprinter, etc.)
    fn encode_escpos(
        mono_bits: &[u8],
        height: usize,
        bytes_per_row: usize,
        config: &ThermalPrinterConfig,
    ) -> Vec<u8> {
        let mut escpos = Vec::new();

        // 1. Initialize printer: ESC @
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

        // 5. Line feeds at end of content (default 3)
        let feeds = config.feed_lines.unwrap_or(3);
        for _ in 0..feeds {
            escpos.push(0x0A);
        }

        // 6. Sound buzzer/beep if requested
        if config.beep.unwrap_or(false) {
            escpos.extend_from_slice(&[0x1B, 0x42, 0x02, 0x02]);
        }

        // 7. Cut paper:
        // GS V 66 0 (GS V 'B' 0): Feed to cutter position and partial cut.
        // Feeds paper past the cutter blade before cutting, ensuring content is never truncated.
        if config.cut_paper.unwrap_or(true) {
            escpos.extend_from_slice(&[0x1D, 0x56, 0x42, 0x00]);
        }

        escpos
    }

    /// Star Micronics Line Mode / StarPRNT raster encoding
    /// Compatible with Star TSP100, TSP143, TSP650, TSP700II, TSP800, etc.
    fn encode_star(
        mono_bits: &[u8],
        height: usize,
        bytes_per_row: usize,
        config: &ThermalPrinterConfig,
    ) -> Vec<u8> {
        let mut star = Vec::new();

        // 1. Initialize printer: ESC @
        star.extend_from_slice(&[0x1B, 0x40]);

        // 2. Open Cash Drawer if requested (BEL pulse in Star Line Mode)
        if config.open_cash_drawer.unwrap_or(false) {
            star.push(0x07);
        }

        // 3. Initialize and enter Raster Mode: ESC * r R, ESC * r A
        star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x52]); // ESC * r R
        star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x41]); // ESC * r A

        // 4. Set Raster Page Length to Continuous (Roll paper / Receipt mode): ESC * r P 0 NUL
        // Sent inside Raster Mode to prevent Star printers from advancing to a fixed 11-inch boundary!
        star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x50, 0x30, 0x00]);

        // 5. Document cut on EOT setting: ESC * r E n NUL
        // "13" = Cut Feed & Partial Cut (feeds to cutter position and cuts)
        // "1"  = No cut
        if config.cut_paper.unwrap_or(true) {
            star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x45, b'1', b'3', 0x00]);
        } else {
            star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x45, b'1', 0x00]);
        }

        // 6. Send line by line using 'b' (transfer raster data with auto 1-dot line feed)
        // Format: 'b' (0x62) + n1 + n2 + d1...dk where k = n1 + n2*256 = bytes_per_row
        let x_l = (bytes_per_row & 0xFF) as u8;
        let x_h = ((bytes_per_row >> 8) & 0xFF) as u8;

        for y in 0..height {
            let start = y * bytes_per_row;
            let end = start + bytes_per_row;
            star.extend_from_slice(&[0x62, x_l, x_h]);
            star.extend_from_slice(&mono_bits[start..end]);
        }

        // 7. Extra feeds at end of content (default 3 lines)
        // In Star Raster Mode, advance Y dots using ESC * r Y <dots> NUL (24 dots per line at 203 DPI)
        let feeds = config.feed_lines.unwrap_or(3);
        if feeds > 0 {
            let dots = feeds * 24;
            star.extend_from_slice(format!("\x1B*rY{}\0", dots).as_bytes());
        }

        // 8. EOT (0x04): Triggers the EOT action (Cut Feed & Partial Cut configured in step 5)
        // This advances the receipt cleanly past the cutter and cuts without an 11-inch page feed!
        star.push(0x04);

        // 9. Exit Raster Mode: ESC * r B
        star.extend_from_slice(&[0x1B, 0x2A, 0x72, 0x42]);

        // 10. Buzzer / beep if requested (sent in Star Line Mode after exiting raster): ESC BEL 1 1
        if config.beep.unwrap_or(false) {
            star.extend_from_slice(&[0x1B, 0x1E, 0x07, 0x01, 0x01]);
        }

        // 11. Dummy data (128 bytes 0x00) to flush Windows USB print spooler buffer
        star.extend_from_slice(&[0u8; 128]);

        star
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tiny_skia::Color;

    fn make_test_pixmap() -> Pixmap {
        let mut pixmap = Pixmap::new(576, 10).unwrap();
        pixmap.fill(Color::WHITE);
        pixmap
    }

    #[test]
    fn test_auto_detect_star_printer() {
        let config_star = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("Star TSP700II (TSP743II)".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(false),
            feed_lines: Some(3),
            emulation: None,
            logo_scale: None,
        };
        assert!(EscPosEncoder::is_star_printer(&config_star));

        let config_bc = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("BC-85AC".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(false),
            feed_lines: Some(3),
            emulation: None,
            logo_scale: None,
        };
        assert!(!EscPosEncoder::is_star_printer(&config_bc));
    }

    #[test]
    fn test_explicit_emulation_override() {
        let config_force_star = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("Generic Thermal".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(false),
            feed_lines: Some(3),
            emulation: Some("star".to_string()),
            logo_scale: None,
        };
        assert!(EscPosEncoder::is_star_printer(&config_force_star));

        let config_force_escpos = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("Star TSP700II (TSP743II)".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(false),
            feed_lines: Some(3),
            emulation: Some("escpos".to_string()),
            logo_scale: None,
        };
        assert!(!EscPosEncoder::is_star_printer(&config_force_escpos));
    }

    #[test]
    fn test_star_raster_encoding() {
        let pixmap = make_test_pixmap();
        let config = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("Star TSP700II (TSP743II)".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(true),
            feed_lines: Some(2),
            emulation: Some("star".to_string()),
            logo_scale: None,
        };

        let encoded = EscPosEncoder::encode_pixmap(&pixmap, &config);

        // Starts with ESC @ (1B 40)
        assert_eq!(&encoded[0..2], &[0x1B, 0x40]);
        // Drawer kick BEL (07)
        assert_eq!(encoded[2], 0x07);
        // Raster reset ESC * r R (1B 2A 72 52)
        assert_eq!(&encoded[3..7], &[0x1B, 0x2A, 0x72, 0x52]);
        // Enter raster ESC * r A (1B 2A 72 41)
        assert_eq!(&encoded[7..11], &[0x1B, 0x2A, 0x72, 0x41]);
        // Page length continuous ESC * r P 0 NUL (1B 2A 72 50 30 00)
        assert_eq!(&encoded[11..17], &[0x1B, 0x2A, 0x72, 0x50, 0x30, 0x00]);
        // Cut on EOT ESC * r E 1 3 NUL (1B 2A 72 45 31 33 00)
        assert_eq!(&encoded[17..24], &[0x1B, 0x2A, 0x72, 0x45, b'1', b'3', 0x00]);
        // First line command 'b' (62 48 00)
        assert_eq!(&encoded[24..27], &[0x62, 72, 0]);

        // Contains EOT (04) and Quit Raster Mode ESC * r B (1B 2A 72 42)
        assert!(encoded.windows(4).any(|w| w == [0x04, 0x1B, 0x2A, 0x72]));
        assert!(encoded.windows(4).any(|w| w == [0x1B, 0x2A, 0x72, 0x42]));

        // Ends with 128 dummy flush bytes
        assert_eq!(&encoded[encoded.len() - 128..], &[0u8; 128]);
    }

    #[test]
    fn test_escpos_encoding() {
        let pixmap = make_test_pixmap();
        let config = ThermalPrinterConfig {
            connection_type: "USB".to_string(),
            printer_name: Some("BC-85AC".to_string()),
            ip_address: None,
            tcp_port: None,
            paper_size: Some("Mm80".to_string()),
            cut_paper: Some(true),
            beep: Some(false),
            open_cash_drawer: Some(false),
            feed_lines: Some(2),
            emulation: Some("escpos".to_string()),
            logo_scale: None,
        };

        let encoded = EscPosEncoder::encode_pixmap(&pixmap, &config);

        // Starts with ESC @ (1B 40)
        assert_eq!(&encoded[0..2], &[0x1B, 0x40]);
        // Contains GS v 0 (1D 76 30 00)
        assert!(encoded.windows(4).any(|w| w == [0x1D, 0x76, 0x30, 0x00]));
        // Ends with GS V 66 0 (1D 56 42 00)
        let len = encoded.len();
        assert_eq!(&encoded[len - 4..len], &[0x1D, 0x56, 0x42, 0x00]);
    }
}
