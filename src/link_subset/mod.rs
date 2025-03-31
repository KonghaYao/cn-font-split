mod css;
pub(crate) mod name_template;
mod output_css;
use crate::{message::EventFactory, runner::Context};
use cn_font_proto::{api_interface::EventMessage, INDEX_PROTO};
const HTML_TEMPLATE: &[u8] = include_bytes!("./index.html");

// 公共的文件输出逻辑
fn output_file(ctx: &mut Context, file_name: &str, content: Vec<u8>) {
    (ctx.callback)(EventMessage::output_data(file_name, content));
}

pub fn link_subset(ctx: &mut Context) {
    let css = ctx.input.css.clone().unwrap_or_default();

    let css_code = output_css::output_css(ctx, &css);
    // 输出 CSS 文件
    let css_file_name = css.file_name.unwrap_or("result.css".to_string());
    output_file(ctx, &css_file_name, css_code.as_bytes().to_vec());

    // 输出 HTML 文件（如果需要）
    if ctx.input.test_html.unwrap_or(true) {
        output_file(ctx, "index.html", HTML_TEMPLATE.to_vec());
    }

    // 输出 PROTO 文件
    output_file(ctx, "index.proto", INDEX_PROTO.to_vec());
}
