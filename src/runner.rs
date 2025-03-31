use crate::link_subset::link_subset;
use crate::loader::smart_load_woff2;
use crate::message::EventFactory;
use crate::pre_subset::fvar::FvarTable;
use crate::pre_subset::name_table::NameTableSets;
use crate::pre_subset::pre_subset;
use crate::run_subset::{run_subset, RunSubsetResult};
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
    Context {
        input: config,
        binary,
        pre_subset_result: vec![],
        run_subset_result: vec![],
        name_table: NameTableSets { table: vec![] },
        callback,
        face,
        reporter,
        fvar_table: None, // 防止后文拿到default数据，所以填 None
    }
}

pub fn font_split<F: Fn(EventMessage)>(config: InputTemplate, callback: F) {
    let mut reporter = OutputReport::default();
    let binary = smart_load_woff2(&config.input);
    let mut face = Face::from_bytes(&binary, 0);
    let mut ctx =
        create_context(&config, &binary, &mut face, &mut reporter, &callback);

    ctx.reporter.version = env!("CARGO_PKG_VERSION").to_string();
    ctx.reporter.platform = current_platform::CURRENT_PLATFORM.to_string();

    info!(
        "version {}; platform {}",
        ctx.reporter.version, ctx.reporter.platform
    );

    for process in [pre_subset, run_subset, link_subset] {
        process(&mut ctx)
    }

    // name_table 转 proto
    ctx.reporter.name_table = ctx.name_table.table;
    // 日志转二进制输出
    let mut reporter_buffer = Vec::new();
    ctx.reporter.encode(&mut reporter_buffer).unwrap();

    if ctx.input.reporter.unwrap_or(true) {
        callback(EventMessage::output_data("reporter.bin", reporter_buffer));
    }

    // 发送一个结束信息
    callback(EventMessage::create_end_message());
    ()
}
