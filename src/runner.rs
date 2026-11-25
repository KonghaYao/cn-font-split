use crate::error::{FontSplitError, Result};
use crate::link_subset::link_subset;
use crate::loader::smart_load_woff2;
use crate::message::EventFactory;
use crate::pre_subset::fvar::FvarTable;
use crate::pre_subset::name_table::NameTableSets;
use crate::pre_subset::pre_subset;
use crate::run_subset::{RunSubsetResult, run_subset};
use cn_font_proto::api_interface::{EventMessage, InputTemplate, OutputReport};
use harfbuzz_rs_now::{Face, Owned};
use log::info;
use prost::Message;

pub struct Context<'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    pub input: &'c InputTemplate,
    pub binary: &'c [u8],
    pub pre_subset_result: Vec<Vec<u32>>,
    pub run_subset_result: Vec<RunSubsetResult>,
    pub name_table: NameTableSets,
    pub face: &'a mut Owned<Face<'b>>,
    pub callback: &'a dyn Fn(EventMessage),
    pub reporter: &'a mut OutputReport,
    pub fvar_table: Option<FvarTable>,
}

pub fn create_context<'a, 'b, 'c, F: Fn(EventMessage)>(
    config: &'c InputTemplate,
    binary: &'c [u8],
    face: &'a mut Owned<Face<'b>>,
    reporter: &'a mut OutputReport,
    callback: &'a F,
) -> Context<'a, 'b, 'c> {
    let ctx = Context {
        input: config,
        binary,
        pre_subset_result: vec![],
        run_subset_result: vec![],
        name_table: NameTableSets { table: vec![] },
        callback,
        face,
        reporter,
        fvar_table: None, // 防止后文拿到default数据，所以填 None
    };
    ctx.reporter.version = env!("CARGO_PKG_VERSION").to_string();
    ctx.reporter.platform = current_platform::CURRENT_PLATFORM.to_string();

    info!(
        "version {}; platform {}",
        ctx.reporter.version, ctx.reporter.platform
    );
    ctx
}

/// 入口校验：在读取/解析字体之前把用户输入问题转成结构化错误。
fn validate_config(config: &InputTemplate) -> Result<()> {
    if config.input.is_empty() {
        return Err(FontSplitError::EmptyInput);
    }

    for (index, subset) in config.subsets.iter().enumerate() {
        if subset.len() % 4 != 0 {
            return Err(FontSplitError::InvalidSubsets(format!(
                "subsets[{index}] 的字节长度 {} 不是 4 的倍数",
                subset.len()
            )));
        }
    }

    // chunk_size 会被转换为 u32 用作分包字节预算；
    // 0 会让 `split_vector` 每次取 0 个字符而陷入死循环，负数则会被
    // 当成巨大的 u32，因此必须在入口拒绝。
    if let Some(chunk_size) = config.chunk_size {
        if chunk_size <= 0 {
            return Err(FontSplitError::InvalidConfig(format!(
                "chunk_size 必须大于 0，当前为 {chunk_size}"
            )));
        }
    }

    // 该字段当前未参与分包计算，但非法值说明调用方配置有误，仍然拒绝。
    if let Some(count) = config.max_allow_subsets_count {
        if count <= 0 {
            return Err(FontSplitError::InvalidConfig(format!(
                "max_allow_subsets_count 必须大于 0，当前为 {count}"
            )));
        }
    }

    Ok(())
}

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
    config: &InputTemplate,
    callback: &F,
) -> Result<()> {
    validate_config(config)?;

    let mut reporter = OutputReport::default();
    let binary = smart_load_woff2(&config.input)?;
    let mut face = Face::from_bytes(&binary, 0);
    let mut ctx =
        create_context(config, &binary, &mut face, &mut reporter, callback);

    pre_subset(&mut ctx)?;
    run_subset(&mut ctx)?;
    link_subset(&mut ctx)?;

    // name_table 转 proto
    ctx.reporter.name_table = ctx.name_table.table;
    // 日志转二进制输出
    let mut reporter_buffer = Vec::new();
    ctx.reporter.encode(&mut reporter_buffer).map_err(|e| {
        FontSplitError::Internal(format!("reporter 序列化失败: {e}"))
    })?;

    if ctx.input.reporter.unwrap_or(true) {
        callback(EventMessage::output_data("reporter.bin", reporter_buffer));
    }

    // 发送一个结束信息
    callback(EventMessage::create_end_message());
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::message;

    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn test_create_context() {
        let input = InputTemplate { ..Default::default() };
        let binary = vec![0u8; 100];
        let mut face = Face::from_bytes(&binary, 0);
        let mut reporter = OutputReport::default();
        let callback = |_msg: EventMessage| {};

        let ctx = create_context(
            &input,
            &binary,
            &mut face,
            &mut reporter,
            &callback,
        );

        assert!(ctx.pre_subset_result.is_empty());
        assert!(ctx.run_subset_result.is_empty());
        assert!(ctx.name_table.table.is_empty());
        assert!(ctx.fvar_table.is_none());
    }
}
