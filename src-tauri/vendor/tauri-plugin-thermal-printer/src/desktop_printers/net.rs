//! Network (JetDirect / RAW socket) transport for desktop targets.
//!
//! LOCAL PATCH — not present upstream. The desktop side of this plugin only
//! knew how to talk to an OS print queue (`OpenPrinterW` on Windows, `lp` on
//! unix), so a printer identifier such as `tcp://192.168.15.201` was passed to
//! the spooler as a queue name and failed with "The handle is invalid.
//! (os error 6)". Network printing existed only in the Android sources. This
//! module gives the desktop targets the same behaviour the Android side
//! documents: a raw socket to port 9100, no driver and no print queue involved.

use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

/// Default JetDirect / RAW printing port.
pub const DEFAULT_RAW_PORT: u16 = 9100;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const WRITE_TIMEOUT: Duration = Duration::from_secs(30);

/// Decide whether a printer identifier names a network printer, and if so
/// return the `host:port` string to connect to.
///
/// Accepted forms:
///   - `tcp://192.168.15.201`        -> 192.168.15.201:9100
///   - `tcp://192.168.15.201:9100`   -> 192.168.15.201:9100
///   - `192.168.15.201:9100`         -> 192.168.15.201:9100
///   - `tcp://printer.local`         -> printer.local:9100
///
/// A bare `192.168.15.201` with no scheme and no port is deliberately *not*
/// treated as a network target: without a scheme it is indistinguishable from
/// an oddly named print queue, and silently bypassing the spooler would be
/// surprising. Anything else (a Windows queue name, a CUPS destination) is
/// returned as `None` so the caller falls through to its spooler path.
pub fn parse_net_target(identifier: &str) -> Option<String> {
    let raw = identifier.trim();

    let (host_port, had_scheme) = match raw
        .strip_prefix("tcp://")
        .or_else(|| raw.strip_prefix("socket://"))
    {
        Some(rest) => (rest.trim_end_matches('/'), true),
        None => (raw, false),
    };

    if host_port.is_empty() {
        return None;
    }

    // Split off an optional `:port`. Bracketed IPv6 (`[::1]:9100`) keeps its
    // brackets, which is what `ToSocketAddrs` expects anyway.
    let (host, port) = match host_port.rsplit_once(':') {
        Some((h, p)) if !h.is_empty() && !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()) => {
            (h, p.parse::<u16>().ok()?)
        }
        _ => (host_port, DEFAULT_RAW_PORT),
    };

    if host.is_empty() {
        return None;
    }

    // Without an explicit scheme, only a host that carried its own port
    // qualifies -- see the doc comment above.
    let explicit_port = host_port.len() != host.len();
    if !had_scheme && !explicit_port {
        return None;
    }

    // A Windows queue name can contain spaces and backslashes (`\\server\POS`);
    // a host name cannot.
    if host.contains(char::is_whitespace) || host.contains('\\') {
        return None;
    }

    Some(format!("{}:{}", host, port))
}

/// Send bytes verbatim to a network printer over a RAW/JetDirect socket.
pub fn print_raw_data_net(target: &str, data: &[u8]) -> std::io::Result<()> {
    println!(
        "Sending raw data to network printer '{}' ({} bytes)",
        target,
        data.len()
    );

    let addr = target
        .to_socket_addrs()
        .map_err(|err| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Cannot resolve printer address '{}': {}", target, err),
            )
        })?
        .next()
        .ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("No address found for printer '{}'", target),
            )
        })?;

    let mut stream = TcpStream::connect_timeout(&addr, CONNECT_TIMEOUT).map_err(|err| {
        std::io::Error::new(
            err.kind(),
            format!("Cannot connect to printer '{}': {}", target, err),
        )
    })?;

    stream.set_write_timeout(Some(WRITE_TIMEOUT))?;
    stream.set_nodelay(true).ok();

    stream.write_all(data).map_err(|err| {
        std::io::Error::new(
            err.kind(),
            format!("Error writing to printer '{}': {}", target, err),
        )
    })?;
    stream.flush()?;

    // Give the firmware a moment to drain the socket buffer before FIN. Some
    // JetDirect boards drop the tail of a large raster job on an abrupt close.
    std::thread::sleep(Duration::from_millis(300));

    println!("Wrote {} bytes to network printer '{}'", data.len(), target);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::parse_net_target;

    #[test]
    fn scheme_without_port_defaults_to_9100() {
        assert_eq!(
            parse_net_target("tcp://192.168.15.201").as_deref(),
            Some("192.168.15.201:9100")
        );
    }

    #[test]
    fn scheme_with_port_is_honoured() {
        assert_eq!(
            parse_net_target("tcp://192.168.15.201:9101").as_deref(),
            Some("192.168.15.201:9101")
        );
    }

    #[test]
    fn bare_host_port_is_accepted() {
        assert_eq!(
            parse_net_target("192.168.15.201:9100").as_deref(),
            Some("192.168.15.201:9100")
        );
    }

    #[test]
    fn hostname_with_scheme_is_accepted() {
        assert_eq!(
            parse_net_target("tcp://printer.local").as_deref(),
            Some("printer.local:9100")
        );
    }

    #[test]
    fn whitespace_is_tolerated() {
        assert_eq!(
            parse_net_target("  tcp://192.168.15.201  ").as_deref(),
            Some("192.168.15.201:9100")
        );
    }

    /// A job-level `GlobalStyles` font must survive sections that set only
    /// `align`/`bold` — which is every row the native slip builders emit.
    /// Before the merge patch each of those reset the printer to Font A, so a
    /// job asking for the compact face printed in the large one.
    #[test]
    fn global_font_survives_partially_styled_sections() {
        use crate::models::paper_size::PaperSize;
        use crate::models::print_job_request::PrintJobRequest;
        use crate::models::print_sections::{GlobalStyles, Line, PrintSections, Text};
        use crate::models::printer_options::PrinterOptions;
        use crate::process::process_print::ProcessPrint;

        const FONT_A: &[u8] = &[0x1B, 0x4D, 0x00];
        const FONT_B: &[u8] = &[0x1B, 0x4D, 0x01];

        // What the TS helpers actually serialise: absent fields are `null`, not
        // defaults. `GlobalStyles::default()` would inject `font: A` and make
        // this test assert the wrong thing.
        let unset = || GlobalStyles {
            bold: None,
            underline: None,
            align: None,
            italic: None,
            invert: None,
            font: None,
            rotate: None,
            upside_down: None,
            size: None,
        };

        let job = PrintJobRequest {
            printer: "tcp://127.0.0.1".to_string(),
            paper_size: PaperSize::Mm80,
            options: PrinterOptions::default(),
            sections: vec![
                PrintSections::GlobalStyles(GlobalStyles {
                    font: Some("B".to_string()),
                    size: Some("normal".to_string()),
                    ..GlobalStyles::default()
                }),
                // What textLeft()/textCenter() emit: align + bold, no font.
                PrintSections::Text(Text {
                    text: "row one".to_string(),
                    styles: Some(GlobalStyles {
                        align: Some("left".to_string()),
                        bold: Some(false),
                        ..unset()
                    }),
                }),
                // A double-height heading, as headline() emits. This is the
                // step that used to destroy the font.
                PrintSections::Text(Text {
                    text: "BUSINESS NAME".to_string(),
                    styles: Some(GlobalStyles {
                        align: Some("left".to_string()),
                        bold: Some(true),
                        size: Some("height".to_string()),
                        ..unset()
                    }),
                }),
                PrintSections::Line(Line {
                    character: "-".to_string(),
                }),
            ],
        };

        let data = ProcessPrint::new().generate_document(&job).unwrap();

        let occurrences = |needle: &[u8]| {
            data.windows(needle.len())
                .filter(|w| *w == needle)
                .count()
        };

        // `ESC !` sets font + emphasis + size together, so using it for size
        // silently clobbers the job font. Character size must go through `GS !`.
        assert_eq!(
            occurrences(&[0x1B, 0x21]),
            0,
            "ESC ! must never be used: bit 0 is the font selector, so it resets \
             the job font to A"
        );

        assert_eq!(occurrences(FONT_B), 1, "Font B should be selected once");
        assert_eq!(
            occurrences(FONT_A),
            0,
            "no section may reset the job font back to Font A"
        );

        // Font B on 80mm is 576/9 = 64 columns; the rule must match the rows.
        let rule = "-".repeat(64);
        assert!(
            data.windows(rule.len()).any(|w| w == rule.as_bytes()),
            "Line section should span 64 columns in Font B"
        );
    }

    /// End-to-end smoke test against a real printer, exercising the exact path
    /// the app uses: plugin sections -> ProcessPrint -> RAW socket.
    ///
    /// Ignored by default so a normal `cargo test` never prints. Run with:
    ///   AAZ_LIVE_PRINTER=192.168.15.201 cargo test -p tauri-plugin-thermal-printer \
    ///     --lib -- --ignored --nocapture
    #[test]
    #[ignore = "prints on real hardware; set AAZ_LIVE_PRINTER to run"]
    fn live_native_slip() {
        use crate::models::paper_size::PaperSize;
        use crate::models::print_job_request::PrintJobRequest;
        use crate::models::print_sections::{Feed, GlobalStyles, Line, PrintSections, Text};
        use crate::models::printer_options::PrinterOptions;
        use crate::process::process_print::ProcessPrint;

        let Ok(host) = std::env::var("AAZ_LIVE_PRINTER") else {
            eprintln!("AAZ_LIVE_PRINTER not set - skipping");
            return;
        };

        let centered = || {
            Some(GlobalStyles {
                align: Some("center".to_string()),
                ..GlobalStyles::default()
            })
        };
        let bold_centered = || {
            Some(GlobalStyles {
                align: Some("center".to_string()),
                bold: Some(true),
                ..GlobalStyles::default()
            })
        };
        let text = |t: &str, styles| PrintSections::Text(Text { text: t.to_string(), styles });
        let rule = |c: &str| PrintSections::Line(Line { character: c.to_string() });

        // Mirrors the native sale slip: Font B throughout, no double-size
        // heading, and Qty | Item | Price | Disc | Total at 64 columns.
        let job = PrintJobRequest {
            printer: format!("tcp://{}", host),
            paper_size: PaperSize::Mm80,
            options: PrinterOptions::default(),
            sections: vec![
                PrintSections::GlobalStyles(GlobalStyles {
                    font: Some("B".to_string()),
                    size: Some("normal".to_string()),
                    ..GlobalStyles::default()
                }),
                // headline(): the business name is the one enlarged element --
                // bold + double height, centred by padding not ESC/POS align.
                PrintSections::Text(Text {
                    text: format!("{}AAZIFY POS", " ".repeat((64 - 10) / 2)),
                    styles: Some(GlobalStyles {
                        align: Some("left".to_string()),
                        bold: Some(true),
                        size: Some("height".to_string()),
                        ..GlobalStyles::default()
                    }),
                }),
                // Address and phone share one row; no NTN line.
                text("12 Mall Road, Lahore  |  Tel: 042-1234567", centered()),
                rule("-"),
                text("SALES INVOICE", bold_centered()),
                text("Invoice: NATIVE-TEST-001", None),
                text("Cashier: integration test", None),
                rule("-"),
                //    qty=4 item=29                   price=10   disc=9  total=12
                text("Qty Item                             Price     Disc       Total", None),
                rule("-"),
                text("  2 Test product A                   600.0     -100     1,100.0", None),
                rule("."),
                text("  1 Test product B with a longer na   450.0        -       450.0", None),
                text("    me that wraps", None),
                rule("-"),
                // Font A line, laid out at Font A's 48 columns.
                PrintSections::Text(Text {
                    text: "                    GRAND TOTAL:       1,550".to_string(),
                    styles: Some(GlobalStyles {
                        align: Some("left".to_string()),
                        bold: Some(true),
                        font: Some("A".to_string()),
                        ..GlobalStyles::default()
                    }),
                }),
                rule("-"),
                text("Above line large, this line small again.", centered()),
                PrintSections::Feed(Feed {
                    feed_type: "lines".to_string(),
                    value: 3,
                }),
            ],
        };

        let data = ProcessPrint::new()
            .generate_document(&job)
            .expect("ProcessPrint should render the native slip");
        println!("rendered {} bytes of ESC/POS", data.len());

        let target = parse_net_target(&job.printer).expect("tcp:// target should parse");
        super::print_raw_data_net(&target, &data).expect("slip should reach the printer");
    }

    /// The HTML invoice mode sends the whole receipt as one raster image, which
    /// is two orders of magnitude larger than a native slip. This checks a
    /// full-width, full-length raster survives the socket in one piece.
    ///
    ///   AAZ_LIVE_PRINTER=192.168.15.201 cargo test -p tauri-plugin-thermal-printer \
    ///     --lib -- --ignored --nocapture live_html_raster
    #[test]
    #[ignore = "prints on real hardware; set AAZ_LIVE_PRINTER to run"]
    fn live_html_raster() {
        use crate::models::paper_size::PaperSize;
        use crate::models::print_job_request::PrintJobRequest;
        use crate::models::print_sections::{Feed, Image, PrintSections};
        use crate::models::printer_options::PrinterOptions;
        use crate::process::process_print::ProcessPrint;
        use base64::{engine::general_purpose, Engine as _};

        let Ok(host) = std::env::var("AAZ_LIVE_PRINTER") else {
            eprintln!("AAZ_LIVE_PRINTER not set - skipping");
            return;
        };

        // Stand-in for the html2canvas PNG: 80mm-wide, receipt-length, with
        // horizontal bars so a truncated raster is obvious on paper.
        const W: u32 = 576;
        const H: u32 = 820;
        let mut img = ::image::GrayImage::from_pixel(W, H, ::image::Luma([255u8]));
        for y in 0..H {
            let band = y / 40;
            for x in 0..W {
                let on = if band % 2 == 0 {
                    y % 40 < 6
                } else {
                    (x / 16 + y / 8) % 3 == 0
                };
                if on {
                    img.put_pixel(x, y, ::image::Luma([0u8]));
                }
            }
        }
        // Solid end marker: if this band is missing, the tail was dropped.
        for y in H - 30..H {
            for x in 0..W {
                img.put_pixel(x, y, ::image::Luma([0u8]));
            }
        }

        let mut png = Vec::new();
        ::image::DynamicImage::ImageLuma8(img)
            .write_to(
                &mut std::io::Cursor::new(&mut png),
                ::image::ImageOutputFormat::Png,
            )
            .expect("png encode");
        let b64 = general_purpose::STANDARD.encode(&png);

        let job = PrintJobRequest {
            printer: format!("tcp://{}", host),
            paper_size: PaperSize::Mm80,
            options: PrinterOptions::default(),
            sections: vec![
                PrintSections::Image(Image {
                    data: b64,
                    max_width: W as i32,
                    align: "center".to_string(),
                    dithering: false,
                    size: "normal".to_string(),
                }),
                PrintSections::Feed(Feed {
                    feed_type: "lines".to_string(),
                    value: 3,
                }),
            ],
        };

        let data = ProcessPrint::new()
            .generate_document(&job)
            .expect("ProcessPrint should raster the image");
        println!("rendered {} bytes of ESC/POS raster", data.len());
        assert!(data.len() > 20_000, "raster smaller than expected");

        let target = parse_net_target(&job.printer).expect("tcp:// target should parse");
        super::print_raw_data_net(&target, &data).expect("raster should reach the printer");
    }

    #[test]
    fn queue_names_fall_through_to_the_spooler() {
        assert_eq!(parse_net_target("POS-80"), None);
        assert_eq!(parse_net_target("EPSON TM-T20"), None);
        assert_eq!(parse_net_target(r"\\server\POS-80"), None);
        assert_eq!(parse_net_target("192.168.15.201"), None);
        assert_eq!(parse_net_target(""), None);
    }
}
