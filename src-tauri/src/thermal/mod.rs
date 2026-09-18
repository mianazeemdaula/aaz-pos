pub mod models;
pub mod shaper;
pub mod renderer;
pub mod encoder;
pub mod transport;

use base64::{engine::general_purpose::STANDARD, Engine as _};
pub use models::{ThermalInvoice, ThermalItem, ThermalPayment, ThermalPrinterConfig};
pub use renderer::ThermalRenderer;
pub use encoder::EscPosEncoder;
pub use transport::ThermalTransport;

/// Complete pipeline:
/// Invoice JSON -> Skia & HarfBuzz (Urdu Font) -> 203 DPI Raster -> 1-bit ESC/POS -> USB/LAN
pub fn print_invoice(invoice: ThermalInvoice, config: ThermalPrinterConfig) -> Result<String, String> {
    let renderer = ThermalRenderer::new()?;
    let pixmap = renderer.render(&invoice, &config)?;
    let escpos_bytes = EscPosEncoder::encode_pixmap(&pixmap, &config);
    ThermalTransport::send(&config, &escpos_bytes)
}

/// Render preview as base64 encoded PNG
pub fn render_preview_base64(invoice: ThermalInvoice, config: ThermalPrinterConfig) -> Result<String, String> {
    let renderer = ThermalRenderer::new()?;
    let pixmap = renderer.render(&invoice, &config)?;
    let png_bytes = pixmap.encode_png()
        .map_err(|e| format!("Failed to encode PNG: {:?}", e))?;
    Ok(STANDARD.encode(&png_bytes))
}

/// Send a test print slip
pub fn print_test_slip(config: ThermalPrinterConfig) -> Result<String, String> {
    let test_invoice = ThermalInvoice {
        business_name: "AAZIFY POS TEST".to_string(),
        business_address: Some("Thermal Printer Diagnostics".to_string()),
        business_phone: Some("042-1234567".to_string()),
        business_ntn: Some("1234567-8".to_string()),
        business_strn: None,
        title: "پرنٹر ٹیسٹ سلپ (TEST SLIP)".to_string(),
        invoice_no: "TEST-001".to_string(),
        date_time: chrono::Local::now().format("%d-%m-%Y %H:%M").to_string(),
        cashier: Some("Admin".to_string()),
        customer_name: Some("ٹیسٹ گاہک (Walk-in)".to_string()),
        customer_phone: None,
        customer_previous_balance: None,
        customer_new_balance: None,
        items: vec![
            ThermalItem {
                name: "سیب کالا کولو (Apple Kala Kulu)".to_string(),
                qty: 2.0,
                price: 250.0,
                discount: 0.0,
                total: 500.0,
            },
            ThermalItem {
                name: "دودھ پیکٹ (Milk Pack 1L)".to_string(),
                qty: 1.0,
                price: 280.0,
                discount: 10.0,
                total: 270.0,
            },
        ],
        subtotal: 780.0,
        discount_amount: 10.0,
        tax_amount: 0.0,
        grand_total: 770.0,
        paid_amount: 1000.0,
        change_amount: 230.0,
        payments: vec![
            ThermalPayment {
                name: "Cash".to_string(),
                amount: 1000.0,
            },
        ],
        fbr_invoice_id: Some("1234567890123456".to_string()),
        qr_data: Some("1234567890123456".to_string()),
        notes: Some("یہ ایک آزمائشی پرنٹ سلپ ہے۔ تمام نستعلیق اردو اور انگریزی فانٹ درست کام کر رہے ہیں۔".to_string()),
        logo_base64: None,
        fbr_logo_base64: None,
        is_duplicate: false,
    };

    print_invoice(test_invoice, config)
}
