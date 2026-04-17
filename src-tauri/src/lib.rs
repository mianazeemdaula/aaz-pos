// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod printer;

use base64::{engine::general_purpose::STANDARD, Engine as _};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))?;
    Ok(STANDARD.encode(&bytes))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_thermal_printer::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file_base64,
            printer::print_receipt,
            printer::print_invoice,
            printer::print_contract,
            printer::list_serial_ports,
            printer::test_printer_connection,
            printer::open_cash_drawer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
