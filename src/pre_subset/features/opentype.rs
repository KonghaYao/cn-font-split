//! GSUB/GPOS 共用的 OpenType 读取原语。
//!
//! 两张表的结构高度一致：表目录里的偏移 → lookupList → lookup → subtable，
//! Extension 包装（GSUB lookup type 7 / GPOS lookup type 9）再套一层内部子表。
//! 这里只收敛「定位与展开」的机械部分，语义（哪些 lookup type 算相关字形、
//! 关系集如何组织）仍留在 [`super::gsub`] 与 [`super::gpos`]。

use opentype::Font;
use opentype::layout::{Class, Coverage, Lookups};
use opentype::tape::Read as _;
use opentype::walue;
use std::fmt;
use std::io::{Cursor, Seek, SeekFrom};

/// GSUB/GPOS/cmap 表级读取失败的上下文。
///
/// 只用于阶段内部诊断：失败时调用方 `warn!` 记录并回退到空结果，
/// 不进入对外错误类型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct TableError {
    table: &'static str,
    offset: Option<u32>,
    size: Option<u32>,
    message: String,
}

impl TableError {
    /// 表在目录里有登记，但读取/解析失败。
    pub(crate) fn read(
        font: &Font,
        tag: &[u8; 4],
        table: &'static str,
        message: impl Into<String>,
    ) -> Self {
        let (offset, size) = Self::locate(font, tag);
        Self { table, offset, size, message: message.into() }
    }

    /// 字体里没有这张表。
    pub(crate) fn missing(
        font: &Font,
        tag: &[u8; 4],
        table: &'static str,
    ) -> Self {
        let (offset, size) = Self::locate(font, tag);
        Self {
            table, offset, size, message: format!("字体缺少 {table} 表")
        }
    }

    fn locate(font: &Font, tag: &[u8; 4]) -> (Option<u32>, Option<u32>) {
        font.offsets
            .records
            .iter()
            .find(|record| record.tag.0 == *tag)
            .map(|record| (Some(record.offset), Some(record.size)))
            .unwrap_or((None, None))
    }
}

impl fmt::Display for TableError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "解析 {} 表失败", self.table)?;
        if let Some(offset) = self.offset {
            write!(f, "（offset={offset}")?;
            if let Some(size) = self.size {
                write!(f, ", size={size}")?;
            }
            write!(f, "）")?;
        }
        write!(f, ": {}", self.message)
    }
}

impl std::error::Error for TableError {}

/// Extension 包装的最大展开层数，防止畸形字体里的嵌套导致无限递归。
///
/// GSUB 与 GPOS 共用同一个上限（历史上两处各自定义为 8）。
pub(crate) const MAX_EXTENSION_DEPTH: usize = 8;

/// 表在字体文件中的绝对偏移；表缺失时返回 `None`。
pub(crate) fn table_offset(font: &Font, tag: &[u8; 4]) -> Option<u64> {
    font.offsets
        .records
        .iter()
        .find(|record| record.tag.0 == *tag)
        .map(|record| record.offset as u64)
}

/// 遍历某张布局表的所有子表，并给出每个子表的绝对位置。
///
/// 位置换算与两处旧实现逐字一致：
/// - Lookup 表位置 = 表起点 + `lookupListOffset` + `lookupOffsets[i]`；
/// - 子表位置 = Lookup 起点 + `subTableOffsets[j]`。
///
/// 缺失的偏移记录按 0 处理（旧行为），表本身缺失时位置为 `None`。
pub(crate) fn subtables_with_positions<'a, T>(
    font: &Font,
    tag: &[u8; 4],
    lookup_list_offset: u16,
    lookups: &'a Lookups<T>,
) -> impl Iterator<Item = (&'a T, Option<u64>)> + 'a {
    let base = table_offset(font, tag);
    lookups.records.iter().enumerate().flat_map(
        move |(lookup_index, record)| {
            let lookup_position = base.map(|position| {
                position
                    + lookup_list_offset as u64
                    + lookups.offsets.get(lookup_index).copied().unwrap_or(0)
                        as u64
            });
            record.tables.iter().enumerate().map(move |(table_index, table)| {
                let table_position = lookup_position.map(|position| {
                    position
                        + record
                            .table_offsets
                            .get(table_index)
                            .copied()
                            .unwrap_or(0) as u64
                });
                (table, table_position)
            })
        },
    )
}

/// 展开 Extension 包装，返回内层子表及其绝对位置。
///
/// 失败（深度超限、缺少子表位置、seek/读取失败）时记录日志并返回 `None`，
/// 调用方沿用各自的空结果回退。`table` / `kind` 只用于还原各自的日志文案。
pub(crate) fn expand_extension<T>(
    font_file: &mut Cursor<&[u8]>,
    position: Option<u64>,
    offset: u32,
    lookup_type: u16,
    depth: usize,
    table: &str,
    kind: &str,
) -> Option<(T, u64)>
where
    T: walue::Read<'static, Parameter = u16>,
{
    if depth >= MAX_EXTENSION_DEPTH {
        log::error!("{table} {kind} nested too deeply");
        return None;
    }
    let Some(position) = position else {
        log::error!("{table} {kind} without a subtable position");
        return None;
    };
    let inner_position = position + offset as u64;
    if let Err(e) = font_file.seek(SeekFrom::Start(inner_position)) {
        log::error!("failed to seek to the {table} {kind} subtable: {e}");
        return None;
    }
    match font_file.take_given::<T>(lookup_type) {
        Ok(inner) => Some((inner, inner_position)),
        Err(e) => {
            log::error!(
                "failed to read the {table} {kind} subtable (lookup type {lookup_type}): {e}"
            );
            None
        }
    }
}

/// 将 coverage 中的 glyph_id 直接注入 result。
pub(crate) fn collect_glyph_id_from_format_1_and_2(
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

/// 收集 ClassDef 里显式声明的全部字形（class 0 不写入表，天然被排除）。
pub(crate) fn collect_glyph_id_from_class(
    class: &Class,
    result: &mut Vec<u16>,
) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use opentype::layout::coverage::{Coverage1, Coverage2, Record};
    use std::io::Cursor;

    fn fixture(path: &str) -> (Vec<u8>, Font) {
        let binary = cn_font_utils::read_binary_file(path).unwrap();
        let mut cursor = Cursor::new(&*binary);
        let font = Font::read(&mut cursor).unwrap();
        (binary, font)
    }

    #[test]
    fn table_offset_is_none_for_missing_table() {
        let (_binary, font) =
            fixture("./packages/demo/public/SmileySans-Oblique.ttf");
        assert!(table_offset(&font, b"GSUB").is_some());
        assert!(table_offset(&font, b"ZZZZ").is_none());
    }

    #[test]
    fn coverage_expansion_matches_both_formats() {
        let coverage1 = Coverage::Format1(Coverage1 {
            format: 1,
            glyph_count: 2,
            glyph_ids: vec![3, 5],
        });
        let coverage2 = Coverage::Format2(Coverage2 {
            format: 2,
            record_count: 1,
            records: vec![Record {
                start_glyph_id: 8,
                end_glyph_id: 9,
                index: 0,
            }],
        });
        let mut result = vec![1];
        collect_glyph_id_from_format_1_and_2(
            &[coverage1, coverage2],
            &mut result,
        );
        assert_eq!(result, vec![1, 3, 5, 8, 9]);
    }

    /// 深度上限与旧实现一致：`depth == MAX` 时拒绝展开，`depth < MAX` 才尝试。
    #[test]
    fn extension_rejects_at_depth_limit() {
        let (binary, _font) =
            fixture("./packages/demo/public/SmileySans-Oblique.ttf");
        let mut cursor = Cursor::new(&*binary);
        // 用 GPOS/GSUB 的 Type 作为内层类型即可；此处不应发生任何读取。
        let rejected =
            expand_extension::<opentype::tables::glyph_substitution::Type>(
                &mut cursor,
                Some(0),
                0,
                1,
                MAX_EXTENSION_DEPTH,
                "GSUB",
                "extension substitution",
            );
        assert!(rejected.is_none());
    }

    /// 缺少子表位置时直接回退，不 seek。
    #[test]
    fn extension_requires_position() {
        let (binary, _font) =
            fixture("./packages/demo/public/SmileySans-Oblique.ttf");
        let mut cursor = Cursor::new(&*binary);
        let rejected =
            expand_extension::<opentype::tables::glyph_substitution::Type>(
                &mut cursor,
                None,
                0,
                1,
                0,
                "GSUB",
                "extension substitution",
            );
        assert!(rejected.is_none());
        // 未发生 seek：游标仍在起点。
        assert_eq!(cursor.position(), 0);
    }
}
