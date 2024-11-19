use crate::protos::{EventMessage, InputTemplate};
use crate::pre_subset::{pre_subset};
use crate::run_subset::{run_subset};

pub type SubsetRuntime<T> = fn(ctx: &mut T, callback: fn(event: EventMessage));

pub struct Context {
    pub input: InputTemplate,
    pub pre_subset_result: Option<Vec<Vec<u32>>>,
}

pub fn font_split(config: InputTemplate, callback: fn(event: EventMessage)) {
    let process: Vec<SubsetRuntime<Context>> = vec![
        pre_subset,
        run_subset,
    ];
    let mut ctx = Context {
        input: config,
        pre_subset_result: None,
    };

    process.iter().for_each(|r| r(&mut ctx, callback));
}

