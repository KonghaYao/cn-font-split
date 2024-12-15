mod auto_subset_plugin;
pub mod features;
pub mod fvar;
pub mod gen_svg;
pub mod name_table;
pub mod plugin;

use crate::runner::Context;
use auto_subset_plugin::auto_subset_plugin;
use features::features_plugin;
use gen_svg::gen_svg_from_ctx;
use harfbuzz_rs_now::{Face, Owned};
use plugin::{add_remain_chars_plugin, language_area_plugin};
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
}

pub fn pre_subset(ctx: &mut Context) {
    let file_binary = &ctx.input.input;
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(ctx.face.collect_unicodes());

    let mut font_file = Cursor::new(file_binary);
    let font = opentype::Font::read(&mut font_file)
        .expect("cn-font-split | pre_subset | read otp file error");

    gen_svg_from_ctx(ctx);

    // 每个包的大小
    let chunk_size = ctx.input.chunk_size.unwrap_or(1024 * 70);
    let mut subsets: Vec<BTreeSet<u32>> = vec![];
    let mut context = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut ctx.face,
        predict_bytes_pre_subset: chunk_size as u32,
        font: &font,
        font_file: &mut font_file,
    };

    for p in [
        language_area_plugin,
        add_remain_chars_plugin,
        auto_subset_plugin,
        features_plugin,
    ] {
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
