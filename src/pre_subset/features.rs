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
pub(crate) mod opentype;

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

        // 关系搬移完成后再补兜底：组合标记必须出现在每一个分包里，否则基字
        // 与标记会被分到不同 face，浏览器跨 face 无法做 mark 定位。
        // 详见 `add_combining_marks_to_all_subsets`。
        let chars = font_characters_from_cmap(&cmap);
        let marks = combining_mark_codepoints(&chars);
        add_combining_marks_to_all_subsets(&marks, subsets);
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

/// 组合标记兜底：字体 cmap 中真实存在的组合标记码点。
///
/// 与 GPOS 关系无关，**不排除**已被关系覆盖的标记：GPOS 关系只保证「关系里的
/// 基字 + 标记」同包，字体没为某个基字建关系时（NotoSerifSC 的 Han + U+0301）
/// 仍会跨 face，而 Inherited 标记理论上可以跟在任意脚本的基字后面。
fn combining_mark_codepoints(chars: &IndexSet<u32>) -> Vec<u32> {
    chars.iter().copied().filter(|c| is_combining_mark(*c)).collect()
}

/// 把每个组合标记码点加入**每一个**分包，让每个 face 都覆盖这些标记。
///
/// 为什么不是「把标记搬进某一个分包」：组合标记的脚本属性是 Inherited，可以
/// 跟在任意脚本的基字之后。只要基字与标记落在不同 face，浏览器就无法跨 face
/// 做 mark 定位，Chromium 甚至会丢掉基字整字。搬运只能覆盖「被搬进去的那个
/// face」上的基字，因此早期只搬 Latin 基字的兜底在 Han / Cyrillic / Greek /
/// 全角 Latin 语境下依然失效（实测 `永⃝` WebKit 差异 643px、Chromium 基字整字
/// 消失；`字\u0301` 187px）。
///
/// 反过来「每个分包都覆盖标记」是浏览器字形匹配的直接要求：grapheme cluster
/// 的字体由基字决定，基字所在 face 只要也覆盖标记，base + mark 就不会被拆成
/// 两个 run。字体里真实存在的组合标记通常很少（NotoSerifSC 7 个、
/// WorkSans 25 个、SmileySans 0 个），复制代价远小于重新划分基字所在分包。
///
/// 空分包会被 pipeline 末尾丢弃，往里塞标记等于凭空造出一个「只有标记」的
/// face，因此跳过；`marks` 来自 BTreeSet 顺序的字符表，本身就是升序。
fn add_combining_marks_to_all_subsets(
    marks: &[u32],
    subsets: &mut [IndexSet<u32>],
) {
    if marks.is_empty() {
        return;
    }
    for subset in subsets.iter_mut() {
        if subset.is_empty() {
            continue;
        }
        for mark in marks {
            subset.insert(*mark);
        }
    }
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
mod open_type_snapshots {
    //! 统一 GSUB/GPOS 遍历前的输出快照。
    //!
    //! `analyze_gsub` / `analyze_gpos` 的返回值决定「哪些字符被并回同一个
    //! 分包」，一旦顺序或内容变化，最终 woff2 字节就会变。这里对三份字体
    //! 固定「关系集数量 + 字形总数 + 序列化摘要」，重构前后必须完全一致。

    use super::cmap::analyze_cmap;
    use super::gpos::analyze_gpos;
    use super::gsub::analyze_gsub;
    use opentype::Font;
    use std::io::Cursor;

    /// 关系集数量、字形总数、以及按顺序序列化后的 blake3。
    #[derive(Debug)]
    struct Snapshot {
        sets: usize,
        glyphs: usize,
        digest: String,
    }

    /// 基线值：重构前的 `analyze_gsub` / `analyze_gpos` 输出。
    struct Expected {
        sets: usize,
        glyphs: usize,
        digest: &'static str,
    }

    fn snapshot(sets: &[Vec<u16>]) -> Snapshot {
        let mut buffer: Vec<u8> = Vec::new();
        for set in sets {
            buffer.extend_from_slice(&(set.len() as u32).to_le_bytes());
            for glyph in set {
                buffer.extend_from_slice(&glyph.to_le_bytes());
            }
        }
        Snapshot {
            sets: sets.len(),
            glyphs: sets.iter().map(|set| set.len()).sum(),
            digest: blake3::hash(&buffer).to_hex().to_string(),
        }
    }

    fn assert_snapshot(actual: Snapshot, expected: &Expected, path: &str) {
        assert_eq!(actual.sets, expected.sets, "{path} 关系集数量");
        assert_eq!(actual.glyphs, expected.glyphs, "{path} 字形总数");
        assert_eq!(actual.digest, expected.digest, "{path} 序列化摘要");
    }

    /// (字体, GSUB 快照, GPOS 快照, cmap 条目数, cmap 摘要)
    const FIXTURES: &[(&str, Expected, Expected, usize, &str)] = &[
        (
            "./packages/demo/public/NotoSerifSC-Regular.ttf",
            Expected {
                sets: 329,
                glyphs: 893,
                digest: "8a1ce836421945ede3b85f7f1491aa2362726ba95de35d7b984805e50b30356c",
            },
            Expected {
                sets: 8,
                glyphs: 3138,
                digest: "f1645095058dc4d27e33cb692425202b0f5d07aa890db1aba4b4841023973125",
            },
            30424,
            "d32bf7987793b29e814b3c595f3ff93a10704f882acf7603b37eef8f1815e3bc",
        ),
        (
            "./packages/demo/public/WorkSans-VariableFont_wght.ttf",
            Expected {
                sets: 58,
                glyphs: 163,
                digest: "3c9bdae068d520ef520ce58d2a893ac5bc556defec312dff49526c038bf1fe74",
            },
            Expected {
                sets: 8,
                glyphs: 25286,
                digest: "39f207cdaae60d2181ed90b97e928709b8dbe7f7dd12e53706be64e1f256aff3",
            },
            754,
            "9ff815c5386f4d7af4d17af5a59f8e349399f3a5aa227cdc36b341057b75a2e6",
        ),
        (
            "./packages/demo/public/SmileySans-Oblique.ttf",
            Expected {
                sets: 8,
                glyphs: 24,
                digest: "3d84354c72e7f099b42c0bfc9c2ab063068f84e484ab805981a1ee7df59c016c",
            },
            Expected {
                sets: 2,
                glyphs: 1458,
                digest: "4597812d4b0fecaa4915074fb03bd6bbda4ee61562b4fcf24837883453f3dd30",
            },
            7866,
            "de860693ebb245eca2be999f1ecfdcd2edb17254142aa2022ac837f846b9d4ae",
        ),
    ];

    fn load(path: &str) -> (Vec<u8>, Font) {
        let binary = cn_font_utils::read_binary_file(path).unwrap();
        let mut cursor = Cursor::new(&*binary);
        let font = Font::read(&mut cursor).unwrap();
        (binary, font)
    }

    #[test]
    fn gsub_relations_snapshot() {
        for (path, gsub, _, _, _) in FIXTURES {
            let (binary, font) = load(path);
            let mut cursor = Cursor::new(&*binary);
            assert_snapshot(
                snapshot(&analyze_gsub(&font, &mut cursor)),
                gsub,
                path,
            );
        }
    }

    #[test]
    fn gpos_relations_snapshot() {
        for (path, _, gpos, _, _) in FIXTURES {
            let (binary, font) = load(path);
            let mut cursor = Cursor::new(&*binary);
            assert_snapshot(
                snapshot(&analyze_gpos(&font, &mut cursor)),
                gpos,
                path,
            );
        }
    }

    /// cmap 反查表规模快照：GSUB/GPOS 的 gid→unicode 转换依赖它。
    #[test]
    fn cmap_snapshot() {
        for (path, _, _, expected_len, expected_digest) in FIXTURES {
            let (binary, font) = load(path);
            let mut cursor = Cursor::new(&*binary);
            let cmap = analyze_cmap(&font, &mut cursor);
            let mut entries: Vec<(u16, u32)> =
                cmap.iter().map(|(gid, uni)| (*gid, *uni)).collect();
            entries.sort_unstable();
            let mut buffer: Vec<u8> = Vec::new();
            for (gid, unicode) in &entries {
                buffer.extend_from_slice(&gid.to_le_bytes());
                buffer.extend_from_slice(&unicode.to_le_bytes());
            }
            assert_eq!(entries.len(), *expected_len, "{path}");
            assert_eq!(
                blake3::hash(&buffer).to_hex().as_str(),
                *expected_digest,
                "{path}"
            );
        }
    }
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

    /// 复现 `FontFeatures::apply` 在关系搬移之后的兜底步骤，供各用例共享。
    fn run_fallback(
        cmap: &HashMap<u16, u32>,
        pos_map: &[IndexSet<u32>],
        subsets: &mut [IndexSet<u32>],
    ) {
        move_feature_set_to_front(pos_map, subsets);
        let chars = font_characters_from_cmap(cmap);
        let marks = combining_mark_codepoints(&chars);
        add_combining_marks_to_all_subsets(&marks, subsets);
    }

    #[test]
    fn combining_marks_enter_every_subset() {
        let (cmap, pos_map, mut subsets) = noto_like_fixture();
        run_fallback(&cmap, &pos_map, &mut subsets);

        // 字体里的两个组合标记（U+0301、U+20DD）必须出现在每一个仍然存活的分包里：
        // 基字分散在 0/1/2/3 号包，任何一个包缺标记都会重新制造跨 face。
        let mut live = 0;
        for (index, subset) in subsets.iter().enumerate() {
            if subset.is_empty() {
                // 4 号包唯一的 g 被关系搬进 1 号包，搬空后不该被兜底复活。
                continue;
            }
            live += 1;
            assert!(
                subset.contains(&ACUTE),
                "分包 {index} 缺少 U+0301，基字与标记会跨 face"
            );
            assert!(
                subset.contains(&ENCLOSING_CIRCLE),
                "分包 {index} 缺少 U+20DD，基字与标记会跨 face"
            );
        }
        assert_eq!(live, 4);

        // 兜底只复制标记，基字仍保持原有归属：Han 只出现在一个分包里。
        assert_eq!(subsets.iter().filter(|s| s.contains(&HAN_YI)).count(), 1);
        assert_eq!(subsets.iter().filter(|s| s.contains(&A)).count(), 1);
    }

    #[test]
    fn combining_marks_absent_from_cmap_are_not_added() {
        // 字体 cmap 里没有 U+20DD / U+0301 时不能凭空加进分包：那样每个 woff2 都会
        // 声明一个自身没有字形的码点（探针的 declaredButMissing 会立刻非零）。
        let cmap = HashMap::from([(1_u16, A), (2, E), (3, HAN_YI)]);
        let mut subsets = vec![
            IndexSet::from([A]),
            IndexSet::from([E]),
            IndexSet::from([HAN_YI]),
        ];
        run_fallback(&cmap, &[], &mut subsets);
        for subset in &subsets {
            assert!(!subset.contains(&ACUTE));
            assert!(!subset.contains(&ENCLOSING_CIRCLE));
        }

        // 只有 cmap 里真实存在的那个标记会被复制。
        let cmap = HashMap::from([(1_u16, A), (2, HAN_YI), (3, ACUTE)]);
        let mut subsets = vec![IndexSet::from([A]), IndexSet::from([HAN_YI])];
        run_fallback(&cmap, &[], &mut subsets);
        for subset in &subsets {
            assert!(subset.contains(&ACUTE));
            assert!(!subset.contains(&ENCLOSING_CIRCLE));
        }
    }

    #[test]
    fn gpos_relations_keep_their_base_and_mark_together() {
        let (cmap, pos_map, mut subsets) = noto_like_fixture();
        run_fallback(&cmap, &pos_map, &mut subsets);

        // 关系收集（move_feature_set_to_front）行为不变：g 与 U+0301 仍落在
        // 首个相交分包，且不从关系集里被拆走。
        let relation_subset = subsets
            .iter()
            .position(|s| s.contains(&G))
            .expect("GPOS 基字必须仍被分配到某个分包");
        assert!(subsets[relation_subset].contains(&ACUTE));
        assert_eq!(
            subsets.iter().filter(|s| s.contains(&G)).count(),
            1,
            "关系里的基字不能被兜底复制到多个分包"
        );
        // 兜底让标记遍布所有存活分包（4 个），但关系里的基字仍只在一个包里。
        assert_eq!(subsets.iter().filter(|s| s.contains(&ACUTE)).count(), 4);
    }

    #[test]
    fn empty_subsets_are_not_revived() {
        // 关系搬移会把标记从后续分包里摘走，可能留下空包（pipeline 末尾会被丢弃）。
        // 兜底不能把标记塞回空包，否则凭空多出一个「只有标记」的 face。
        let mut subsets =
            vec![IndexSet::from([A]), IndexSet::new(), IndexSet::from([E])];
        add_combining_marks_to_all_subsets(&[ENCLOSING_CIRCLE], &mut subsets);
        assert!(subsets[0].contains(&ENCLOSING_CIRCLE));
        assert!(subsets[2].contains(&ENCLOSING_CIRCLE));
        assert!(subsets[1].is_empty());
    }

    #[test]
    fn no_combining_marks_means_no_change() {
        // SmileySans 这类字体 cmap 里没有组合标记（实测 0 个）：兜底必须完全不改分包。
        let cmap = HashMap::from([(1_u16, A), (2, E), (3, HAN_YI)]);
        let chars = font_characters_from_cmap(&cmap);
        assert!(combining_mark_codepoints(&chars).is_empty());

        let mut subsets = vec![
            IndexSet::from([A]),
            IndexSet::from([E]),
            IndexSet::from([HAN_YI]),
        ];
        let before = subsets.clone();
        add_combining_marks_to_all_subsets(
            &combining_mark_codepoints(&chars),
            &mut subsets,
        );
        assert_eq!(subsets, before);
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
