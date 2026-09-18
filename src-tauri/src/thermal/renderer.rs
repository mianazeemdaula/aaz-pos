use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::GenericImageView;
use qrcode::{QrCode, Version, EcLevel};
use tiny_skia::*;

use crate::thermal::models::{ThermalInvoice, ThermalPrinterConfig};
use crate::thermal::shaper::{TextAlign, TextShaper};

const DEFAULT_FBR_LOGO_BASE64: &str = include_str!("fbr_logo.txt");

pub struct ThermalRenderer {
    shaper: TextShaper,
}

impl ThermalRenderer {
    pub fn new() -> Result<Self, String> {
        let shaper = TextShaper::new()?;
        Ok(Self { shaper })
    }

    /// Renders an invoice into a 203 DPI raster Pixmap
    pub fn render(&self, invoice: &ThermalInvoice, config: &ThermalPrinterConfig) -> Result<Pixmap, String> {
        let is_58mm = config.paper_size.as_deref() == Some("Mm58");
        let width = if is_58mm { 384 } else { 576 };

        // Two passes:
        // Pass 1: compute layout and total required canvas height
        let height = self.layout_pass(invoice, width, false, &mut None)? as u32;

        // Pass 2: render into the allocated Pixmap
        let mut pixmap = Pixmap::new(width, height)
            .ok_or_else(|| format!("Failed to create pixmap of size {}x{}", width, height))?;
        pixmap.fill(Color::WHITE);

        self.layout_pass(invoice, width, true, &mut Some(&mut pixmap))?;

        Ok(pixmap)
    }

    /// Single unified pass for measurement and rendering
    fn layout_pass(
        &self,
        invoice: &ThermalInvoice,
        width: u32,
        render: bool,
        pixmap_opt: &mut Option<&mut Pixmap>,
    ) -> Result<f32, String> {
        let w = width as f32;
        let mut y = 20.0; // Top padding

        let is_compact = width <= 384;
        let font_title = if is_compact { 28.0 } else { 34.0 };
        let font_header = if is_compact { 22.0 } else { 26.0 };
        let font_body = if is_compact { 16.0 } else { 19.0 };
        let font_items_table = font_body + 4.0;
        let font_small = if is_compact { 14.0 } else { 16.0 };
        let font_large = if is_compact { 22.0 } else { 27.0 };
        let font_business_info = if is_compact { 17.0 } else { 20.0 };

        let left_margin = if is_compact { 8.0 } else { 12.0 };
        let right_margin = w - left_margin;
        let center_x = w / 2.0;

        // 1. Optional Logo
        if let Some(ref logo_b64) = invoice.logo_base64 {
            if let Ok(logo_bytes) = STANDARD.decode(logo_b64.trim()) {
                if let Ok(dyn_img) = image::load_from_memory(&logo_bytes) {
                    let (img_w, img_h) = dyn_img.dimensions();
                    if img_w > 0 && img_h > 0 {
                        let max_logo_w = if is_compact { 250.0 } else { 350.0 };
                        let max_logo_h = 125.0;
                        let scale = (max_logo_w / img_w as f32)
                            .min(max_logo_h / img_h as f32)
                            .min(1.25);
                        let target_w = (img_w as f32 * scale).round();
                        let target_h = (img_h as f32 * scale).round();

                        if render {
                            if let Some(ref mut pm) = pixmap_opt {
                                let resized = dyn_img.resize_exact(
                                    target_w as u32,
                                    target_h as u32,
                                    image::imageops::FilterType::Lanczos3,
                                );
                                let rgba = resized.to_rgba8();
                                let logo_pm = PixmapRef::from_bytes(&rgba, target_w as u32, target_h as u32);
                                if let Some(l_pm) = logo_pm {
                                    let dest_x = center_x - (target_w / 2.0);
                                    let mut paint = PixmapPaint::default();
                                    paint.quality = FilterQuality::Bilinear;
                                    pm.draw_pixmap(
                                        dest_x as i32,
                                        y as i32,
                                        l_pm,
                                        &paint,
                                        Transform::identity(),
                                        None,
                                    );
                                }
                            }
                        }
                        y += target_h + 10.0;
                    }
                }
            }
        }

        // 2. Business Name & Info
        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, &invoice.business_name, center_x, y + font_title, font_title, true, TextAlign::Center);
            }
        }
        y += font_title + 8.0;

        if let Some(ref addr) = invoice.business_address {
            if !addr.trim().is_empty() {
                let lines = self.shaper.wrap_text(addr, w - (left_margin * 2.0), font_business_info, false);
                for line in lines {
                    if render {
                        if let Some(ref mut pm) = pixmap_opt {
                            self.shaper.draw_text(pm, &line, center_x, y + font_business_info, font_business_info, false, TextAlign::Center);
                        }
                    }
                    y += font_business_info + 4.0;
                }
            }
        }

        if let Some(ref phone) = invoice.business_phone {
            if !phone.trim().is_empty() {
                let text = format!("Tel: {}", phone);
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        self.shaper.draw_text(pm, &text, center_x, y + font_business_info, font_business_info, false, TextAlign::Center);
                    }
                }
                y += font_business_info + 4.0;
            }
        }

        // NTN & STRN
        let mut tax_ids = Vec::new();
        if let Some(ref ntn) = invoice.business_ntn {
            if !ntn.trim().is_empty() {
                tax_ids.push(format!("NTN: {}", ntn));
            }
        }
        if let Some(ref strn) = invoice.business_strn {
            if !strn.trim().is_empty() {
                tax_ids.push(format!("STRN: {}", strn));
            }
        }
        if !tax_ids.is_empty() {
            let text = tax_ids.join(" | ");
            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, &text, center_x, y + font_small, font_small, false, TextAlign::Center);
                }
            }
            y += font_small + 4.0;
        }

        y += 4.0;
        self.draw_divider(left_margin, right_margin, y, 2.0, render, pixmap_opt);
        y += 8.0;

        // 3. Invoice Title Banner
        let is_dup = invoice.is_duplicate || invoice.title.to_uppercase().contains("DUPLICATE");
        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, &invoice.title, center_x, y + font_header, font_header, true, TextAlign::Center);
            }
        }
        y += font_header + 4.0;

        if is_dup {
            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "*** DUPLICATE ***", center_x, y + font_body, font_body, true, TextAlign::Center);
                }
            }
            y += font_body + 4.0;
        }
        y += 4.0;

        // 4. Meta Information (Invoice #, Date, Cashier, Customer)
        let inv_str = format!("Invoice #: {}", invoice.invoice_no);
        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, &inv_str, left_margin, y + font_body, font_body, true, TextAlign::Left);
                self.shaper.draw_text(pm, &invoice.date_time, right_margin, y + font_body, font_body, false, TextAlign::Right);
            }
        }
        y += font_body + 4.0;

        if let Some(ref cashier) = invoice.cashier {
            if !cashier.trim().is_empty() {
                let cashier_str = format!("Cashier: {}", cashier);
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        self.shaper.draw_text(pm, &cashier_str, left_margin, y + font_small, font_small, false, TextAlign::Left);
                    }
                }
                y += font_small + 4.0;
            }
        }

        if let Some(ref cust) = invoice.customer_name {
            if !cust.trim().is_empty() {
                let mut cust_str = format!("Customer: {}", cust);
                if let Some(ref phone) = invoice.customer_phone {
                    if !phone.trim().is_empty() {
                        cust_str.push_str(&format!(" ({})", phone));
                    }
                }
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        self.shaper.draw_text(pm, &cust_str, left_margin, y + font_body, font_body, false, TextAlign::Left);
                    }
                }
                y += font_body + 4.0;
            }
        }

        y += 4.0;
        self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
        y += 6.0;

        // 5. Items Table Header
        let has_discount = invoice.items.iter().any(|i| i.discount > 0.0);
        let col_qty_w = if is_compact { if has_discount { 34.0 } else { 38.0 } } else { 52.0 };
        let col_rate_w = if is_compact { if has_discount { 66.0 } else { 72.0 } } else { 95.0 };
        let col_disc_w = if has_discount { if is_compact { 52.0 } else { 75.0 } } else { 0.0 };
        let col_tot_w = if is_compact { if has_discount { 74.0 } else { 78.0 } } else { 105.0 };
        let col_name_w = (right_margin - left_margin) - col_qty_w - col_rate_w - col_disc_w - col_tot_w;

        let col_qty_x = left_margin;
        let col_name_x = col_qty_x + col_qty_w;
        let col_rate_x = col_name_x + col_name_w;
        let col_disc_x = col_rate_x + col_rate_w;
        let col_tot_x = right_margin;

        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, "Qty", col_qty_x, y + font_items_table, font_items_table, true, TextAlign::Left);
                self.shaper.draw_text(pm, "Item", col_name_x, y + font_items_table, font_items_table, true, TextAlign::Left);
                self.shaper.draw_text(pm, "Rate", col_rate_x + col_rate_w - 4.0, y + font_items_table, font_items_table, true, TextAlign::Right);
                if has_discount {
                    self.shaper.draw_text(pm, "Disc", col_disc_x + col_disc_w - 4.0, y + font_items_table, font_items_table, true, TextAlign::Right);
                }
                self.shaper.draw_text(pm, "Total", col_tot_x, y + font_items_table, font_items_table, true, TextAlign::Right);
            }
        }
        y += font_items_table + 4.0;
        self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
        y += 6.0;

        // 6. Item Rows
        for item in &invoice.items {
            let name_lines = self.shaper.wrap_text(&item.name, col_name_w - 6.0, font_items_table, false);
            let lines_count = name_lines.len().max(1);

            let qty_str = if item.qty.fract() == 0.0 {
                format!("{:.0}", item.qty)
            } else {
                format!("{:.2}", item.qty)
            };
            let rate_str = format!("{:.2}", item.price);
            let disc_str = if item.discount > 0.0 { format!("{:.2}", item.discount) } else { "—".to_string() };
            let tot_str = format!("{:.2}", item.total);

            let row_h = (lines_count as f32) * (font_items_table + 4.0);

            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    // Qty
                    self.shaper.draw_text(pm, &qty_str, col_qty_x, y + font_items_table, font_items_table, false, TextAlign::Left);

                    // Name lines
                    for (l_idx, line) in name_lines.iter().enumerate() {
                        let line_y = y + font_items_table + (l_idx as f32 * (font_items_table + 4.0));
                        let is_urdu = TextShaper::is_urdu_or_arabic(line);
                        // If Urdu, align right in column or left? Standard is left or right based on script
                        let name_align = if is_urdu { TextAlign::Right } else { TextAlign::Left };
                        let name_x = if is_urdu { col_name_x + col_name_w - 6.0 } else { col_name_x };
                        self.shaper.draw_text(pm, line, name_x, line_y, font_items_table, false, name_align);
                    }

                    // Rate
                    self.shaper.draw_text(pm, &rate_str, col_rate_x + col_rate_w - 4.0, y + font_items_table, font_items_table, false, TextAlign::Right);

                    // Disc
                    if has_discount {
                        self.shaper.draw_text(pm, &disc_str, col_disc_x + col_disc_w - 4.0, y + font_items_table, font_items_table, false, TextAlign::Right);
                    }

                    // Total
                    self.shaper.draw_text(pm, &tot_str, col_tot_x, y + font_items_table, font_items_table, false, TextAlign::Right);
                }
            }

            y += row_h + 2.0;
        }

        y += 2.0;
        self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
        y += 6.0;

        // 6. Split / Combined Payment Breakdown (Left) & Totals Block (Right)
        let printable_w = right_margin - left_margin;
        let totals_label_x = if is_compact {
            left_margin + printable_w * 0.44
        } else {
            left_margin + printable_w * 0.48
        };

        let section_top_y = y;

        // LEFT COLUMN: Payment Breakdown
        let mut pay_y = section_top_y;
        if !invoice.payments.is_empty() {
            let pay_left_x = left_margin;
            let pay_right_x = totals_label_x - 8.0;

            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "Payment Breakdown:", pay_left_x, pay_y + font_body, font_body, true, TextAlign::Left);
                }
            }
            pay_y += font_body + 4.0;

            for p in &invoice.payments {
                if p.amount <= 0.0 && invoice.payments.len() > 1 {
                    continue;
                }
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        let is_urdu = TextShaper::is_urdu_or_arabic(&p.name);
                        let p_name = if is_urdu { p.name.clone() } else { p.name.clone() };
                        self.shaper.draw_text(pm, &p_name, pay_left_x, pay_y + font_small, font_small, false, TextAlign::Left);
                        self.shaper.draw_text(pm, &format!("Rs. {:.2}", p.amount), pay_right_x, pay_y + font_small, font_small, false, TextAlign::Right);
                    }
                }
                pay_y += font_small + 3.0;
            }
        }

        // RIGHT COLUMN: Subtotal, Discount, Tax, Grand Total, Paid Amount, Change / Return
        let mut tot_y = section_top_y;

        // Subtotal
        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, "Subtotal:", totals_label_x, tot_y + font_body, font_body, false, TextAlign::Left);
                self.shaper.draw_text(pm, &format!("Rs. {:.2}", invoice.subtotal), right_margin, tot_y + font_body, font_body, false, TextAlign::Right);
            }
        }
        tot_y += font_body + 4.0;

        // Discount
        if invoice.discount_amount > 0.0 {
            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "Discount:", totals_label_x, tot_y + font_body, font_body, false, TextAlign::Left);
                    self.shaper.draw_text(pm, &format!("-Rs. {:.2}", invoice.discount_amount), right_margin, tot_y + font_body, font_body, false, TextAlign::Right);
                }
            }
            tot_y += font_body + 4.0;
        }

        // Tax
        if invoice.tax_amount > 0.0 {
            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "Tax:", totals_label_x, tot_y + font_body, font_body, false, TextAlign::Left);
                    self.shaper.draw_text(pm, &format!("Rs. {:.2}", invoice.tax_amount), right_margin, tot_y + font_body, font_body, false, TextAlign::Right);
                }
            }
            tot_y += font_body + 4.0;
        }

        self.draw_divider(totals_label_x, right_margin, tot_y, 1.5, render, pixmap_opt);
        tot_y += 6.0;

        // Grand Total (Emphasized, Bold, Larger)
        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, "TOTAL:", totals_label_x, tot_y + font_large, font_large, true, TextAlign::Left);
                self.shaper.draw_text(pm, &format!("Rs. {:.2}", invoice.grand_total), right_margin, tot_y + font_large, font_large, true, TextAlign::Right);
            }
        }
        tot_y += font_large + 6.0;

        self.draw_divider(totals_label_x, right_margin, tot_y, 1.5, render, pixmap_opt);
        tot_y += 6.0;

        // Paid & Change
        if invoice.paid_amount > 0.0 {
            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "Paid Amount:", totals_label_x, tot_y + font_body, font_body, false, TextAlign::Left);
                    self.shaper.draw_text(pm, &format!("Rs. {:.2}", invoice.paid_amount), right_margin, tot_y + font_body, font_body, false, TextAlign::Right);
                }
            }
            tot_y += font_body + 4.0;

            if render {
                if let Some(ref mut pm) = pixmap_opt {
                    self.shaper.draw_text(pm, "Change / Return:", totals_label_x, tot_y + font_body, font_body, false, TextAlign::Left);
                    self.shaper.draw_text(pm, &format!("Rs. {:.2}", invoice.change_amount), right_margin, tot_y + font_body, font_body, false, TextAlign::Right);
                }
            }
            tot_y += font_body + 4.0;
        }

        y = pay_y.max(tot_y);

        // 8. Customer Balance
        if invoice.customer_previous_balance.is_some() || invoice.customer_new_balance.is_some() {
            y += 4.0;
            self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
            y += 6.0;

            if let Some(prev) = invoice.customer_previous_balance {
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        self.shaper.draw_text(pm, "Previous Balance:", left_margin, y + font_body, font_body, false, TextAlign::Left);
                        self.shaper.draw_text(pm, &format!("Rs. {:.2}", prev), right_margin, y + font_body, font_body, false, TextAlign::Right);
                    }
                }
                y += font_body + 4.0;
            }

            if let Some(new_b) = invoice.customer_new_balance {
                if render {
                    if let Some(ref mut pm) = pixmap_opt {
                        self.shaper.draw_text(pm, "Current Balance:", left_margin, y + font_body, font_body, true, TextAlign::Left);
                        self.shaper.draw_text(pm, &format!("Rs. {:.2}", new_b), right_margin, y + font_body, font_body, true, TextAlign::Right);
                    }
                }
                y += font_body + 4.0;
            }
        }

        // 9. FBR Invoice ID banner & QR Code + FBR Logo horizontal row
        let qr_string = invoice.fbr_invoice_id.as_deref().or(invoice.qr_data.as_deref());
        if let Some(qr_content) = qr_string {
            if !qr_content.trim().is_empty() {
                y += 6.0;
                self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
                y += 10.0;

                if let Some(ref fbr_id) = invoice.fbr_invoice_id {
                    let fbr_label = format!("FBR Invoice #: {}", fbr_id);
                    if render {
                        if let Some(ref mut pm) = pixmap_opt {
                            self.shaper.draw_text(pm, &fbr_label, center_x, y + font_body, font_body, true, TextAlign::Center);
                        }
                    }
                    y += font_body + 10.0;
                }

                // Prepare FBR logo
                let fbr_logo_b64 = invoice.fbr_logo_base64.as_deref().unwrap_or(DEFAULT_FBR_LOGO_BASE64);
                let fbr_img_opt = STANDARD.decode(fbr_logo_b64.trim()).ok()
                    .and_then(|bytes| image::load_from_memory(&bytes).ok());

                let box_size = if is_compact { 85.0 } else { 110.0 };
                let gap = if is_compact { 16.0 } else { 24.0 };

                let qr_res = QrCode::with_version(qr_content.as_bytes(), Version::Normal(2), EcLevel::M)
                    .or_else(|_| QrCode::new(qr_content.as_bytes()));

                if let Ok(qr) = qr_res {
                    let qr_modules = qr.width();
                    let module_size = (box_size / qr_modules as f32).floor().max(2.0);
                    let qr_w = qr_modules as f32 * module_size;

                    if let Some(ref fbr_img) = fbr_img_opt {
                        let (img_w, img_h) = fbr_img.dimensions();
                        let scale = (box_size / img_w as f32).min(box_size / img_h as f32).min(1.0);
                        let logo_w = (img_w as f32 * scale).round();
                        let logo_h = (img_h as f32 * scale).round();

                        let total_row_w = logo_w + gap + qr_w;
                        let start_x = center_x - (total_row_w / 2.0);
                        let row_h = box_size.max(logo_h).max(qr_w);

                        if render {
                            if let Some(ref mut pm) = pixmap_opt {
                                // Draw FBR Logo (left)
                                let resized = fbr_img.resize_exact(
                                    logo_w as u32,
                                    logo_h as u32,
                                    image::imageops::FilterType::Lanczos3,
                                );
                                let rgba = resized.to_rgba8();
                                if let Some(logo_pm) = PixmapRef::from_bytes(&rgba, logo_w as u32, logo_h as u32) {
                                    let mut paint = PixmapPaint::default();
                                    paint.quality = FilterQuality::Bilinear;
                                    let logo_y = y + ((row_h - logo_h) / 2.0);
                                    pm.draw_pixmap(
                                        start_x as i32,
                                        logo_y as i32,
                                        logo_pm,
                                        &paint,
                                        Transform::identity(),
                                        None,
                                    );
                                }

                                // Draw QR Code (right)
                                let qr_start_x = start_x + logo_w + gap;
                                let qr_start_y = y + ((row_h - qr_w) / 2.0);
                                let mut paint = Paint::default();
                                paint.set_color_rgba8(0, 0, 0, 255);
                                paint.anti_alias = false;

                                for qy in 0..qr_modules {
                                    for qx in 0..qr_modules {
                                        if qr[(qx, qy)] == qrcode::Color::Dark {
                                            let rx = qr_start_x + (qx as f32 * module_size);
                                            let ry = qr_start_y + (qy as f32 * module_size);
                                            if let Some(rect) = Rect::from_xywh(rx, ry, module_size, module_size) {
                                                pm.fill_rect(rect, &paint, Transform::identity(), None);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        y += row_h + 10.0;
                    } else {
                        // Fallback: QR code centered alone
                        let qr_start_x = center_x - (qr_w / 2.0);
                        if render {
                            if let Some(ref mut pm) = pixmap_opt {
                                let mut paint = Paint::default();
                                paint.set_color_rgba8(0, 0, 0, 255);
                                paint.anti_alias = false;

                                for qy in 0..qr_modules {
                                    for qx in 0..qr_modules {
                                        if qr[(qx, qy)] == qrcode::Color::Dark {
                                            let rx = qr_start_x + (qx as f32 * module_size);
                                            let ry = y + (qy as f32 * module_size);
                                            if let Some(rect) = Rect::from_xywh(rx, ry, module_size, module_size) {
                                                pm.fill_rect(rect, &paint, Transform::identity(), None);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        y += qr_w + 10.0;
                    }
                }
            }
        }

        // 10. Notes / Urdu Footer Message
        y += 4.0;
        self.draw_divider(left_margin, right_margin, y, 1.0, render, pixmap_opt);
        y += 8.0;

        if let Some(ref note) = invoice.notes {
            if !note.trim().is_empty() {
                let note_lines = self.shaper.wrap_text(note, w - (left_margin * 2.0), font_body, false);
                for n_line in note_lines {
                    if render {
                        if let Some(ref mut pm) = pixmap_opt {
                            self.shaper.draw_text(pm, &n_line, center_x, y + font_body, font_body, false, TextAlign::Center);
                        }
                    }
                    y += font_body + 4.0;
                }
            }
        }

        // Standard thank you note in English and Urdu
        let thank_you_en = "Thank you for your visit!";
        let thank_you_ur = "شکریہ! دوبارہ تشریف لائیں";

        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, thank_you_en, center_x, y + font_body, font_body, true, TextAlign::Center);
            }
        }
        y += font_body + 8.0;

        if render {
            if let Some(ref mut pm) = pixmap_opt {
                self.shaper.draw_text(pm, thank_you_ur, center_x, y + font_body + 2.0, font_body + 2.0, true, TextAlign::Center);
            }
        }
        y += font_body + 16.0;

        Ok(y)
    }

    fn draw_divider(
        &self,
        x1: f32,
        x2: f32,
        y: f32,
        thickness: f32,
        render: bool,
        pixmap_opt: &mut Option<&mut Pixmap>,
    ) {
        if !render {
            return;
        }
        if let Some(ref mut pm) = pixmap_opt {
            let mut paint = Paint::default();
            paint.set_color_rgba8(0, 0, 0, 255);
            paint.anti_alias = false;
            if let Some(rect) = Rect::from_xywh(x1, y, x2 - x1, thickness) {
                pm.fill_rect(rect, &paint, Transform::identity(), None);
            }
        }
    }
}
