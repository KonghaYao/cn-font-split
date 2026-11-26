mod css;
pub(crate) mod name_template;
mod output_css;
use crate::config::Config;
use crate::error::Result;
use crate::runner::{LinkSubsetOutput, PreSubsetOutput, RunSubsetOutput};
use cn_font_proto::INDEX_PROTO;
const HTML_TEMPLATE: &[u8] = include_bytes!("./index.html");

pub fn link_subset(
    config: &Config,
    pre: &PreSubsetOutput,
    run: &RunSubsetOutput,
) -> Result<LinkSubsetOutput> {
    // CSS header 里的版本号与 `OutputReport::version` 同源（编译期常量），
    // 因此拆分后产物逐字节不变。
    let css = output_css::output_css(
        &config.css,
        env!("CARGO_PKG_VERSION"),
        &pre.name_table,
        pre.fvar.as_ref(),
        &run.items,
    );

    // 附带产物的顺序与拆分前一致：html 在前，proto 在后。
    let mut extra_files = Vec::with_capacity(2);
    if config.test_html {
        extra_files.push(("index.html".to_string(), HTML_TEMPLATE.to_vec()));
    }
    extra_files.push(("index.proto".to_string(), INDEX_PROTO.to_vec()));
    Ok(LinkSubsetOutput { css: css.code, extra_files, css_report: css.report })
}
