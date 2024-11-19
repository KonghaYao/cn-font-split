use std::collections::BTreeSet;
pub trait PreSubsetPlugin {
    // name: string;
    // enforce?: 'pre' | 'post';
    fn subset(subsets: &mut Vec<BTreeSet<u32>>, ctx: (), remaining_chars_set: &mut BTreeSet<u32>);
    fn after_check(ctx: ());
}
pub enum EnforeType {
    Pre,
    Post,
}



pub struct AddRemainCharsPlugin {
    name: String,
    enforce: EnforeType,
}
impl PreSubsetPlugin for AddRemainCharsPlugin {
    fn subset(subsets: &mut Vec<BTreeSet<u32>>, ctx: (), remaining_chars_set: &mut BTreeSet<u32>) {
        subsets.push(remaining_chars_set.clone());
    }

    fn after_check(ctx: ()) {
        todo!()
    }
}
