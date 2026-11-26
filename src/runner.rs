use crate::config::Config;
use crate::contract::FontSource;
use crate::error::{FontSplitError, Result};
use crate::link_subset::link_subset;
use crate::loader::smart_load_woff2;
use crate::message::EventFactory;
use crate::pre_subset::pre_subset;
use crate::run_subset::run_subset;
use cn_font_proto::api_interface::{EventMessage, InputTemplate, OutputReport};
use harfbuzz_rs_now::Face;
use log::info;
use prost::Message;

/// 核心入口：把 wire IR 解析成 [`Config`] 后依次执行
/// `pre_subset` → `run_subset` → `link_subset`，通过 callback 输出事件。
///
/// 入口校验已迁入 [`Config::from_template`]，错误仍以 `FontSplitError` 返回，
/// 并在此之前发出一个 Error 事件。
pub fn font_split<F: Fn(EventMessage)>(
    config: InputTemplate,
    callback: F,
) -> Result<()> {
    match font_split_inner(&config, &callback) {
        Ok(()) => Ok(()),
        Err(err) => {
            // 先发 Error 事件（CLI/FFI/JS 统一从事件流拿结构化错误），再返回 Err。
            callback(EventMessage::error(err.to_string()));
            Err(err)
        }
    }
}

fn font_split_inner<F: Fn(EventMessage)>(
    template: &InputTemplate,
    callback: &F,
) -> Result<()> {
    let config = Config::from_template(template)?;

    let loaded = smart_load_woff2(&config.input)?;
    let binary: &[u8] = loaded.as_ref();
    let mut source = FontSource { binary, face: Face::from_bytes(binary, 0) };

    let mut reporter = OutputReport {
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: current_platform::CURRENT_PLATFORM.to_string(),
        ..Default::default()
    };

    info!("version {}; platform {}", reporter.version, reporter.platform);

    let pre = pre_subset(&mut source, &config)?;
    // 事件顺序固定为 svg(pre) → woff2 → css → html → proto。
    emit_files(callback, &pre.extra_files);

    let run = run_subset(&source, &config, &pre)?;
    emit_files(callback, &run.files);

    let link = link_subset(&config, &pre, &run)?;
    callback(EventMessage::output_data(
        &config.css.file_name,
        link.css.into_bytes(),
    ));
    emit_files(callback, &link.extra_files);

    // reporter 组装集中在这里；字段来源与拆分前三段各自写入时一致。
    reporter.name_table = pre.name_table.table;
    reporter.subset_detail = run.details;
    reporter.bundle_message = Some(run.bundle);
    reporter.css = Some(link.css_report);

    // 日志转二进制输出
    let mut reporter_buffer = Vec::new();
    reporter.encode(&mut reporter_buffer).map_err(|e| {
        FontSplitError::Internal(format!("reporter 序列化失败: {e}"))
    })?;

    if config.reporter {
        callback(EventMessage::output_data("reporter.bin", reporter_buffer));
    }

    // 发送一个结束信息
    callback(EventMessage::create_end_message());
    Ok(())
}

/// 按阶段产物的顺序发出 `OutputData` 事件。
fn emit_files<F: Fn(EventMessage)>(callback: &F, files: &[(String, Vec<u8>)]) {
    for (name, data) in files {
        callback(EventMessage::output_data(name, data.clone()));
    }
}

#[cfg(test)]
mod tests {

    use super::*;

    #[test]
    fn test_font_source() {
        let binary = vec![0u8; 100];
        let source =
            FontSource { binary: &binary, face: Face::from_bytes(&binary, 0) };

        assert_eq!(source.binary.len(), binary.len());
        // 全零字节不是有效字体，harfbuzz 仍会给出一个空 face。
        assert!(source.face.collect_unicodes().is_empty());
    }
}
