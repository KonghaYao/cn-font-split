use crate::link_subset::link_subset;
use crate::pre_subset::fvar::FvarTable;
use crate::pre_subset::name_table::NameTableSets;
use crate::pre_subset::pre_subset;
use crate::run_subset::{run_subset, RunSubsetResult};
use cn_font_proto::api_interface::{EventMessage, InputTemplate, OutputReport};
use harfbuzz_rs_now::{Face, Owned};
use prost::Message;

pub struct Context<'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    pub input: &'c InputTemplate,
    pub pre_subset_result: Vec<Vec<u32>>,
    pub run_subset_result: Vec<RunSubsetResult>,
    pub name_table: NameTableSets,
    pub face: &'a mut Owned<Face<'b>>,
    pub callback: &'a dyn Fn(EventMessage),
    pub reporter: &'a mut OutputReport,
    pub fvar_table: Option<FvarTable>,
}

pub fn font_split<F: Fn(EventMessage)>(config: InputTemplate, callback: F) {
    let mut reporter = OutputReport::default();
    let binary = &config.input;
    let mut face = Face::from_bytes(&binary, 0);
    let mut ctx = Context {
        input: &config,
        pre_subset_result: vec![],
        run_subset_result: vec![],
        name_table: NameTableSets { table: vec![] },
        callback: &(|data| {
            callback(data);
        }),
        face: &mut face,
        reporter: &mut reporter,
        fvar_table: None,
    };

    ctx.reporter.version = "7.0.0".to_string();
    ctx.reporter.platform = current_platform::CURRENT_PLATFORM.to_string();
    for process in [pre_subset, run_subset, link_subset] {
        process(&mut ctx)
    }

    // name_table 转 proto
    ctx.reporter.name_table = ctx.name_table.table;
    // 日志转二进制输出
    let mut reporter_buffer = Vec::new();
    ctx.reporter.encode(&mut reporter_buffer).unwrap();

    callback(EventMessage {
        event: "output_data".to_string(),
        data: Some(reporter_buffer),
        message: "reporter.bin".to_string(),
    });

    // 发送一个结束信息
    callback(EventMessage {
        event: "end".to_string(),
        message: "end".to_string(),
        data: None,
    });
    ()
}
