mod output_css;
const HTML_TEMPLATE: &[u8] = include_bytes!("./index.html");
const INDEX_PROTO: &[u8] = include_bytes!("../../crates/proto/src/index.proto");

use crate::{message::EventFactory, runner::Context};
use cn_font_proto::api_interface::EventMessage;
pub fn link_subset(ctx: &mut Context) {
    let css = ctx.input.css.clone().unwrap_or_default();

    let css_code = output_css::output_css(ctx, &css);
    // 输出 CSS 文件
    let file_name = css.file_name.unwrap_or("result.css".to_string());
    (ctx.callback)(EventMessage::output_data(
        &file_name,
        css_code.as_bytes().to_vec(),
    ));
    (ctx.callback)(EventMessage::output_data(
        "index.html",
        HTML_TEMPLATE.to_vec(),
    ));
    (ctx.callback)(EventMessage::output_data(
        "index.proto",
        INDEX_PROTO.to_vec(),
    ));
}
