use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalPayment {
    pub name: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalItem {
    pub name: String,
    pub qty: f64,
    pub price: f64,
    #[serde(default)]
    pub discount: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalInvoice {
    pub business_name: String,
    pub business_address: Option<String>,
    pub business_phone: Option<String>,
    pub business_ntn: Option<String>,
    pub business_strn: Option<String>,

    pub title: String, // e.g. "SALE INVOICE" or "بل برائے فروخت"
    pub invoice_no: String,
    pub date_time: String,
    pub cashier: Option<String>,
    pub customer_name: Option<String>,
    pub customer_phone: Option<String>,
    pub customer_previous_balance: Option<f64>,
    pub customer_new_balance: Option<f64>,

    pub items: Vec<ThermalItem>,
    #[serde(default)]
    pub payments: Vec<ThermalPayment>,

    pub subtotal: f64,
    #[serde(default)]
    pub discount_amount: f64,
    #[serde(default)]
    pub tax_amount: f64,
    pub grand_total: f64,
    #[serde(default)]
    pub paid_amount: f64,
    #[serde(default)]
    pub change_amount: f64,

    pub fbr_invoice_id: Option<String>,
    pub qr_data: Option<String>,
    pub notes: Option<String>,
    pub logo_base64: Option<String>,
    #[serde(default)]
    pub fbr_logo_base64: Option<String>,
    #[serde(default)]
    pub is_duplicate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalPrinterConfig {
    pub connection_type: String, // "USB" | "IP" | "SHARED"
    pub printer_name: Option<String>,
    pub ip_address: Option<String>,
    pub tcp_port: Option<u16>,
    pub paper_size: Option<String>, // "Mm80" | "Mm58"
    pub cut_paper: Option<bool>,
    pub beep: Option<bool>,
    pub open_cash_drawer: Option<bool>,
    pub feed_lines: Option<u8>,
}
