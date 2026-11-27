use indexmap::IndexSet;
use log::{debug, warn};
use std::collections::BTreeSet;

use super::plugin::{PreSubsetPlugin, Subset, SubsetDraft};
use crate::config::Config;
use crate::error::Result;

/// 把用户传入的 subsets 放到分包列表最前面。
pub struct AddUserSubset;

/// 单个用户分包过后的结果：保留的字符（保持原顺序）与被丢弃的数量。
struct FilteredSubset {
    chars: IndexSet<u32>,
    dropped: usize,
}

/// 按字体真实字符集过滤一个用户分包，是 [`AddUserSubset`] 的纯函数部分。
///
/// `font_chars` 必须是 `face.collect_unicodes()`（即 cmap）给出的集合。
/// 不在集合里的码点渲染不出任何字形：把它们交给 harfbuzz 后，子集里
/// 「字符表非空、字形表为空」，最终产出 `glyf: zero-length table`
/// （#211，典型场景是给 NotoColorEmoji 传中文扫描字符）。因此这里必须
/// 与字体字符集求交，不能让用户字符原样进入流水线。
///
/// 保留字符的顺序与 `IndexSet` 的插入顺序一致（即用户传入顺序），因此
/// 过滤不影响确定性；重复码点仍按原有语义去重，重复项不计入 `dropped`。
fn filter_to_font_chars(
    chars: &[u32],
    font_chars: &BTreeSet<u32>,
) -> FilteredSubset {
    let mut kept: IndexSet<u32> = IndexSet::new();
    let mut dropped = 0;
    for &ch in chars {
        if font_chars.contains(&ch) {
            kept.insert(ch);
        } else {
            dropped += 1;
        }
    }
    FilteredSubset { chars: kept, dropped }
}

impl PreSubsetPlugin for AddUserSubset {
    fn name(&self) -> &'static str {
        "add_user_subset"
    }

    fn enabled(&self, _config: &Config) -> bool {
        // 用户显式给定的分包没有开关，始终执行。
        true
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        // `subsets` 是 `&[Vec<u32>]`，先取出引用即可与 `draft` 的其他字段解耦。
        let user_subsets = draft.ctx.subsets;
        let font_chars = &draft.ctx.all_unicodes;
        let mut dropped_chars = 0usize;
        let mut dropped_subsets = 0usize;
        for (index, u32_arr) in user_subsets.iter().enumerate() {
            let filtered = filter_to_font_chars(u32_arr, font_chars);
            if filtered.dropped > 0 {
                dropped_chars += filtered.dropped;
                debug!(
                    "subsets[{index}]: {} 个字符不在字体字符集中，已过滤",
                    filtered.dropped
                );
            }
            // 过滤前非空、过滤后为空：这个分包在字体里没有任何字形，交给下游
            // 只会产出零长度 `glyf` 的坏包，整体丢弃。
            //
            // 只有真正发生过滤时才丢弃，因此「字体覆盖全部请求字符」的路径
            // （包括历史上就为空的用户分包）与旧行为逐字节一致：旧实现在
            // `LanguageArea::apply` 里按分包在 `draft.subsets` 中的位置物化
            // 语言标签，提前丢掉一个包会让后续位置前移、改变切分系数。
            // 需要丢包时产物本来就要变，这里只保证不变的情形确实不变。
            if filtered.chars.is_empty() && !u32_arr.is_empty() {
                dropped_subsets += 1;
                continue;
            }
            for ch in &filtered.chars {
                draft.remaining.remove(ch);
            }
            // 用户分包没有语言区域语义，标签为 None。
            draft
                .subsets
                .push(Subset { chars: filtered.chars, language: None });
        }
        if dropped_chars > 0 {
            warn!(
                "用户分包中 {} 个字符不在字体字符集中，已过滤；其中 {} 个分包过滤后为空、已丢弃",
                dropped_chars, dropped_subsets
            );
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::filter_to_font_chars;

    fn font_chars(chars: &[u32]) -> std::collections::BTreeSet<u32> {
        chars.iter().copied().collect()
    }

    /// 字体覆盖全部请求字符时：顺序、内容与计数都不变。
    #[test]
    fn keeps_all_chars_when_font_covers_them() {
        let font = font_chars(&[0x41, 0x42, 0x43, 0x4E2D]);
        let filtered = filter_to_font_chars(&[0x43, 0x41, 0x4E2D], &font);

        assert_eq!(
            filtered.chars.iter().copied().collect::<Vec<_>>(),
            vec![0x43, 0x41, 0x4E2D],
            "保留用户传入顺序"
        );
        assert_eq!(filtered.dropped, 0);
    }

    /// 部分命中：只丢字体外码点，保留顺序不变，重复码点按原语义去重。
    #[test]
    fn drops_only_codepoints_missing_from_font() {
        let font = font_chars(&[0x41, 0x42]);
        let filtered =
            filter_to_font_chars(&[0x41, 0x4E2D, 0x42, 0x41, 0x1F600], &font);

        assert_eq!(
            filtered.chars.iter().copied().collect::<Vec<_>>(),
            vec![0x41, 0x42]
        );
        // 重复的 A 是去重而不是「字体没有」，不计入丢弃数。
        assert_eq!(filtered.dropped, 2, "只统计字体字符集外的码点");
    }

    /// 全部未命中：结果为空，调用方据此丢弃整个分包。
    #[test]
    fn empty_result_when_no_codepoint_is_in_font() {
        let font = font_chars(&[0x41]);
        let filtered = filter_to_font_chars(&[0x4E2D, 0x1F600], &font);

        assert!(filtered.chars.is_empty());
        assert_eq!(filtered.dropped, 2);
    }

    /// 空输入与空字体字符集：不 panic，也不丢任何东西。
    #[test]
    fn handles_empty_inputs() {
        let empty_font = font_chars(&[]);
        let filtered = filter_to_font_chars(&[], &empty_font);
        assert!(filtered.chars.is_empty());
        assert_eq!(filtered.dropped, 0);

        let filtered = filter_to_font_chars(&[0x41], &empty_font);
        assert!(filtered.chars.is_empty());
        assert_eq!(filtered.dropped, 1);
    }
}
