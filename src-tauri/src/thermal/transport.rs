use std::io::Write;
use std::net::TcpStream;
use std::time::Duration;
use crate::thermal::models::ThermalPrinterConfig;

pub struct ThermalTransport;

impl ThermalTransport {
    /// Send raw ESC/POS bytes to the configured printer
    pub fn send(config: &ThermalPrinterConfig, data: &[u8]) -> Result<String, String> {
        let conn_type = config.connection_type.to_uppercase();
        match conn_type.as_str() {
            "IP" | "TCP" | "LAN" => Self::send_tcp(config, data),
            "USB" | "SHARED" => Self::send_system_spooler(config, data),
            other => Err(format!("Unsupported connection type: {}", other)),
        }
    }

    /// Send to LAN thermal printer over raw TCP socket (JetDirect / port 9100)
    pub fn send_tcp(config: &ThermalPrinterConfig, data: &[u8]) -> Result<String, String> {
        let host = config.ip_address.as_deref()
            .ok_or_else(|| "No IP address specified in printer configuration".to_string())?
            .trim()
            .trim_start_matches("tcp://")
            .trim_start_matches("socket://");

        if host.is_empty() {
            return Err("Printer IP address is empty".to_string());
        }

        let port = config.tcp_port.unwrap_or(9100);
        let address = format!("{}:{}", host, port);

        let socket_addr = address.parse()
            .map_err(|e| format!("Invalid printer socket address '{}': {}", address, e))?;

        let mut stream = TcpStream::connect_timeout(&socket_addr, Duration::from_secs(5))
            .map_err(|e| format!("Failed to connect to printer at {}: {}", address, e))?;

        stream.set_write_timeout(Some(Duration::from_secs(10)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;

        stream.write_all(data)
            .map_err(|e| format!("Failed to write print data to {}: {}", address, e))?;

        stream.flush()
            .map_err(|e| format!("Failed to flush printer socket: {}", e))?;

        Ok(format!("Successfully sent {} bytes to printer at {}", data.len(), address))
    }

    /// Send to USB / Windows Print Spooler as RAW datatype
    #[cfg(target_os = "windows")]
    pub fn send_system_spooler(config: &ThermalPrinterConfig, data: &[u8]) -> Result<String, String> {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use std::ptr;
        use winapi::shared::minwindef::{DWORD, LPVOID};
        use winapi::um::winspool::{
            ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
            StartPagePrinter, WritePrinter, DOC_INFO_1W,
        };

        let printer_name = config.printer_name.as_deref()
            .ok_or_else(|| "No printer name specified in configuration".to_string())?
            .trim();

        if printer_name.is_empty() {
            return Err("Printer name is empty".to_string());
        }

        let wide = |s: &str| -> Vec<u16> {
            OsStr::new(s)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect()
        };

        let printer_wide = wide(printer_name);
        let doc_name = wide("AAZ Thermal Receipt");
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
                return Err(format!("Cannot start print job on '{}': {}", printer_name, err));
            }

            if StartPagePrinter(h_printer) == 0 {
                let err = std::io::Error::last_os_error();
                EndDocPrinter(h_printer);
                ClosePrinter(h_printer);
                return Err(format!("Cannot start page on '{}': {}", printer_name, err));
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
                    "Write to printer '{}' failed: {}",
                    printer_name,
                    std::io::Error::last_os_error()
                ));
            }

            Ok(format!("Sent {} bytes to printer '{}'", written, printer_name))
        }
    }

    #[cfg(not(target_os = "windows"))]
    pub fn send_system_spooler(config: &ThermalPrinterConfig, data: &[u8]) -> Result<String, String> {
        use std::process::{Command, Stdio};

        let printer_name = config.printer_name.as_deref()
            .ok_or_else(|| "No printer name specified in configuration".to_string())?
            .trim();

        if printer_name.is_empty() {
            return Err("Printer name is empty".to_string());
        }

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
}
