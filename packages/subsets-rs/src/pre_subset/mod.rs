mod auto_subset_plugin;
pub mod fvar;
pub mod gen_svg;
pub mod name_table;
pub mod plugin;

use crate::runner::Context;
use auto_subset_plugin::auto_subset_plugin;
use cn_font_proto::api_interface::EventMessage;
use gen_svg::gen_svg;
use harfbuzz_rs_now::{Face, Font, Owned};
use plugin::{add_remain_chars_plugin, language_area_plugin};
use std::collections::BTreeSet;
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
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(ctx.face.collect_unicodes());

    let mut font_file = Cursor::new(file_binary);
    let font =
        opentype::Font::read(&mut font_file).expect("TODO: panic message");

    if let Some(preview) = &ctx.input.preview_image {
        let text = gen_svg(&mut ctx.face, &preview.text);
        (ctx.callback)(EventMessage {
            event: "output_data".to_string(),
            message: format!("{}.svg", preview.name),
            data: Some(text.as_bytes().to_vec()),
        })
    }
    
    let chunk_size = ctx.input.chunk_size.clone().unwrap_or(1024 * 70);
    let mut subsets: Vec<BTreeSet<u32>> = vec![];
    let mut context: PreSubsetContext<'_, '_> = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut ctx.face,
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
