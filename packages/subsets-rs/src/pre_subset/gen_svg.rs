use harfbuzz_rs_now::{Face, Font, Owned};

pub fn gen_svg(face: &Owned<Face<'_>>, text: &str) -> String {
    let mut font = Font::new(Face::new(face.face_data(),0));
    font.render_svg_text(text, &[])
}
