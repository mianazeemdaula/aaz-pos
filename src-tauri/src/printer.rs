use serde::{Deserialize, Serialize};
use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrinterConnectionType {
    USB,
    TCP,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub connection_type: PrinterConnectionType,
    pub port: Option<String>,       // For USB: COM port or /dev/ttyUSB0
    pub ip_address: Option<String>, // For TCP: IP address
    pub tcp_port: Option<u16>,      // For TCP: Port number (usually 9100)
    pub baudrate: Option<u32>,      // For USB: Baudrate (usually 9600 or 115200)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintData {
    pub text: String,
    pub config: PrinterConfig,
}

// ESC/POS Commands
#[allow(dead_code)]
pub struct EscPos;

#[allow(dead_code)]
impl EscPos {
    // Initialize printer
    pub const INIT: &'static [u8] = &[0x1B, 0x40];

    // Text formatting
    pub const BOLD_ON: &'static [u8] = &[0x1B, 0x45, 0x01];
    pub const BOLD_OFF: &'static [u8] = &[0x1B, 0x45, 0x00];
    pub const UNDERLINE_ON: &'static [u8] = &[0x1B, 0x2D, 0x01];
    pub const UNDERLINE_OFF: &'static [u8] = &[0x1B, 0x2D, 0x00];

    // Text alignment
    pub const ALIGN_LEFT: &'static [u8] = &[0x1B, 0x61, 0x00];
    pub const ALIGN_CENTER: &'static [u8] = &[0x1B, 0x61, 0x01];
    pub const ALIGN_RIGHT: &'static [u8] = &[0x1B, 0x61, 0x02];

    // Text size
    pub const SIZE_NORMAL: &'static [u8] = &[0x1D, 0x21, 0x00];
    pub const SIZE_DOUBLE_HEIGHT: &'static [u8] = &[0x1D, 0x21, 0x01];
    pub const SIZE_DOUBLE_WIDTH: &'static [u8] = &[0x1D, 0x21, 0x10];
    pub const SIZE_DOUBLE: &'static [u8] = &[0x1D, 0x21, 0x11];

    // Paper control
    pub const LINE_FEED: &'static [u8] = &[0x0A];
    pub const CUT_PAPER: &'static [u8] = &[0x1D, 0x56, 0x00];
    pub const CUT_PAPER_PARTIAL: &'static [u8] = &[0x1D, 0x56, 0x01];

    // Drawer control
    pub const OPEN_DRAWER: &'static [u8] = &[0x1B, 0x70, 0x00, 0x19, 0xFA];
}

pub fn print_via_usb(config: &PrinterConfig, data: &[u8]) -> Result<String, String> {
    let port_name = config
        .port
        .as_ref()
        .ok_or_else(|| "USB port not specified".to_string())?;

    let baudrate = config.baudrate.unwrap_or(9600);

    let mut port = serialport::new(port_name, baudrate)
        .timeout(Duration::from_secs(5))
        .open()
        .map_err(|e| format!("Failed to open serial port: {}", e))?;

    port.write_all(data)
        .map_err(|e| format!("Failed to write to printer: {}", e))?;

    Ok("Print job sent successfully via USB".to_string())
}

pub fn print_via_tcp(config: &PrinterConfig, data: &[u8]) -> Result<String, String> {
    let ip = config
        .ip_address
        .as_ref()
        .ok_or_else(|| "IP address not specified".to_string())?;

    let port = config.tcp_port.unwrap_or(9100);
    let address = format!("{}:{}", ip, port);

    let mut stream = TcpStream::connect_timeout(
        &address
            .parse()
            .map_err(|e| format!("Invalid address: {}", e))?,
        Duration::from_secs(5),
    )
    .map_err(|e| format!("Failed to connect to printer: {}", e))?;

    stream
        .write_all(data)
        .map_err(|e| format!("Failed to write to printer: {}", e))?;

    Ok("Print job sent successfully via TCP/IP".to_string())
}

#[tauri::command]
pub fn print_receipt(data: PrintData) -> Result<String, String> {
    let mut print_data = Vec::new();

    // Initialize printer
    print_data.extend_from_slice(EscPos::INIT);

    // Add the text content
    print_data.extend_from_slice(data.text.as_bytes());

    // Feed and cut paper
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::CUT_PAPER);

    match data.config.connection_type {
        PrinterConnectionType::USB => print_via_usb(&data.config, &print_data),
        PrinterConnectionType::TCP => print_via_tcp(&data.config, &print_data),
    }
}

#[tauri::command]
pub fn print_invoice(
    invoice_number: String,
    customer_name: String,
    items: Vec<String>,
    total: f64,
    config: PrinterConfig,
) -> Result<String, String> {
    let mut print_data = Vec::new();

    // Initialize
    print_data.extend_from_slice(EscPos::INIT);

    // Header - Centered, Bold, Double Size
    print_data.extend_from_slice(EscPos::ALIGN_CENTER);
    print_data.extend_from_slice(EscPos::BOLD_ON);
    print_data.extend_from_slice(EscPos::SIZE_DOUBLE);
    print_data.extend_from_slice(b"COLD STORE\n");
    print_data.extend_from_slice(EscPos::SIZE_NORMAL);
    print_data.extend_from_slice(EscPos::BOLD_OFF);

    // Company info
    print_data.extend_from_slice(b"Storage & Logistics\n");
    print_data.extend_from_slice(b"Tel: 042-1234567\n");
    print_data.extend_from_slice(b"================================\n");

    // Invoice details - Left aligned
    print_data.extend_from_slice(EscPos::ALIGN_LEFT);
    print_data.extend_from_slice(format!("Invoice #: {}\n", invoice_number).as_bytes());
    print_data.extend_from_slice(format!("Customer: {}\n", customer_name).as_bytes());

    // Current date/time
    let now = chrono::Local::now();
    print_data.extend_from_slice(format!("Date: {}\n", now.format("%d-%m-%Y %H:%M")).as_bytes());
    print_data.extend_from_slice(b"================================\n");

    // Items
    print_data.extend_from_slice(EscPos::BOLD_ON);
    print_data.extend_from_slice(b"Items:\n");
    print_data.extend_from_slice(EscPos::BOLD_OFF);

    for item in items {
        print_data.extend_from_slice(format!("  {}\n", item).as_bytes());
    }

    print_data.extend_from_slice(b"================================\n");

    // Total - Bold
    print_data.extend_from_slice(EscPos::BOLD_ON);
    print_data.extend_from_slice(EscPos::SIZE_DOUBLE_HEIGHT);
    print_data.extend_from_slice(format!("TOTAL: Rs. {:.2}\n", total).as_bytes());
    print_data.extend_from_slice(EscPos::SIZE_NORMAL);
    print_data.extend_from_slice(EscPos::BOLD_OFF);

    print_data.extend_from_slice(b"================================\n");

    // Footer
    print_data.extend_from_slice(EscPos::ALIGN_CENTER);
    print_data.extend_from_slice(b"Thank You!\n");
    print_data.extend_from_slice(b"Please Come Again\n");

    // Feed and cut
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::CUT_PAPER);

    match config.connection_type {
        PrinterConnectionType::USB => print_via_usb(&config, &print_data),
        PrinterConnectionType::TCP => print_via_tcp(&config, &print_data),
    }
}

#[tauri::command]
pub fn print_contract(
    contract_code: String,
    farmer_name: String,
    items: String,
    start_date: String,
    end_date: String,
    total_value: f64,
    config: PrinterConfig,
) -> Result<String, String> {
    let mut print_data = Vec::new();

    // Initialize
    print_data.extend_from_slice(EscPos::INIT);

    // Header
    print_data.extend_from_slice(EscPos::ALIGN_CENTER);
    print_data.extend_from_slice(EscPos::BOLD_ON);
    print_data.extend_from_slice(EscPos::SIZE_DOUBLE);
    print_data.extend_from_slice(b"STORAGE CONTRACT\n");
    print_data.extend_from_slice(EscPos::SIZE_NORMAL);
    print_data.extend_from_slice(EscPos::BOLD_OFF);
    print_data.extend_from_slice(b"================================\n");

    // Contract details
    print_data.extend_from_slice(EscPos::ALIGN_LEFT);
    print_data.extend_from_slice(format!("Contract: {}\n", contract_code).as_bytes());
    print_data.extend_from_slice(format!("Farmer: {}\n", farmer_name).as_bytes());
    print_data.extend_from_slice(b"--------------------------------\n");
    print_data.extend_from_slice(format!("Start Date: {}\n", start_date).as_bytes());
    print_data.extend_from_slice(format!("End Date: {}\n", end_date).as_bytes());
    print_data.extend_from_slice(b"--------------------------------\n");
    print_data.extend_from_slice(format!("Items:\n{}\n", items).as_bytes());
    print_data.extend_from_slice(b"================================\n");

    // Total
    print_data.extend_from_slice(EscPos::BOLD_ON);
    print_data.extend_from_slice(format!("Total Value: Rs. {:.2}\n", total_value).as_bytes());
    print_data.extend_from_slice(EscPos::BOLD_OFF);

    // Footer
    print_data.extend_from_slice(b"\n");
    print_data.extend_from_slice(EscPos::ALIGN_CENTER);
    print_data.extend_from_slice(b"Authorized Signature\n");
    print_data.extend_from_slice(b"____________________\n");

    // Feed and cut
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::LINE_FEED);
    print_data.extend_from_slice(EscPos::CUT_PAPER);

    match config.connection_type {
        PrinterConnectionType::USB => print_via_usb(&config, &print_data),
        PrinterConnectionType::TCP => print_via_tcp(&config, &print_data),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw passthrough printing (ZPL / EPL / any printer language)
//
// The thermal-printer plugin only speaks ESC/POS, so label printers driven by
// ZPL need a byte-for-byte passthrough. Three transports are supported:
//   - System : Windows spooler RAW datatype / `lp -o raw` on unix
//   - Tcp    : direct socket to the printer (JetDirect, port 9100)
//   - Serial : COM / tty port
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum RawTarget {
    System { name: String },
    Tcp { host: String, port: Option<u16> },
    Serial { port: String, baud: Option<u32> },
}

#[cfg(target_os = "windows")]
fn print_raw_system(printer_name: &str, data: &[u8]) -> Result<String, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr;
    use winapi::shared::minwindef::{DWORD, LPVOID};
    use winapi::um::winspool::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
        StartPagePrinter, WritePrinter, DOC_INFO_1W,
    };

    let wide = |s: &str| -> Vec<u16> {
        OsStr::new(s)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    };

    let printer_wide = wide(printer_name);
    let doc_name = wide("ZPL Label Batch");
    let data_type = wide("RAW");
    let mut h_printer: LPVOID = ptr::null_mut();

    unsafe {
        if OpenPrinterW(
            printer_wide.as_ptr() as *mut _,
            &mut h_printer,
            ptr::null_mut(),
        ) == 0
        {
            return Err(format!(
                "Cannot open printer '{}': {}",
                printer_name,
                std::io::Error::last_os_error()
            ));
        }

        let mut doc_info = DOC_INFO_1W {
            pDocName: doc_name.as_ptr() as *mut _,
            pOutputFile: ptr::null_mut(),
            pDatatype: data_type.as_ptr() as *mut _,
        };

        if StartDocPrinterW(h_printer, 1, &mut doc_info as *mut _ as *mut _) == 0 {
            let err = std::io::Error::last_os_error();
            ClosePrinter(h_printer);
            return Err(format!("Cannot start print job: {}", err));
        }

        if StartPagePrinter(h_printer) == 0 {
            let err = std::io::Error::last_os_error();
            EndDocPrinter(h_printer);
            ClosePrinter(h_printer);
            return Err(format!("Cannot start page: {}", err));
        }

        let mut written: DWORD = 0;
        let ok = WritePrinter(
            h_printer,
            data.as_ptr() as LPVOID,
            data.len() as DWORD,
            &mut written,
        );

        EndPagePrinter(h_printer);
        EndDocPrinter(h_printer);
        ClosePrinter(h_printer);

        if ok == 0 {
            return Err(format!(
                "Write to printer failed: {}",
                std::io::Error::last_os_error()
            ));
        }

        Ok(format!("Sent {} bytes to '{}'", written, printer_name))
    }
}

#[cfg(not(target_os = "windows"))]
fn print_raw_system(printer_name: &str, data: &[u8]) -> Result<String, String> {
    use std::process::{Command, Stdio};

    let mut child = Command::new("lp")
        .args(["-d", printer_name, "-o", "raw"])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to run lp: {}", e))?;

    child
        .stdin
        .as_mut()
        .ok_or_else(|| "Failed to open lp stdin".to_string())?
        .write_all(data)
        .map_err(|e| format!("Failed to write to lp: {}", e))?;

    let status = child
        .wait()
        .map_err(|e| format!("lp did not complete: {}", e))?;

    if status.success() {
        Ok(format!("Sent {} bytes to '{}'", data.len(), printer_name))
    } else {
        Err(format!("lp exited with status {}", status))
    }
}

/// Send raw printer-language bytes (ZPL, EPL, ESC/POS…) to a target verbatim.
#[tauri::command]
pub fn print_raw(target: RawTarget, data: String) -> Result<String, String> {
    let bytes = data.as_bytes();

    match target {
        RawTarget::System { name } => {
            if name.trim().is_empty() {
                return Err("No printer selected".to_string());
            }
            print_raw_system(&name, bytes)
        }
        RawTarget::Tcp { host, port } => {
            let config = PrinterConfig {
                connection_type: PrinterConnectionType::TCP,
                port: None,
                ip_address: Some(host),
                tcp_port: Some(port.unwrap_or(9100)),
                baudrate: None,
            };
            print_via_tcp(&config, bytes)
        }
        RawTarget::Serial { port, baud } => {
            let config = PrinterConfig {
                connection_type: PrinterConnectionType::USB,
                port: Some(port),
                ip_address: None,
                tcp_port: None,
                baudrate: Some(baud.unwrap_or(9600)),
            };
            print_via_usb(&config, bytes)
        }
    }
}

#[tauri::command]
pub fn list_serial_ports() -> Result<Vec<String>, String> {
    let ports =
        serialport::available_ports().map_err(|e| format!("Failed to list serial ports: {}", e))?;

    Ok(ports.iter().map(|p| p.port_name.clone()).collect())
}

#[tauri::command]
pub fn test_printer_connection(config: PrinterConfig) -> Result<String, String> {
    let test_data = b"Test Print\n\n\n";

    match config.connection_type {
        PrinterConnectionType::USB => print_via_usb(&config, test_data),
        PrinterConnectionType::TCP => print_via_tcp(&config, test_data),
    }
}

#[tauri::command]
pub fn open_cash_drawer(config: PrinterConfig) -> Result<String, String> {
    let drawer_data = EscPos::OPEN_DRAWER;

    match config.connection_type {
        PrinterConnectionType::USB => print_via_usb(&config, drawer_data),
        PrinterConnectionType::TCP => print_via_tcp(&config, drawer_data),
    }
}
