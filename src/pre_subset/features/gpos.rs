use log::error;
use opentype::Font;
use opentype::layout::Class;
use opentype::tables::glyph_positioning::Type;
use opentype::tables::{GlyphPositioning, glyph_positioning};
use opentype::tape::Read as _;
use std::io::{Cursor, Seek, SeekFrom};

use crate::pre_subset::features::gsub::collect_glyph_id_from_format_1_and_2;

pub fn analyze_gpos(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> Vec<Vec<u16>> {
    // GPOS table
    let data: Option<GlyphPositioning> =
        font.take(font_file).ok().and_then(|nested_option| nested_option);
    // 无 GPOS 表（或解析失败）时跳过字距特性分析。
    let Some(data) = data else {
        return vec![];
    };

    // let headers: Vec<Header> = data.features.headers;
    // let feature_tags: Vec<&str> =
    //     headers.iter().map(|h| h.tag.as_str().expect("Invalid tag")).collect();
    // println!("{:?}", feature_tags);

    // data.scripts
    //     .records
    //     .iter()
    //     .map(|x| x.default_language.unwrap())
    //     .filter(|x| x.feature_index_count > 1)
    //     .collect();

    // GPOS 表的文件绝对位置，用于把 Extension 子表的相对 offset 换算成绝对位置。
    let gpos_position = font
        .offsets
        .records
        .iter()
        .find(|record| record.tag.0 == *b"GPOS")
        .map(|record| record.offset as u64);

    let mut relation_list: Vec<Vec<u16>> = vec![];
    for (lookup_index, lookup) in data.lookups.records.iter().enumerate() {
        // Lookup 表位置 = GPOS 起点 + lookupListOffset + lookupOffsets[i]
        let lookup_position = gpos_position.map(|position| {
            position
                + data.lookup_offset as u64
                + data.lookups.offsets.get(lookup_index).copied().unwrap_or(0)
                    as u64
        });
        for (table_index, table) in lookup.tables.iter().enumerate() {
            // 子表位置 = Lookup 起点 + subTableOffsets[j]
            let table_position = lookup_position.map(|position| {
                position
                    + lookup
                        .table_offsets
                        .get(table_index)
                        .copied()
                        .unwrap_or(0) as u64
            });
            collect_gpos_relations(
                table,
                table_position,
                font_file,
                &mut relation_list,
                0,
            );
        }
    }
    relation_list
}

/// 收集单个 GPOS 子表涉及的交互字形。
///
/// `position` 是该子表在文件中的绝对位置：Extension Positioning（lookup type 9）
/// 只是包装，需要用它把 `offset` 换算成内部子表的绝对位置后再按内部 lookup type 处理。
fn collect_gpos_relations(
    table: &Type,
    position: Option<u64>,
    font_file: &mut Cursor<&[u8]>,
    relation_list: &mut Vec<Vec<u16>>,
    depth: usize,
) {
    // 防止畸形字体里的 Extension 反复嵌套导致无限递归
    const MAX_EXTENSION_DEPTH: usize = 8;

    match table {
        Type::SingleAdjustment(_single_adjustment) => (),
        Type::PairAdjustment(pair_adjustment) => {
            let mut linked_pairs: Vec<u16> = vec![];
            collect_pair_adjustment_glyphs(pair_adjustment, &mut linked_pairs);
            relation_list.push(linked_pairs);
        }
        Type::CursiveAttachment(cursive_attachment) => {
            let mut linked_pairs: Vec<u16> = vec![];
            collect_glyph_id_from_format_1_and_2(
                &[cursive_attachment.coverage.clone()],
                &mut linked_pairs,
            );
            relation_list.push(linked_pairs);
        }
        Type::MarkToBaseAttachment(mark_to_base_attachment) => {
            let mut linked_pairs: Vec<u16> = vec![];
            collect_glyph_id_from_format_1_and_2(
                &[
                    mark_to_base_attachment.base_coverage.clone(),
                    mark_to_base_attachment.mark_coverage.clone(),
                ],
                &mut linked_pairs,
            );
            relation_list.push(linked_pairs);
        }
        Type::MarkToLigatureAttachment(mark_to_ligature_attachment) => {
            let mut linked_pairs: Vec<u16> = vec![];
            collect_glyph_id_from_format_1_and_2(
                &[
                    mark_to_ligature_attachment.ligature_coverage.clone(),
                    mark_to_ligature_attachment.mark_coverage.clone(),
                ],
                &mut linked_pairs,
            );
            relation_list.push(linked_pairs);
        }
        Type::MarkToMarkAttachment(mark_to_mark_attachment) => {
            let mut linked_pairs: Vec<u16> = vec![];
            collect_glyph_id_from_format_1_and_2(
                &[
                    mark_to_mark_attachment.mark1_coverage.clone(),
                    mark_to_mark_attachment.mark2_coverage.clone(),
                ],
                &mut linked_pairs,
            );
            relation_list.push(linked_pairs);
        }
        Type::ContextualPositioning(context) => match context {
            opentype::layout::Context::Format1(_context1) => (),
            opentype::layout::Context::Format2(_context2) => (),
            opentype::layout::Context::Format3(_context3) => (),
        },
        Type::ChainedContextualPositioning(_chained_context) => {
            // println!("context {:#?}", chained_context);
        }
        Type::ExtensionPositioning(extension_positioning) => {
            if depth >= MAX_EXTENSION_DEPTH {
                error!("GPOS extension positioning nested too deeply");
                return;
            }
            let Some(position) = position else {
                error!(
                    "GPOS extension positioning without a subtable position"
                );
                return;
            };
            let inner_position = position + extension_positioning.offset as u64;
            if let Err(e) = font_file.seek(SeekFrom::Start(inner_position)) {
                error!("failed to seek to the GPOS extension subtable: {}", e);
                return;
            }
            match font_file.take_given::<Type>(extension_positioning.r#type) {
                Ok(inner) => collect_gpos_relations(
                    &inner,
                    Some(inner_position),
                    font_file,
                    relation_list,
                    depth + 1,
                ),
                Err(e) => error!(
                    "failed to read the GPOS extension subtable (lookup type {}): {}",
                    extension_positioning.r#type, e
                ),
            }
        }
    }
}

/// 收集 PairAdjustment 里成对的两个字形。
///
/// Format1 的第二个字形在 `pairSets[].pairValueRecords[].secondGlyph`，
/// Format2 的第二个字形则由 `classDef2` 声明，两者都不在 coverage 里。
fn collect_pair_adjustment_glyphs(
    pair_adjustment: &glyph_positioning::PairAdjustment,
    result: &mut Vec<u16>,
) {
    match pair_adjustment {
        glyph_positioning::PairAdjustment::Format1(pair_adjustment1) => {
            collect_glyph_id_from_format_1_and_2(
                &[pair_adjustment1.coverage.clone()],
                result,
            );
            for pair_set in pair_adjustment1.records.iter() {
                for record in pair_set.records.iter() {
                    result.push(record.glyph2_id);
                }
            }
        }
        glyph_positioning::PairAdjustment::Format2(pair_adjustment2) => {
            collect_glyph_id_from_format_1_and_2(
                &[pair_adjustment2.coverage.clone()],
                result,
            );
            collect_glyph_id_from_class(&pair_adjustment2.class2, result);
        }
    }
}

/// 收集 ClassDef 里显式声明的全部字形（class 0 不写入表，天然被排除）。
fn collect_glyph_id_from_class(class: &Class, result: &mut Vec<u16>) {
    match class {
        Class::Format1(class1) => {
            let end = class1.start_glyph_id.saturating_add(class1.glyph_count);
            for glyph_id in class1.start_glyph_id..end {
                result.push(glyph_id);
            }
        }
        Class::Format2(class2) => {
            for record in class2.records.iter() {
                for glyph_id in record.start_glyph_id..=record.end_glyph_id {
                    result.push(glyph_id);
                }
            }
        }
    }
}

#[test]
fn test_gpos() {
    use cn_font_utils::read_binary_file;
    let font_file = read_binary_file(
        "./packages/demo/public/WorkSans-VariableFont_wght.ttf",
    )
    .unwrap();
    let mut font_file = Cursor::new(&*font_file);
    let font = Font::read(&mut font_file).unwrap();
    let _result = analyze_gpos(&font, &mut font_file);
    // println!("{:?}", result);
}

#[test]
fn test_pair_adjustment_collects_both_sides() {
    use opentype::layout::Coverage;
    use opentype::layout::class::Class1;
    use opentype::layout::coverage::Coverage1;
    use opentype::tables::glyph_positioning::{
        Flags, Pair1, Pair1s, Pair2, Pair2s, PairAdjustment1, PairAdjustment2,
    };

    // Format1：第二个字形在 pairSets[].pairValueRecords[].secondGlyph
    let format1 = glyph_positioning::PairAdjustment::Format1(PairAdjustment1 {
        format: 1,
        coverage_offset: 0,
        value1_flags: Flags(0),
        value2_flags: Flags(0),
        record_count: 1,
        record_offsets: vec![0],
        coverage: Coverage::Format1(Coverage1 {
            format: 1,
            glyph_count: 1,
            glyph_ids: vec![10],
        }),
        records: vec![Pair1s {
            count: 2,
            records: vec![
                Pair1 { glyph2_id: 20, value1: None, value2: None },
                Pair1 { glyph2_id: 21, value1: None, value2: None },
            ],
        }],
    });
    let mut result = vec![];
    collect_pair_adjustment_glyphs(&format1, &mut result);
    assert_eq!(result, vec![10, 20, 21]);

    // Format2：第二个字形由 classDef2 声明
    let format2 = glyph_positioning::PairAdjustment::Format2(PairAdjustment2 {
        format: 2,
        coverage_offset: 0,
        value1_flags: Flags(0),
        value2_flags: Flags(0),
        class1_offset: 0,
        class2_offset: 0,
        class1_count: 1,
        class2_count: 1,
        records: vec![Pair2s {
            records: vec![Pair2 { value1: None, value2: None }],
        }],
        coverage: Coverage::Format1(Coverage1 {
            format: 1,
            glyph_count: 1,
            glyph_ids: vec![30],
        }),
        class1: Class::Format1(Class1 {
            format: 1,
            start_glyph_id: 30,
            glyph_count: 1,
            indices: vec![1],
        }),
        class2: Class::Format1(Class1 {
            format: 1,
            start_glyph_id: 40,
            glyph_count: 2,
            indices: vec![1, 1],
        }),
    });
    let mut result = vec![];
    collect_pair_adjustment_glyphs(&format2, &mut result);
    assert_eq!(result, vec![30, 40, 41]);
}

#[test]
fn test_collect_glyph_id_from_class_format2() {
    use opentype::layout::class::{Class2, Record};

    let class = Class::Format2(Class2 {
        format: 2,
        record_count: 2,
        records: vec![
            Record { start_glyph_id: 50, end_glyph_id: 52, index: 1 },
            Record { start_glyph_id: 60, end_glyph_id: 60, index: 2 },
        ],
    });
    let mut result = vec![];
    collect_glyph_id_from_class(&class, &mut result);
    assert_eq!(result, vec![50, 51, 52, 60]);
}

#[test]
fn test_gpos_extension_positioning_expands_kerning() {
    use cn_font_utils::read_binary_file;

    // NotoSerifSC 的 kern 是 Extension Positioning（lookup type 9 包装 type 2），
    // 修复前会被直接跳过，这些 kerning 关系集不会出现在结果里。
    let font_file =
        read_binary_file("./packages/demo/public/NotoSerifSC-Regular.ttf")
            .unwrap();
    let mut font_file = Cursor::new(&*font_file);
    let font = Font::read(&mut font_file).unwrap();
    let cmap =
        crate::pre_subset::features::cmap::analyze_cmap(&font, &mut font_file);
    let relations = analyze_gpos(&font, &mut font_file);

    // 探针样本 "eo va ey vo"：左右两侧字形必须落在同一个关系集里
    let has_kerning_pair = relations.iter().any(|set| {
        let unicode: Vec<u32> =
            set.iter().filter_map(|g| cmap.get(g).copied()).collect();
        unicode.contains(&97)      // a
            && unicode.contains(&101) // e
            && unicode.contains(&111) // o
            && unicode.contains(&118) // v
    });
    assert!(has_kerning_pair, "GPOS Extension Positioning 未被展开");
}
