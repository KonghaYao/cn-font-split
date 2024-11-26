mod auto_subset_plugin;
pub mod fvar;
pub mod name_table;
pub mod plugin;

use crate::runner::Context;
use auto_subset_plugin::auto_subset_plugin;
use harfbuzz_rs_now::{Face, Owned};
use plugin::{add_remain_chars_plugin, language_area_plugin};
use std::collections::{BTreeSet, HashMap, HashSet};
use std::io::Cursor;

pub struct PreSubsetContext<'a, 'b>
where
    'b: 'a,
{
    all_unicodes: BTreeSet<u32>,
    face: &'a mut Owned<Face<'b>>,
    predict_bytes_pre_subset: u32,
}
pub fn pre_subset(ctx: &mut Context) {
    let file_binary = &ctx.input.input;
    let mut face = Face::from_bytes(&ctx.input.input, 0);
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(face.collect_unicodes());

    let mut font_file = Cursor::new(file_binary);
    let font =
        opentype::Font::read(&mut font_file).expect("TODO: panic message");

    let chunk_size = ctx.input.chunk_size.clone().unwrap_or(1024 * 70);
    let mut subsets: Vec<BTreeSet<u32>> = vec![];
    let mut context = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut face,
        predict_bytes_pre_subset: chunk_size as u32,
    };
    for p in [language_area_plugin, add_remain_chars_plugin, auto_subset_plugin]
    {
        p(&mut subsets, &mut all_unicodes, &mut context);
    }

    // let set = analyze_gsub(&font, &mut font_file);
    ctx.pre_subset_result = subsets
        .iter()
        .map(|v| v.iter().map(|i| i.clone()).collect::<Vec<u32>>())
        .collect();
    ctx.name_table = name_table::analyze_name_table(&font, &mut font_file);
}
