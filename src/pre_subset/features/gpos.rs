use opentype::Font;
use opentype::tables::GlyphPositioning;
use opentype::tables::glyph_positioning::{self, Type};
use std::io::Cursor;

use super::opentype::{
    collect_glyph_id_from_class, collect_glyph_id_from_format_1_and_2,
    expand_extension, subtables_with_positions,
};

pub fn analyze_gpos(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> Vec<Vec<u16>> {
    // GPOS table；解析失败按无 GPOS 表处理，跳过字距特性分析。
    let data: Option<GlyphPositioning> = font.take(font_file).ok().flatten();
    let Some(data) = data else {
        return vec![];
    };

    let mut relation_list: Vec<Vec<u16>> = vec![];
    for (table, position) in subtables_with_positions(
        font,
        b"GPOS",
        data.lookup_offset,
        &data.lookups,
    ) {
        collect_gpos_relations(
            table,
            position,
            font_file,
            &mut relation_list,
            0,
        );
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
        // 上下文定位的 format 1/2/3 与链式上下文定位暂不展开（旧行为）。
        Type::ContextualPositioning(_) => (),
        Type::ChainedContextualPositioning(_) => (),
        Type::ExtensionPositioning(extension_positioning) => {
            let inner = expand_extension::<Type>(
                font_file,
                position,
                extension_positioning.offset,
                extension_positioning.r#type,
                depth,
                "GPOS",
                "extension positioning",
            );
            if let Some((inner, inner_position)) = inner {
                collect_gpos_relations(
                    &inner,
                    Some(inner_position),
                    font_file,
                    relation_list,
                    depth + 1,
                );
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
}

#[test]
fn test_pair_adjustment_collects_both_sides() {
    use opentype::layout::Class;
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
    use opentype::layout::Class;
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
        let glyphs: Vec<u32> =
            set.iter().map(|gid| *cmap.get(gid).unwrap_or(&0)).collect();
        glyphs.contains(&0x0065) && glyphs.contains(&0x006F)
    });
    assert!(has_kerning_pair, "GPOS kerning 关系集缺失");
}
