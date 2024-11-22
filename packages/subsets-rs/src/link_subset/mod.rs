mod output_css;
const HTML_TEMPLATE: &[u8] = include_bytes!("./index.html");
const INDEX_PROTO: &[u8] = include_bytes!("../pb/index.proto");

use crate::protos::EventMessage;
use crate::runner::Context;
pub fn link_subset(ctx: &mut Context) {
    let css = ctx.input.css.clone().unwrap_or_default();

    let css_code = output_css::output_css(ctx, &css);
    // 输出 CSS 文件
    let file_name = css.file_name.unwrap_or("result.css".to_string());
    (ctx.callback)(EventMessage {
        event: "output_data".to_string(),
        data: Option::from(css_code.as_bytes().to_vec()),
        message: Option::from(file_name),
    });
    (ctx.callback)(EventMessage {
        event: "output_data".to_string(),
        data: Option::from(HTML_TEMPLATE.to_vec()),
        message: Option::from("index.html".to_string()),
    });
    (ctx.callback)(EventMessage {
        event: "output_data".to_string(),
        data: Option::from(INDEX_PROTO.to_vec()),
        message: Option::from("index.proto".to_string()),
    });
}
