use harfbuzz_rs_now::{Face, Font, Owned};

pub fn gen_svg(face: &Owned<Face<'_>>, text: &str) -> String {
    let mut font = Font::new(Face::new(face.face_data(), 0));
    font.render_svg_text(text, &[])
}

/// 直接从字体文件创建 svg 字符串
pub fn gen_svg_from_font_file(file: &[u8], text: &str) -> String {
    let face = Face::from_bytes(file, 0);
    let mut font = Font::new(face);
    font.render_svg_text(text, &[])
}
