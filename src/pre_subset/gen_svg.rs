use crate::config::Config;
use harfbuzz_rs_now::{Face, Font, Owned};

pub fn gen_svg(face: &Owned<Face<'_>>, text: &str) -> String {
    let mut font = Font::new(Face::new(face.face_data(), 0));
    font.render_svg_text(text, &[])
}

/// 生成 `previewImage` 对应的 SVG 附加文件，返回 `(文件名, 内容)`。
///
/// 未配置 `previewImage` 时返回空列表。文件仍由 pre 阶段产生，
/// 只是 emit 上移到 [`crate::font_split`]，事件顺序不变。
pub fn gen_svg_extra_files(
    config: &Config,
    face: &Owned<Face<'_>>,
) -> Vec<(String, Vec<u8>)> {
    let Some(preview) = &config.preview_image else {
        return vec![];
    };
    let text = gen_svg(face, &preview.text);
    let name = if preview.name.is_empty() {
        String::from("preview")
    } else {
        preview.name.clone()
    };
    vec![(format!("{}.svg", name), text.as_bytes().to_vec())]
}
