use crate::pre_subset::name_table::NameTable;
use crate::pre_subset::pre_subset;
use crate::protos::{EventMessage, InputTemplate};
use crate::run_subset::{run_subset, RunSubsetResult};

pub type SubsetRuntime<T> = fn(ctx: &mut T, callback: fn(event: EventMessage));

pub struct Context {
    pub input: InputTemplate,
    pub pre_subset_result: Vec<Vec<u32>>,
    pub run_subset_result: Vec<RunSubsetResult>,
    pub name_table: NameTable,
}

pub fn font_split(config: InputTemplate, callback: fn(event: EventMessage)) {
    let mut ctx = Context {
        input: config,
        pre_subset_result: vec![],
        run_subset_result: vec![],
        name_table: NameTable { table: vec![] },
    };

    let process: Vec<SubsetRuntime<Context>> = vec![pre_subset, run_subset];
    process.iter().for_each(|r| r(&mut ctx, callback));
}
