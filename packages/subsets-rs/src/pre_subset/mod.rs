pub mod name_table;
mod plugin;

use crate::pre_subset::plugin::{add_remain_chars_plugin, auto_subset_plugin};
use crate::runner::Context;
use harfbuzz_rs_now::Face;
use opentype::layout::feature::Header;
use opentype::layout::{ChainedContext, Coverage};
use opentype::tables::glyph_substitution::Type;
use opentype::tables::{GlyphPositioning, GlyphSubstitution};
use opentype::truetype::tables::character_mapping::{
    Encoding, Encoding0, Encoding12, Encoding4, Encoding6,
};
use opentype::truetype::tables::CharacterMapping;
use opentype::Font;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::io::Cursor;

pub fn pre_subset(ctx: &mut Context) {
    let file_binary = &ctx.input.input;
    let face = Face::from_bytes(&ctx.input.input, 0);
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(face.collect_unicodes());

    let mut font_file = Cursor::new(file_binary);
    let font =
        opentype::Font::read(&mut font_file).expect("TODO: panic message");

    let mut subsets: Vec<BTreeSet<u32>> = vec![];
    for p in [add_remain_chars_plugin, auto_subset_plugin] {
        p(&mut subsets, &mut all_unicodes)
    }

    // let set = analyze_gsub(&font, &mut font_file);
    ctx.pre_subset_result = subsets
        .iter()
        .map(|v| v.iter().map(|i| i.clone()).collect::<Vec<u32>>())
        .collect();
    ctx.name_table = name_table::analyze_name_table(&font, &mut font_file);
}

pub fn analyze_gpos(font: &Font, font_file: &mut Cursor<&Vec<u8>>) {
    // GPOS table
    let data: GlyphPositioning = font.take(font_file).unwrap().unwrap();
    let headers: Vec<Header> = data.features.headers;
    let data: Vec<&str> =
        headers.iter().map(|h| h.tag.as_str().expect("Invalid tag")).collect();
    println!("{:?}", data);
}
pub fn analyze_cmap(
    font: &Font,
    font_file: &mut Cursor<&Vec<u8>>,
) -> HashMap<u16, u32> {
    // GSUB
    let data: CharacterMapping = font.take(font_file).unwrap().unwrap();
    let mut cmap: HashMap<u16, u32> = HashMap::new();
    fn inject_unicode_glyph_id_map(
        map: HashMap<u32, u16>,
        cmap: &mut HashMap<u16, u32>,
    ) {
        map.iter().for_each(|(k, v)| {
            cmap.insert(v.clone(), k.clone() as u32);
        })
    }
    data.encodings.iter().for_each(|e| {
        match e {
            Encoding::Format0(e) => {
                // e.glyph_ids.iter().enumerate().for_each(|(index, glyph_id)| {
                //     // 因为这个固定是由 0x80 开始的
                //     cmap.insert(0x80 + glyph_id.clone() as u32, index as u32).unwrap();
                // })
                let map = Encoding0::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap);
            }
            Encoding::Format4(e) => {
                let map = Encoding4::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format6(e) => {
                let map = Encoding6::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format12(e) => {
                let map = Encoding12::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format14(e) => {}
            Encoding::Unknown(e) => {}
        }
    });
    cmap
}
pub fn analyze_gsub(
    font: &Font,
    font_file: &mut Cursor<&Vec<u8>>,
) -> Vec<Vec<u32>> {
    let cmap = analyze_cmap(font, font_file);
    // GSUB
    let data: GlyphSubstitution = font.take(font_file).unwrap().unwrap();

    let mut feature_tags: Vec<&str> = data
        .features
        .headers
        .iter()
        .map(|h| h.tag.as_str().expect("Invalid tag"))
        .collect();
    let unique_feature_tags: HashSet<&str> = feature_tags.drain(..).collect();

    println!("{:?}", unique_feature_tags);
    // println!("{:?}", data.features.get(Tag::from_str("fwid").expect("222")));

    let records = data.lookups.records;
    let all_maybe_relative_glyph: Vec<Vec<u16>> = records
        .iter()
        .flat_map(|r| {
            r.tables
                .iter()
                .flat_map(|t| -> Vec<Vec<u16>> {
                    match t {
                        // Type::SingleSubstitution(t) => {
                        //     // TODO 检查是否单个替换是没有 unicode 值的，不影响搜索
                        //     match t {
                        //         SingleSubstitution::Format1(sub) => {
                        //             // println!("{:?}", sub);
                        //             let delta = sub.delta_glyph_id;
                        //             fn calc_delta_id(glyph_id: &GlyphID, delta: &i16) -> Vec<u16> {
                        //                 let target_id = (glyph_id.clone() as i16) + delta;
                        //                 vec![glyph_id.clone(), (target_id as u16)]
                        //             }
                        //
                        //             // SingleSubstitution1 { format: 1, coverage_offset: 160, delta_glyph_id: 154, coverage: Format1(Coverage1 { format: 1, glyph_count: 1, glyph_ids: [263] }) }
                        //             // 263 + 154 = 417 字形
                        //             match &sub.coverage {
                        //                 Coverage::Format1(cov) => {
                        //                     let result: Vec<Vec<u16>> = cov.glyph_ids.iter().map(|c| {
                        //                         calc_delta_id(c, &delta)
                        //                     }).collect();
                        //                     // println!("{:?}", result);
                        //                     result
                        //                 }
                        //                 // SingleSubstitution1 { format: 1, coverage_offset: 6, delta_glyph_id: 30, coverage: Format2(Coverage2 { format: 2, record_count: 1, records: [Record { start_glyph_id: 7562, end_glyph_id: 7571, index: 0 }] }) }
                        //                 // start_glyph_id: 7562, end_glyph_id: 7571, 形成一个 range
                        //                 Coverage::Format2(cov) => {
                        //                     let result: Vec<Vec<u16>> = cov.records.iter().flat_map(|r| {
                        //                         let result: Vec<Vec<u16>> = (r.start_glyph_id..=r.end_glyph_id).into_iter().map(|c| {
                        //                             calc_delta_id(&c, &delta)
                        //                         }).collect();
                        //                         result
                        //                     }).collect();
                        //                     // println!("{:?}", result);
                        //                     result
                        //                 }
                        //             }
                        //         }
                        //         SingleSubstitution::Format2(sub) => {
                        //             // println!("{:?}", sub);
                        //             let origin_ids = &sub.glyph_ids;
                        //             match &sub.coverage {
                        //                 Coverage::Format1(cov) => {
                        //                     // coverage 和原始 id 一一对应
                        //                     let result: Vec<Vec<u16>> = cov.glyph_ids.iter().zip(origin_ids).map(|(target, origin)| {
                        //                         vec![origin.clone(), target.clone()]
                        //                     }).collect();
                        //                     // println!("{:?}", result);
                        //                     result
                        //                 }
                        //                 Coverage::Format2(cov) => {
                        //                     // TODO 需要测试数据
                        //                     let result: Vec<Vec<u16>> = cov.records.iter().flat_map(|r| {
                        //                         let target_arr: Vec<u16> = (r.start_glyph_id..=r.end_glyph_id).collect();
                        //                         target_arr
                        //                     }).zip(origin_ids).map(|(target, origin)| {
                        //                         vec![origin.clone(), target.clone()]
                        //                     }).collect();
                        //                     result
                        //                     // println!("{:?}", result);
                        //                 }
                        //             }
                        //         }
                        //     }
                        // }
                        // Type::MultipleSubstitution(t) => {
                        //     // TODO 需要测试
                        //     // println!("{:?}", t);
                        //
                        //     vec![vec![]]
                        // }
                        // Type::AlternateSubstitution(sub) => {
                        //     // println!("{:?}", sub);
                        //     // 一对一替换 感觉没用
                        //     // let result: Vec<Vec<u16>> = sub.records.iter().map(|r| r.glyph_ids.clone()
                        //     // ).collect();
                        //     // println!("{:?}", result);
                        //     // result
                        //
                        //     vec![vec![]]
                        // }
                        Type::LigatureSubstitution(sub) => {
                            // println!("{:?}", sub);
                            let result = sub
                                .records
                                .iter()
                                .flat_map(|r| {
                                    r.records
                                        .iter()
                                        .map(|ligature|
                                            // 由于 liga 生成的 glyph 是没有算入 unicode 位置的，故不加入 glyph_id:
                                            ligature.glyph_ids.clone() as Vec<u16>)
                                        .collect::<Vec<Vec<u16>>>()
                                })
                                .collect::<Vec<Vec<u16>>>();
                            result
                        }
                        Type::ContextualSubstitution(context) => {
                            // TODO 需要测试
                            // println!("{:?}", context);
                            vec![vec![]]
                        }
                        Type::ChainedContextualSubstitution(context) => {
                            match context {
                                ChainedContext::Format1(ctx) => {
                                    // println!("{:?}", ctx);
                                    let result = match &ctx.coverage {
                                        Coverage::Format1(cov) => {
                                            vec![cov.glyph_ids.clone()]
                                        }
                                        Coverage::Format2(ctx) => ctx
                                            .records
                                            .iter()
                                            .map(|r| (r.start_glyph_id..=r.end_glyph_id).collect())
                                            .collect(),
                                    };
                                    // println!("{:?}", result);
                                    result
                                }
                                ChainedContext::Format2(ctx) => {
                                    // println!("{:?}", ctx);
                                    // TODO 需要测试
                                    ctx.records
                                        .iter()
                                        .flat_map(|r| {
                                            let record = r.clone().unwrap();
                                            record
                                                .records
                                                .iter()
                                                .flat_map(|rr| {
                                                    vec![
                                                        rr.forward_indices.clone(),
                                                        rr.backward_indices.clone(),
                                                    ]
                                                })
                                                .collect::<Vec<Vec<u16>>>()
                                        })
                                        .collect()
                                }
                                ChainedContext::Format3(ctx) => {
                                    // println!("??? {:?}\n", context);
                                    // BUG 不知为何有这种规则导致匹配贼多
                                    // coverages 是触发的glyph
                                    // forward_coverages 和 backward_coverages 是左右匹配的 glyph
                                    // 反正所有的字形都是相关的，合并到一块
                                    let mut result: Vec<u16> = vec![];
                                    collect_glyph_id_from_format_1_and_2(
                                        &ctx.coverages,
                                        &mut result,
                                    );
                                    collect_glyph_id_from_format_1_and_2(
                                        &ctx.forward_coverages,
                                        &mut result,
                                    );
                                    collect_glyph_id_from_format_1_and_2(
                                        &ctx.backward_coverages,
                                        &mut result,
                                    );
                                    // vec![result]
                                    // println!("||| {:?}\n", result);
                                    vec![result]
                                }
                            }
                        }
                        // Type::ExtensionSubstitution(t) => {
                        //     // TODO 需要测试
                        //     // println!("{:?}", t);
                        //     vec![vec![]]
                        // }
                        Type::ReverseChainedContextualSubstibution(t) => {
                            // TODO 需要测试
                            // println!("{:?}", t);
                            vec![vec![]]
                        }
                        _ => vec![vec![]],
                    }
                })
                .collect::<Vec<Vec<u16>>>()
        })
        .filter(|i| !i.is_empty())
        .collect();
    // println!("{:?}", all_maybe_relative_glyph);
    all_maybe_relative_glyph
        .iter()
        .map(|r| {
            r.iter()
                .map(|gid| cmap.get(gid).unwrap_or(&0_u32).clone())
                .collect::<Vec<u32>>()
        })
        .collect::<Vec<Vec<u32>>>()
}

/// 将 cover 中的 glyph_id 直接注入 result
fn collect_glyph_id_from_format_1_and_2(
    coverages: &Vec<Coverage>,
    result: &mut Vec<u16>,
) {
    coverages.iter().for_each(|c| match c {
        Coverage::Format1(cov) => cov.glyph_ids.iter().for_each(|center| {
            result.push(center.clone());
        }),
        Coverage::Format2(cov) => cov.records.iter().for_each(|r| {
            for x in r.start_glyph_id..=r.end_glyph_id {
                result.push(x.clone());
            }
        }),
    })
}
