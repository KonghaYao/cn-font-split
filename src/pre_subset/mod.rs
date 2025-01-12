pub mod features;
pub mod fvar;
pub mod gen_svg;
pub mod name_table;
pub mod plugin;
mod plugin_auto_subset;

use crate::runner::Context;
mod plugin_add_user_subset;
use cn_font_utils::u8_array_to_u32_array;
use features::features_plugin;
use gen_svg::gen_svg_from_ctx;
use harfbuzz_rs_now::{Face, Owned};
use plugin::{
    add_remain_chars_plugin, language_area_plugin, reduce_min_plugin,
};
use plugin_auto_subset::plugin_auto_subset;
use std::collections::BTreeSet;
use std::io::Cursor;

pub struct PreSubsetContext<'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    all_unicodes: BTreeSet<u32>,
    face: &'a mut Owned<Face<'b>>,
    predict_bytes_pre_subset: u32,
    font: &'a opentype::Font,
    font_file: &'a mut Cursor<&'c Vec<u8>>,
    subsets: &'c Vec<Vec<u32>>,
}

pub fn pre_subset(ctx: &mut Context) {
    let file_binary = &ctx.input.input;
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(ctx.face.collect_unicodes());

    let mut font_file = Cursor::new(file_binary);
    let font = opentype::Font::read(&mut font_file)
        .expect("cn-font-split | pre_subset | read font file error");

    gen_svg_from_ctx(ctx);

    // 每个包的大小
    let chunk_size = ctx.input.chunk_size.unwrap_or(1024 * 70);
    let mut subsets: Vec<BTreeSet<u32>> = vec![];
    let user_subsets: Vec<Vec<u32>> =
        ctx.input.subsets.iter().map(|x| u8_array_to_u32_array(x)).collect();
    let mut context = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut ctx.face,
        predict_bytes_pre_subset: chunk_size as u32,
        font: &font,
        subsets: &user_subsets,
        font_file: &mut font_file,
    };

    let mut process: Vec<
        fn(
            &mut Vec<BTreeSet<u32>>,
            &mut BTreeSet<u32>,
            &mut PreSubsetContext<'_, '_, '_>,
        ),
    > = vec![];
    process.push(plugin_add_user_subset::plugin_add_user_subset);
    if ctx.input.language_areas.unwrap_or(true) {
        process.push(language_area_plugin);
    }
    if ctx.input.auto_subset.unwrap_or(true) {
        process.push(add_remain_chars_plugin);
    }
    if ctx.input.auto_subset.unwrap_or(true) {
        process.push(plugin_auto_subset);
    }
    if ctx.input.font_feature.unwrap_or(true) {
        process.push(features_plugin);
    }
    if ctx.input.reduce_mins.unwrap_or(true) {
        process.push(reduce_min_plugin);
    }
    for p in process {
        p(&mut subsets, &mut all_unicodes, &mut context);
    }

    // let set = analyze_gsub(&font, &mut font_file);
    ctx.pre_subset_result = subsets
        .iter()
        .filter(|v| v.len() > 0)
        .map(|v| v.iter().map(|i| i.clone()).collect::<Vec<u32>>())
        .collect();
    ctx.name_table = name_table::analyze_name_table(&font, &mut font_file);
}
