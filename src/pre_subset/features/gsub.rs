use log::error;
use opentype::Font;
use opentype::layout::{ChainedContext, Coverage, context};
use opentype::tables::GlyphSubstitution;
use opentype::tables::glyph_substitution::{LigatureSubstitution, Type};
use opentype::tape::Read as _;
use std::io::{Cursor, Seek, SeekFrom};
pub fn analyze_gsub(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> Vec<Vec<u16>> {
    let temp: Result<Option<GlyphSubstitution>, std::io::Error> =
        font.take(font_file);
    // 国标宋体，解析就报错，所以干脆先不解析
    let data = match temp {
        Ok(Some(data)) => data,
        Ok(None) => {
            error!("Font without GSUB table");
            return vec![vec![]];
        }
        Err(e) => {
            error!("{}", e);
            return vec![vec![]];
        }
    };

    // let mut feature_tags: Vec<&str> = data
    //     .features
    //     .headers
    //     .iter()
    //     .map(|h| h.tag.as_str().expect("Invalid tag"))
    //     .collect();
    // let unique_feature_tags: BTreeSet<&str> = feature_tags.drain(..).collect();

    // println!("{:?}", unique_feature_tags);
    // println!("{:?}", data.features.get(Tag::from_str("fwid").expect("222")));

    // GSUB 表的文件绝对位置，用于把 Extension 子表的相对 offset 换算成绝对位置。
    let gsub_position = font
        .offsets
        .records
        .iter()
        .find(|record| record.tag.0 == *b"GSUB")
        .map(|record| record.offset as u64);

    let mut all_maybe_relative_glyph: Vec<Vec<u16>> = vec![];
    for (lookup_index, record) in data.lookups.records.iter().enumerate() {
        // Lookup 表位置 = GSUB 起点 + lookupListOffset + lookupOffsets[i]
        let lookup_position = gsub_position.map(|position| {
            position
                + data.lookup_offset as u64
                + data.lookups.offsets.get(lookup_index).copied().unwrap_or(0)
                    as u64
        });
        for (table_index, table) in record.tables.iter().enumerate() {
            // 子表位置 = Lookup 起点 + subTableOffsets[j]
            let table_position = lookup_position.map(|position| {
                position
                    + record
                        .table_offsets
                        .get(table_index)
                        .copied()
                        .unwrap_or(0) as u64
            });
            all_maybe_relative_glyph.extend(
                collect_gsub_relations(table, table_position, font_file, 0)
                    .into_iter()
                    .filter(|i| !i.is_empty()),
            );
        }
    }
    // println!("{:?}", all_maybe_relative_glyph);
    all_maybe_relative_glyph
}

/// 收集单个 GSUB 子表涉及的交互字形。
///
/// `position` 是该子表在文件中的绝对位置：Extension Substitution（lookup type 7）
/// 只是包装，需要用它把 `offset` 换算成内部子表的绝对位置后再按内部 lookup type 处理。
fn collect_gsub_relations(
    table: &Type,
    position: Option<u64>,
    font_file: &mut Cursor<&[u8]>,
    depth: usize,
) -> Vec<Vec<u16>> {
    // 防止畸形字体里的 Extension 反复嵌套导致无限递归
    const MAX_EXTENSION_DEPTH: usize = 8;

    match table {
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
        Type::LigatureSubstitution(sub) => collect_ligature_glyph_sets(sub),
        Type::ContextualSubstitution(context) => {
            match context {
                context::Context::Format1(_context1) => (),
                context::Context::Format2(_context2) => (),
                context::Context::Format3(_context3) => (),
            }
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
                            .map(|r| {
                                (r.start_glyph_id..=r.end_glyph_id).collect()
                            })
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
                            let Some(record) = r.clone() else {
                                return vec![];
                            };
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
                ChainedContext::Format3(_ctx) => {
                    // println!("??? {:?}\n", context);
                    // ! BUG 不知为何有这种规则导致匹配贼多
                    // coverages 是触发的glyph
                    // forward_coverages 和 backward_coverages 是左右匹配的 glyph
                    // 反正所有的字形都是相关的，合并到一块
                    let result: Vec<u16> = vec![];
                    // collect_glyph_id_from_format_1_and_2(
                    //     &ctx.coverages,
                    //     &mut result,
                    // );
                    // collect_glyph_id_from_format_1_and_2(
                    //     &ctx.forward_coverages,
                    //     &mut result,
                    // );
                    // collect_glyph_id_from_format_1_and_2(
                    //     &ctx.backward_coverages,
                    //     &mut result,
                    // );
                    // println!("||| {:?}\n", result);
                    vec![result]
                }
            }
        }
        Type::ExtensionSubstitution(extension_substitution) => {
            if depth >= MAX_EXTENSION_DEPTH {
                error!("GSUB extension substitution nested too deeply");
                return vec![vec![]];
            }
            let Some(position) = position else {
                error!(
                    "GSUB extension substitution without a subtable position"
                );
                return vec![vec![]];
            };
            let inner_position =
                position + extension_substitution.offset as u64;
            if let Err(e) = font_file.seek(SeekFrom::Start(inner_position)) {
                error!("failed to seek to the GSUB extension subtable: {}", e);
                return vec![vec![]];
            }
            match font_file.take_given::<Type>(extension_substitution.r#type) {
                Ok(inner) => collect_gsub_relations(
                    &inner,
                    Some(inner_position),
                    font_file,
                    depth + 1,
                ),
                Err(e) => {
                    error!(
                        "failed to read the GSUB extension subtable (lookup type {}): {}",
                        extension_substitution.r#type, e
                    );
                    vec![vec![]]
                }
            }
        }
        Type::ReverseChainedContextualSubstibution(context) => {
            // TODO 需要测试
            // forward_coverages 和 backward_coverages 是左右匹配的 glyph
            // 反正所有的字形都是相关的，合并到一块
            let mut result: Vec<u16> = vec![];
            collect_glyph_id_from_format_1_and_2(
                &[context.coverage.clone()],
                &mut result,
            );
            collect_glyph_id_from_format_1_and_2(
                &context.forward_coverages,
                &mut result,
            );
            collect_glyph_id_from_format_1_and_2(
                &context.backward_coverages,
                &mut result,
            );
            // vec![result]
            // println!("||| {:?}\n", result);
            vec![result]
        }
        _ => vec![vec![]],
    }
}

#[test]
fn test_gsub() {
    use cn_font_utils::read_binary_file;
    let font_file = read_binary_file(
        "./packages/demo/public/WorkSans-VariableFont_wght.ttf",
    )
    .unwrap();
    let mut font_file = Cursor::new(&*font_file);
    let font = Font::read(&mut font_file).unwrap();
    let _result = analyze_gsub(&font, &mut font_file);
    // println!("{:?}", result);
}

/// 构造 Ligature 的关系集。
///
/// `records` 与 coverage 中的字形按顺序一一对应，而 `componentGlyphIDs`
/// （`ligature.glyph_ids`）不含 coverage 里的首组件，需要按序号补回去，
/// 否则 `fi`/`fl` 只会收集到 `{i}`/`{l}`。
fn collect_ligature_glyph_sets(sub: &LigatureSubstitution) -> Vec<Vec<u16>> {
    let mut first_glyphs: Vec<u16> = vec![];
    collect_glyph_id_from_format_1_and_2(
        &[sub.coverage.clone()],
        &mut first_glyphs,
    );
    sub.records
        .iter()
        .enumerate()
        .flat_map(|(index, ligature_set)| {
            let first_glyph = first_glyphs.get(index).copied();
            ligature_set
                .records
                .iter()
                .map(move |ligature| {
                    // liga 生成的 glyph 没有算入 unicode 位置，故不加入 glyph_id
                    let mut glyph_ids = ligature.glyph_ids.clone() as Vec<u16>;
                    if let Some(first_glyph) = first_glyph {
                        glyph_ids.insert(0, first_glyph);
                    }
                    glyph_ids
                })
                .collect::<Vec<Vec<u16>>>()
        })
        .collect()
}

/// 将 cover 中的 glyph_id 直接注入 result
pub fn collect_glyph_id_from_format_1_and_2(
    coverages: &[Coverage],
    result: &mut Vec<u16>,
) {
    coverages.iter().for_each(|c| match c {
        Coverage::Format1(cov) => cov.glyph_ids.iter().for_each(|center| {
            result.push(*center);
        }),
        Coverage::Format2(cov) => cov.records.iter().for_each(|r| {
            for x in r.start_glyph_id..=r.end_glyph_id {
                result.push(x);
            }
        }),
    })
}

#[test]
fn test_ligature_relations_include_first_component() {
    use opentype::layout::Coverage;
    use opentype::layout::coverage::{Coverage2, Record};
    use opentype::tables::glyph_substitution::{Ligature, Ligatures};

    let sub = LigatureSubstitution {
        format: 1,
        coverage_offset: 0,
        record_count: 2,
        record_offsets: vec![0, 0],
        coverage: Coverage::Format2(Coverage2 {
            format: 2,
            record_count: 1,
            records: vec![Record {
                start_glyph_id: 5,
                end_glyph_id: 6,
                index: 0,
            }],
        }),
        records: vec![
            Ligatures {
                count: 1,
                offsets: vec![0],
                records: vec![Ligature {
                    glyph_id: 100,
                    glyph_count: 2,
                    glyph_ids: vec![7],
                }],
            },
            Ligatures {
                count: 1,
                offsets: vec![0],
                records: vec![Ligature {
                    glyph_id: 101,
                    glyph_count: 3,
                    glyph_ids: vec![8, 9],
                }],
            },
        ],
    };

    // 修复前只收到 componentGlyphIDs（{7} / {8, 9}），漏掉 coverage 首组件
    assert_eq!(
        collect_ligature_glyph_sets(&sub),
        vec![vec![5, 7], vec![6, 8, 9]]
    );
}

#[test]
fn test_gsub_extension_substitution_expands_ligature() {
    use opentype::tables::glyph_substitution::ExtensionSubstitution;

    // 仓库里的三款字体都没有 GSUB Extension Substitution，
    // 这里手工编码一个最小的 LigatureSubstFormat1 作为 Extension 的内层子表：
    // coverage = [5]，一组 ligature：100 <- 5 + 7（componentGlyphIDs 只有 7）。
    let inner: [u16; 12] = [
        1,  // substFormat
        8,  // coverageOffset（相对内层子表起点）
        1,  // ligatureSetCount
        14, // ligatureSetOffsets[0]
        1, 1, 5, // Coverage1: format, glyphCount, glyphIDs[0]
        1, 4, // LigatureSet: ligatureCount, ligatureOffsets[0]
        100, 2,
        7, // Ligature: ligatureGlyph, componentCount, componentGlyphIDs[0]
    ];
    let mut bytes = vec![0_u8; 16];
    for value in inner {
        bytes.extend_from_slice(&value.to_be_bytes());
    }
    assert_eq!(bytes.len(), 40);

    let mut font_file = Cursor::new(&bytes[..]);
    let extension = Type::ExtensionSubstitution(ExtensionSubstitution {
        format: 1,
        r#type: 4, // LigatureSubstitution
        offset: 16,
    });
    assert_eq!(
        collect_gsub_relations(&extension, Some(0), &mut font_file, 0),
        vec![vec![5, 7]]
    );
}

#[test]
fn test_gsub_extension_substitution_depth_limit() {
    use opentype::tables::glyph_substitution::ExtensionSubstitution;

    // 指向自身的 Extension（type 7），必须被深度上限拦住而不是无限递归。
    let mut bytes = [0_u8; 8];
    bytes[0..2].copy_from_slice(&1_u16.to_be_bytes());
    bytes[2..4].copy_from_slice(&7_u16.to_be_bytes());
    bytes[4..8].copy_from_slice(&0_u32.to_be_bytes());

    let mut font_file = Cursor::new(&bytes[..]);
    let extension = Type::ExtensionSubstitution(ExtensionSubstitution {
        format: 1,
        r#type: 7,
        offset: 0,
    });
    assert_eq!(
        collect_gsub_relations(&extension, Some(0), &mut font_file, 0),
        vec![Vec::<u16>::new()]
    );
}
