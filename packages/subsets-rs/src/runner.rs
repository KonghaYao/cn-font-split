pub type SubsetRuntime = fn(ctx: &mut T);
pub fn createRunner<T>(runtime: Vec<SubsetRuntime>, ctx: &mut T) {
    runtime.iter().for_each(|r| r(ctx));
}

pub struct Context {}

pub fn font_split() {
    let process = vec![];
    let ctx = Context {};
    createRunner(process, ctx)
}
