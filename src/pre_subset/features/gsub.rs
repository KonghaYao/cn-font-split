use opentype::Font;
use opentype::layout::{ChainedContext, Coverage};
use opentype::tables::GlyphSubstitution;
use opentype::tables::glyph_substitution::{LigatureSubstitution, Type};
use std::io::Cursor;

use super::opentype::{
    TableError, collect_glyph_id_from_format_1_and_2, expand_extension,
    subtables_with_positions,
};

pub fn analyze_gsub(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> Result<Vec<Vec<u16>>, TableError> {
    // 国标宋体字体的 GSUB 解析会直接报错，错误带上表名与偏移交给调用方记录。
    let data: GlyphSubstitution = match font.take(font_file) {
        Ok(Some(data)) => data,
        Ok(None) => return Err(TableError::missing(font, b"GSUB", "GSUB")),
        Err(e) => {
            return Err(TableError::read(font, b"GSUB", "GSUB", e.to_string()));
        }
    };

    let mut all_maybe_relative_glyph: Vec<Vec<u16>> = vec![];
    for (table, position) in subtables_with_positions(
        font,
        b"GSUB",
        data.lookup_offset,
        &data.lookups,
    ) {
        all_maybe_relative_glyph.extend(
            collect_gsub_relations(table, position, font_file, 0)
                .into_iter()
                .filter(|i| !i.is_empty()),
        );
    }
    Ok(all_maybe_relative_glyph)
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
    match table {
        Type::LigatureSubstitution(sub) => collect_ligature_glyph_sets(sub),
        // 上下文替换（format 1/2/3）暂不展开，与旧实现一致返回空。
        Type::ContextualSubstitution(_context) => vec![vec![]],
        Type::ChainedContextualSubstitution(context) => {
            match context {
                ChainedContext::Format1(ctx) => match &ctx.coverage {
                    Coverage::Format1(cov) => vec![cov.glyph_ids.clone()],
                    Coverage::Format2(ctx) => ctx
                        .records
                        .iter()
                        .map(|r| (r.start_glyph_id..=r.end_glyph_id).collect())
                        .collect(),
                },
                ChainedContext::Format2(ctx) => {
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
                // Format3 的 coverages / forward_coverages / backward_coverages
                // 一旦合并会把几乎所有字形都算成相关（历史上曾导致匹配爆炸），
                // 因此与旧实现一致：不展开，返回空集。
                ChainedContext::Format3(_ctx) => vec![vec![]],
            }
        }
        Type::ExtensionSubstitution(extension_substitution) => {
            let inner = expand_extension::<Type>(
                font_file,
                position,
                extension_substitution.offset,
                extension_substitution.r#type,
                depth,
                "GSUB",
                "extension substitution",
            );
            match inner {
                Some((inner, inner_position)) => collect_gsub_relations(
                    &inner,
                    Some(inner_position),
                    font_file,
                    depth + 1,
                ),
                None => vec![vec![]],
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
            vec![result]
        }
        _ => vec![vec![]],
    }
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

#[test]
fn test_gsub() {
    use cn_font_utils::read_binary_file;
    let font_file = read_binary_file(
        "./packages/demo/public/WorkSans-VariableFont_wght.ttf",
    )
    .unwrap();
    let mut font_file = Cursor::new(&*font_file);
    let font = Font::read(&mut font_file).unwrap();
    let _result = analyze_gsub(&font, &mut font_file).expect("GSUB 解析");
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
