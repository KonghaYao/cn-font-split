use cmap::analyze_cmap;
use gpos::analyze_gpos;
use gsub::analyze_gsub;
use indexmap::IndexSet;
use std::collections::{BTreeSet, HashMap};

use super::plugin::{PreSubsetPlugin, SubsetDraft};
use crate::config::Config;
use crate::error::Result;
pub mod cmap;
pub mod gpos;
pub mod gsub;

/// 把 GSUB/GPOS 特性涉及的字符并回首个相交的分包。
pub struct FontFeatures;

impl PreSubsetPlugin for FontFeatures {
    fn name(&self) -> &'static str {
        "font_features"
    }

    fn enabled(&self, config: &Config) -> bool {
        config.font_feature
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        let ctx = &mut *draft.ctx;
        let subsets = &mut draft.subsets;
        let cmap = analyze_cmap(ctx.font, ctx.font_file);
        let sub_map = analyze_gsub(ctx.font, ctx.font_file);
        let sub_map = turn_indics_to_unicode_set(sub_map, &cmap);
        move_feature_set_to_front(&sub_map, subsets);

        let pos_map = analyze_gpos(ctx.font, ctx.font_file);
        let pos_map = turn_indics_to_unicode_set(pos_map, &cmap);
        move_feature_set_to_front(&pos_map, subsets);

        // GPOS 关系处理完后再补兜底：字体 GPOS 未收录的组合标记（如
        // NotoSerifSC 的 U+20DD）拿不到「基字 + 标记」关系，会被分到别的分包，
        // 浏览器跨 face 无法做 mark 定位。详见 `mark_fallback_clusters`。
        let chars = font_characters_from_cmap(&cmap);
        let mark_clusters = mark_fallback_clusters(&chars, &pos_map);
        for cluster in &mark_clusters {
            move_feature_set_to_front(std::slice::from_ref(cluster), subsets);
        }
        Ok(())
    }
}

/// 从 `analyze_cmap` 的 gid -> unicode 反查表里取「字体真实存在的字符」。
///
/// gid 0 是 .notdef；`turn_indics_to_unicode_set` 里未命中的 gid 也会落到
/// 0，两者都不代表真实码点，必须过滤，否则兜底集合会把不存在的字符塞进分包。
/// 用 `BTreeSet` 去重并保持稳定顺序，避免包内字符顺序随哈希迭代漂移。
fn font_characters_from_cmap(cmap: &HashMap<u16, u32>) -> IndexSet<u32> {
    let mut chars: BTreeSet<u32> = BTreeSet::new();
    for (gid, unicode) in cmap {
        if *gid == 0 || *unicode == 0 {
            continue;
        }
        chars.insert(*unicode);
    }
    chars.into_iter().collect()
}

/// 组合标记兜底合并的 cluster 列表：每个 cluster 是「Latin 基字集合 ∪ 单个标记」。
///
/// 为什么用 Latin 兜底集合：组合标记的脚本属性是 Inherited，字体 GPOS 未必
/// 为它建 markCoverage（NotoSerifSC 的 U+20DD 就不在 gid 493 的覆盖里），
/// 这时只能靠码点区间推断宿主语境。Latin 区段（Basic Latin / Latin-1 /
/// Latin Ext-A-B 起始段 / Latin Extended Additional，外加作基字的
/// Letterlike Symbols / Number Forms）是 `a⃝`、`Ⅰ⃝` 这类序列最常见的基字
/// 来源，且集合有限；只把它作为基字，可以保证不会把 Han 或其它脚本牵连进
/// 同一个分包。
///
/// 局限：Inherited 标记理论上可以跟在任意脚本之后，这里只在 Latin 语境兜底。
/// Han、Cyrillic、Greek 等语境下的孤立标记，以及字体没有 Latin 基字时，
/// 仍保持原有分包行为。
fn mark_fallback_clusters(
    chars: &IndexSet<u32>,
    pos_map: &[IndexSet<u32>],
) -> Vec<IndexSet<u32>> {
    let bases: IndexSet<u32> =
        chars.iter().copied().filter(|c| is_latin_base(*c)).collect();
    // 没有 Latin 基字时 cluster 只剩标记本身，合并没有意义。
    if bases.is_empty() {
        return Vec::new();
    }
    chars
        .iter()
        .copied()
        .filter(|c| is_combining_mark(*c))
        // 已被 GPOS 关系覆盖的标记由上面的 move_feature_set_to_front 处理。
        .filter(|c| !pos_map.iter().any(|relation| relation.contains(c)))
        .map(|mark| {
            let mut cluster = bases.clone();
            cluster.insert(mark);
            cluster
        })
        .collect()
}

/// Latin 兜底基字区段：Basic Latin、Latin-1 Supplement、Latin Extended-A/B
/// 起始段、Latin Extended Additional，以及 Letterlike Symbols / Number Forms。
///
/// 后两个区段（U+2100..=U+218F）不是基本拉丁，但 `Ⅰ⃝`、`№⃝` 这类序列用
/// 罗马数字、№ 作基字，且它们常和组合标记一起被分到「符号」语言包。若基字
/// 集合不含它们，兜底会把标记从符号包拖到 Latin 包，反而拆散原本同 face 的
/// `Ⅰ⃝`/`№⃝`（探针 comb2-same 回归）。这两个区段里没有 Han，把它们一并
/// 视为 Latin 语境基字，标记与其原有同包字符就能一起移动。
fn is_latin_base(c: u32) -> bool {
    (0x0020..=0x024F).contains(&c)
        || (0x1E00..=0x1EFF).contains(&c)
        || (0x2100..=0x218F).contains(&c)
}

/// 组合标记区段：Combining Diacritical Marks 及其扩展、Cyrillic 组合标记、
/// Enclosing Marks、Combining Half Marks。
fn is_combining_mark(c: u32) -> bool {
    matches!(
        c,
        0x0300..=0x036F
            | 0x0483..=0x0489
            | 0x1AB0..=0x1AFF
            | 0x1DC0..=0x1DFF
            | 0x20D0..=0x20FF
            | 0xFE20..=0xFE2F
    )
}

fn move_feature_set_to_front(
    feature_map: &[IndexSet<u32>],
    subsets: &mut [IndexSet<u32>],
) {
    for feature_set in feature_map {
        let mut have_coverage = false;
        for subset in subsets.iter_mut() {
            if have_coverage {
                subset.retain(|x| !feature_set.contains(x));
            } else if has_intersection(feature_set, subset) {
                for x in feature_set.iter() {
                    subset.insert(*x);
                }
                have_coverage = true;
            }
        }
    }
}

/// 判断两个集合是否有交集
fn has_intersection(a: &IndexSet<u32>, b: &IndexSet<u32>) -> bool {
    for i in a {
        if b.contains(i) {
            return true;
        }
    }
    false
}

#[test]
fn test_move_feature_set_to_front() {
    let feature_map = vec![IndexSet::from([1, 2]), IndexSet::from([3, 4])];
    let mut subsets = vec![
        IndexSet::from([2, 3]),
        IndexSet::from([4, 5]),
        IndexSet::from([1]),
    ];

    move_feature_set_to_front(&feature_map, &mut subsets);

    // println!("{:?}", subsets);
    assert!(subsets[0].contains(&1));
    assert!(subsets[0].contains(&2));
    assert!(subsets[0].contains(&3));
    assert!(subsets[0].contains(&4));
    assert!(subsets[1].contains(&5));
    assert!(subsets[2].is_empty());
}

pub fn turn_indics_to_unicode_set(
    all_maybe_relative_glyph: Vec<Vec<u16>>,
    cmap: &HashMap<u16, u32>,
) -> Vec<IndexSet<u32>> {
    all_maybe_relative_glyph
        .iter()
        .map(|r| {
            IndexSet::from_iter(
                r.iter().map(|gid| *cmap.get(gid).unwrap_or(&0_u32)),
            )
        })
        .collect::<Vec<IndexSet<u32>>>()
}

#[cfg(test)]
mod mark_fallback_tests {
    use super::*;

    const A: u32 = 0x0061;
    const E: u32 = 0x0065;
    const G: u32 = 0x0067;
    const O: u32 = 0x006F;
    const HAN_YI: u32 = 0x4E00;
    const ACUTE: u32 = 0x0301;
    const ENCLOSING_CIRCLE: u32 = 0x20DD;

    /// cmap 反查表、GPOS 关系集、初始分包。
    type NotoLikeFixture =
        (HashMap<u16, u32>, Vec<IndexSet<u32>>, Vec<IndexSet<u32>>);

    /// 模拟 NotoSerifSC：a/e/o 分散在 0/1/3 包，U+20DD 单独落在第 2 包，
    /// GPOS 只覆盖了 U+0301（acute），不覆盖 U+20DD。
    fn noto_like_fixture() -> NotoLikeFixture {
        let cmap = HashMap::from([
            (0_u16, 0_u32),        // .notdef
            (1, A),                // a
            (2, E),                // e
            (3, O),                // o
            (4, HAN_YI),           // 一
            (5, ENCLOSING_CIRCLE), // ⃝
            (6, G),                // g，GPOS 基字
            (7, ACUTE),            // ́ ，GPOS 标记
            (8, 0),                // 未映射 gid 造成的 0
        ]);
        // GPOS 已建立的关系集（gid 6、7 转成 unicode 后）。
        let pos_map = vec![IndexSet::from([G, ACUTE])];
        let subsets = vec![
            IndexSet::from([A, HAN_YI]),
            IndexSet::from([E, ACUTE]),
            IndexSet::from([ENCLOSING_CIRCLE]),
            IndexSet::from([O]),
            IndexSet::from([G]),
        ];
        (cmap, pos_map, subsets)
    }

    #[test]
    fn combining_mark_is_merged_with_latin_base() {
        let (cmap, pos_map, mut subsets) = noto_like_fixture();
        let chars = font_characters_from_cmap(&cmap);
        let clusters = mark_fallback_clusters(&chars, &pos_map);

        // 只兜底 GPOS 未覆盖的 U+20DD；U+0301 已有 GPOS 关系，不重复处理。
        assert_eq!(clusters.len(), 1);
        assert!(clusters[0].contains(&ENCLOSING_CIRCLE));
        assert!(!clusters[0].contains(&ACUTE));
        assert!(clusters[0].contains(&A));
        assert!(!clusters[0].contains(&HAN_YI), "Han 不能被拉进 Latin cluster");

        for cluster in &clusters {
            move_feature_set_to_front(
                std::slice::from_ref(cluster),
                &mut subsets,
            );
        }

        // a / o / U+20DD 必须落在同一个分包里，浏览器才能做 mark 定位。
        let mark_subset = subsets
            .iter()
            .position(|s| s.contains(&ENCLOSING_CIRCLE))
            .expect("U+20DD 必须仍被分配到某个分包");
        assert!(subsets[mark_subset].contains(&A));
        assert!(subsets[mark_subset].contains(&O));
        assert!(subsets[mark_subset].contains(&E));
        assert!(subsets[mark_subset].contains(&G));
        assert_eq!(
            subsets.iter().filter(|s| s.contains(&ENCLOSING_CIRCLE)).count(),
            1,
            "标记只能出现在一个分包中"
        );

        // Han 字符保持原有归属，不因兜底被复制或迁移。
        assert_eq!(subsets.iter().filter(|s| s.contains(&HAN_YI)).count(), 1);

        // GPOS 覆盖的标记及其基字关系不受兜底影响。
        assert!(subsets[1].contains(&ACUTE));
        assert!(!subsets[1].contains(&E));
    }

    #[test]
    fn mark_stays_with_roman_numeral_and_numero_bases() {
        // `Ⅰ⃝` / `№⃝`：罗马数字与 № 常与标记落在同一个符号包。兜底必须把它们
        // 视为 Latin 语境基字，否则标记会被单独拖走、反而制造跨 face。
        const ROMAN_ONE: u32 = 0x2160;
        const NUMERO: u32 = 0x2116;
        let cmap = HashMap::from([
            (1_u16, A),
            (2, ENCLOSING_CIRCLE),
            (3, ROMAN_ONE),
            (4, NUMERO),
        ]);
        let mut subsets = vec![
            IndexSet::from([A]),
            IndexSet::from([ENCLOSING_CIRCLE, ROMAN_ONE, NUMERO]),
        ];
        let chars = font_characters_from_cmap(&cmap);
        let clusters = mark_fallback_clusters(&chars, &[]);
        assert!(clusters[0].contains(&ROMAN_ONE));
        assert!(clusters[0].contains(&NUMERO));

        for cluster in &clusters {
            move_feature_set_to_front(
                std::slice::from_ref(cluster),
                &mut subsets,
            );
        }
        let mark_subset = subsets
            .iter()
            .position(|s| s.contains(&ENCLOSING_CIRCLE))
            .expect("U+20DD 必须仍被分配到某个分包");
        assert!(subsets[mark_subset].contains(&ROMAN_ONE));
        assert!(subsets[mark_subset].contains(&NUMERO));
    }

    #[test]
    fn latin_base_ranges_cover_latin_and_base_symbols() {
        for c in [
            0x0020_u32, 0x007A, 0x00E9, 0x024F, 0x1E00, 0x1EFF, 0x2100, 0x2116,
            0x2160, 0x218F,
        ] {
            assert!(is_latin_base(c), "U+{c:04X} 应被视为 Latin 基字");
        }
        for c in [0x001F_u32, 0x0250, 0x1F00, 0x2190, 0x4E00, 0x20DD] {
            assert!(!is_latin_base(c), "U+{c:04X} 不应被视为 Latin 基字");
        }
    }

    #[test]
    fn no_latin_base_means_no_cluster() {
        let cmap = HashMap::from([(1_u16, HAN_YI), (2, ENCLOSING_CIRCLE)]);
        let chars = font_characters_from_cmap(&cmap);
        assert!(mark_fallback_clusters(&chars, &[]).is_empty());
    }

    #[test]
    fn cmap_characters_drop_notdef_and_unmapped_zero() {
        let cmap = HashMap::from([
            (0_u16, O), // .notdef 不该贡献字符
            (1, A),
            (2, 0), // 未映射
        ]);
        let chars = font_characters_from_cmap(&cmap);
        assert_eq!(chars.len(), 1);
        assert!(chars.contains(&A));
        assert!(!chars.contains(&O));
        assert!(!chars.contains(&0));
    }

    #[test]
    fn all_combining_ranges_are_recognized() {
        for c in [
            0x0300_u32, 0x036F, 0x0483, 0x0489, 0x1AB0, 0x1AFF, 0x1DC0, 0x1DFF,
            0x20D0, 0x20FF, 0xFE20, 0xFE2F,
        ] {
            assert!(is_combining_mark(c), "U+{c:04X} 应被视为组合标记");
        }
        for c in [0x02FF_u32, 0x0370, 0x20CF, 0x25CC, 0xFE2F + 1] {
            assert!(!is_combining_mark(c), "U+{c:04X} 不应被视为组合标记");
        }
    }
}
