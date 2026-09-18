use std::str::FromStr;
use tiny_skia::*;
use ttf_parser::{Face, GlyphId, OutlineBuilder};
use rustybuzz::{Face as RbFace, UnicodeBuffer, Direction, script, Language};
use unicode_bidi::BidiInfo;

const NOTO_URDU_REGULAR: &[u8] = include_bytes!("../../fonts/NotoNastaliqUrdu-Regular.ttf");
const NOTO_URDU_BOLD: &[u8] = include_bytes!("../../fonts/NotoNastaliqUrdu-Bold.ttf");
const CALIBRI_REGULAR: &[u8] = include_bytes!("../../fonts/calibri-regular.ttf");
const CALIBRI_BOLD: &[u8] = include_bytes!("../../fonts/calibri-bold.ttf");

struct GlyphOutlineBuilder {
    path_builder: PathBuilder,
    scale: f32,
    offset_x: f32,
    offset_y: f32,
}

impl OutlineBuilder for GlyphOutlineBuilder {
    fn move_to(&mut self, x: f32, y: f32) {
        self.path_builder.move_to(
            self.offset_x + x * self.scale,
            self.offset_y - y * self.scale,
        );
    }
    fn line_to(&mut self, x: f32, y: f32) {
        self.path_builder.line_to(
            self.offset_x + x * self.scale,
            self.offset_y - y * self.scale,
        );
    }
    fn quad_to(&mut self, x1: f32, y1: f32, x: f32, y: f32) {
        self.path_builder.quad_to(
            self.offset_x + x1 * self.scale,
            self.offset_y - y1 * self.scale,
            self.offset_x + x * self.scale,
            self.offset_y - y * self.scale,
        );
    }
    fn curve_to(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, x: f32, y: f32) {
        self.path_builder.cubic_to(
            self.offset_x + x1 * self.scale,
            self.offset_y - y1 * self.scale,
            self.offset_x + x2 * self.scale,
            self.offset_y - y2 * self.scale,
            self.offset_x + x * self.scale,
            self.offset_y - y * self.scale,
        );
    }
    fn close(&mut self) {
        self.path_builder.close();
    }
}

struct ShapedRun<'a> {
    face: &'a Face<'static>,
    scale: f32,
    glyph_infos: Vec<rustybuzz::GlyphInfo>,
    glyph_positions: Vec<rustybuzz::GlyphPosition>,
    width: f32,
}

pub struct TextShaper {
    urdu_reg_face: Face<'static>,
    urdu_bold_face: Face<'static>,
    urdu_reg_rb: RbFace<'static>,
    urdu_bold_rb: RbFace<'static>,

    lat_reg_face: Face<'static>,
    lat_bold_face: Face<'static>,
    lat_reg_rb: RbFace<'static>,
    lat_bold_rb: RbFace<'static>,
}

impl TextShaper {
    pub fn new() -> Result<Self, String> {
        let urdu_reg_face = Face::parse(NOTO_URDU_REGULAR, 0)
            .map_err(|e| format!("Failed to parse NotoNastaliqUrdu-Regular: {:?}", e))?;
        let urdu_bold_face = Face::parse(NOTO_URDU_BOLD, 0)
            .map_err(|e| format!("Failed to parse NotoNastaliqUrdu-Bold: {:?}", e))?;
        let urdu_reg_rb = RbFace::from_slice(NOTO_URDU_REGULAR, 0)
            .ok_or_else(|| "Failed to parse NotoNastaliqUrdu-Regular for rustybuzz".to_string())?;
        let urdu_bold_rb = RbFace::from_slice(NOTO_URDU_BOLD, 0)
            .ok_or_else(|| "Failed to parse NotoNastaliqUrdu-Bold for rustybuzz".to_string())?;

        let lat_reg_face = Face::parse(CALIBRI_REGULAR, 0)
            .map_err(|e| format!("Failed to parse calibri-regular: {:?}", e))?;
        let lat_bold_face = Face::parse(CALIBRI_BOLD, 0)
            .map_err(|e| format!("Failed to parse calibri-bold: {:?}", e))?;
        let lat_reg_rb = RbFace::from_slice(CALIBRI_REGULAR, 0)
            .ok_or_else(|| "Failed to parse calibri-regular for rustybuzz".to_string())?;
        let lat_bold_rb = RbFace::from_slice(CALIBRI_BOLD, 0)
            .ok_or_else(|| "Failed to parse calibri-bold for rustybuzz".to_string())?;

        Ok(Self {
            urdu_reg_face,
            urdu_bold_face,
            urdu_reg_rb,
            urdu_bold_rb,
            lat_reg_face,
            lat_bold_face,
            lat_reg_rb,
            lat_bold_rb,
        })
    }

    pub fn is_urdu_or_arabic(text: &str) -> bool {
        text.chars().any(|c| {
            matches!(c,
                '\u{0600}'..='\u{06FF}' |
                '\u{0750}'..='\u{077F}' |
                '\u{08A0}'..='\u{08FF}' |
                '\u{FB50}'..='\u{FDFF}' |
                '\u{FE70}'..='\u{FEFF}'
            )
        })
    }

    fn shape_runs<'a>(&'a self, text: &str, size_pt: f32, bold: bool) -> Vec<ShapedRun<'a>> {
        if text.is_empty() {
            return Vec::new();
        }

        let has_urdu = Self::is_urdu_or_arabic(text);
        let mut runs = Vec::new();

        if !has_urdu {
            let (face, rb_face) = if bold {
                (&self.lat_bold_face, &self.lat_bold_rb)
            } else {
                (&self.lat_reg_face, &self.lat_reg_rb)
            };
            let scale = size_pt / (face.units_per_em() as f32);
            let mut buffer = UnicodeBuffer::new();
            buffer.push_str(text);
            buffer.set_direction(Direction::LeftToRight);
            buffer.set_script(script::LATIN);
            buffer.set_language(Language::from_str("eng").unwrap());

            let glyph_buffer = rustybuzz::shape(rb_face, &[], buffer);
            let infos = glyph_buffer.glyph_infos().to_vec();
            let positions = glyph_buffer.glyph_positions().to_vec();
            let width = positions.iter().map(|p| (p.x_advance as f32) * scale).sum();
            runs.push(ShapedRun {
                face,
                scale,
                glyph_infos: infos,
                glyph_positions: positions,
                width,
            });
        } else {
            let bidi_info = BidiInfo::new(text, Some(unicode_bidi::Level::rtl()));
            for para in &bidi_info.paragraphs {
                let line = para.range.clone();
                let (levels, v_runs) = bidi_info.visual_runs(para, line);
                for run in v_runs {
                    let subtext = &text[run.clone()];
                    if subtext.is_empty() {
                        continue;
                    }
                    let is_rtl = levels[run.start].is_rtl();
                    let is_urdu_run = Self::is_urdu_or_arabic(subtext);

                    let (face, rb_face) = if is_urdu_run {
                        if bold { (&self.urdu_bold_face, &self.urdu_bold_rb) } else { (&self.urdu_reg_face, &self.urdu_reg_rb) }
                    } else {
                        if bold { (&self.lat_bold_face, &self.lat_bold_rb) } else { (&self.lat_reg_face, &self.lat_reg_rb) }
                    };

                    let scale = size_pt / (face.units_per_em() as f32);
                    let mut buffer = UnicodeBuffer::new();
                    buffer.push_str(subtext);
                    if is_rtl {
                        buffer.set_direction(Direction::RightToLeft);
                        buffer.set_script(script::ARABIC);
                        buffer.set_language(Language::from_str("urd").unwrap());
                    } else {
                        buffer.set_direction(Direction::LeftToRight);
                        buffer.set_script(script::LATIN);
                        buffer.set_language(Language::from_str("eng").unwrap());
                    }

                    let glyph_buffer = rustybuzz::shape(rb_face, &[], buffer);
                    let infos = glyph_buffer.glyph_infos().to_vec();
                    let positions = glyph_buffer.glyph_positions().to_vec();
                    let width = positions.iter().map(|p| (p.x_advance as f32) * scale).sum();
                    runs.push(ShapedRun {
                        face,
                        scale,
                        glyph_infos: infos,
                        glyph_positions: positions,
                        width,
                    });
                }
            }
        }

        runs
    }

    /// Measure width and vertical metrics of a single line of text
    pub fn measure_line(&self, text: &str, size_pt: f32, bold: bool) -> f32 {
        let runs = self.shape_runs(text, size_pt, bold);
        runs.iter().map(|r| r.width).sum()
    }

    /// Draws shaped text at the given baseline (x, y).
    /// If align is:
    /// - `Align::Left`: x is the left edge
    /// - `Align::Right`: x is the right edge
    /// - `Align::Center`: x is the horizontal center
    pub fn draw_text(
        &self,
        pixmap: &mut Pixmap,
        text: &str,
        x: f32,
        y: f32,
        size_pt: f32,
        bold: bool,
        align: TextAlign,
    ) {
        let runs = self.shape_runs(text, size_pt, bold);
        if runs.is_empty() {
            return;
        }

        let total_width: f32 = runs.iter().map(|r| r.width).sum();
        let mut cursor_x = match align {
            TextAlign::Left => x,
            TextAlign::Center => x - (total_width / 2.0),
            TextAlign::Right => x - total_width,
        };

        let mut paint = Paint::default();
        paint.set_color_rgba8(0, 0, 0, 255);
        paint.anti_alias = true;

        for run in runs {
            let mut run_cursor_y = y;
            for (info, pos) in run.glyph_infos.iter().zip(run.glyph_positions.iter()) {
                let glyph_id = GlyphId(info.glyph_id as u16);
                let gx = cursor_x + (pos.x_offset as f32) * run.scale;
                let gy = run_cursor_y - (pos.y_offset as f32) * run.scale;

                let mut builder = GlyphOutlineBuilder {
                    path_builder: PathBuilder::new(),
                    scale: run.scale,
                    offset_x: gx,
                    offset_y: gy,
                };

                if let Some(_bbox) = run.face.outline_glyph(glyph_id, &mut builder) {
                    if let Some(path) = builder.path_builder.finish() {
                        pixmap.fill_path(
                            &path,
                            &paint,
                            FillRule::Winding,
                            Transform::identity(),
                            None,
                        );
                    }
                }

                cursor_x += (pos.x_advance as f32) * run.scale;
                run_cursor_y -= (pos.y_advance as f32) * run.scale;
            }
        }
    }

    /// Wrap text into multiple lines that fit within max_width
    pub fn wrap_text(&self, text: &str, max_width: f32, size_pt: f32, bold: bool) -> Vec<String> {
        let words: Vec<&str> = text.split_whitespace().collect();
        if words.is_empty() {
            return Vec::new();
        }

        let mut lines = Vec::new();
        let mut current_line = String::new();

        for word in words {
            let test_line = if current_line.is_empty() {
                word.to_string()
            } else {
                format!("{} {}", current_line, word)
            };

            let width = self.measure_line(&test_line, size_pt, bold);
            if width <= max_width {
                current_line = test_line;
            } else {
                if !current_line.is_empty() {
                    lines.push(current_line);
                }
                current_line = word.to_string();
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }

        lines
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextAlign {
    Left,
    Center,
    Right,
}
