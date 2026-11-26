pub mod features;
pub mod fvar;
pub mod gen_svg;
pub mod name_table;
pub mod plugin;
mod plugin_auto_subset;

use crate::config::Config;
use crate::error::{FontSplitError, Result};
use crate::runner::{FontSource, PreSubsetOutput};
mod plugin_add_user_subset;
use cn_font_utils::u8_array_to_u32_array;
use features::FontFeatures;
use fvar::analyze_fvar_table;
use gen_svg::gen_svg_extra_files;
use harfbuzz_rs_now::{Face, Owned};
use indexmap::IndexSet;
use opentype::tables::FontVariations;
use plugin::{
    AddRemainChars, LanguageArea, PreSubsetPlugin, ReduceMin, SubsetDraft,
};
use plugin_add_user_subset::AddUserSubset;
use plugin_auto_subset::AutoSubset;
use std::{
    collections::{BTreeSet, HashMap},
    io::Cursor,
};

/// 预处理流水线。**顺序即产物语义**，不能随意调整：
///
/// - `AddUserSubset` 必须第一个执行：它要把用户分包里的字符用
///   `remaining.remove` 摘掉，后续插件才不会重复分配；
/// - `AddRemainChars` 必须在 `AutoSubset` 之前：剩余字符先成包，再由体积切分；
/// - `FontFeatures` 必须在 `AutoSubset` 之后：`features.rs` 会把特性字符并回
///   首个相交包，若先于切分执行，包体积与切分结果都会改变；
/// - `ReduceMin` 放在最后：它只合并/重排已存在的分包。
///
/// 启用开关由各插件的 `enabled` 决定，默认值来自 `Config`，不要在这里重复。
static PIPELINE: &[&dyn PreSubsetPlugin] = &[
    &AddUserSubset,
    &LanguageArea,
    &AddRemainChars,
    &AutoSubset,
    &FontFeatures,
    &ReduceMin,
];

// 定义预处理上下文结构体，用于存储预处理阶段的各种状态和数据
pub struct PreSubsetContext<'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    all_unicodes: BTreeSet<u32>,
    face: &'a mut Owned<Face<'b>>,
    predict_bytes_pre_subset: u32,
    font: &'a opentype::Font,
    font_file: &'a mut Cursor<&'c [u8]>,
    subsets: &'c Vec<Vec<u32>>,
    used_languages: HashMap<usize, String>,
}

/// 用户传入的 subsets 使用每字符 4 字节的小端编码；
/// 入口已校验长度，这里再做一次检查，避免直接调用 `pre_subset` 时 panic。
fn decode_user_subsets(subsets: &[Vec<u8>]) -> Result<Vec<Vec<u32>>> {
    subsets
        .iter()
        .enumerate()
        .map(|(index, subset)| {
            if subset.len() % 4 != 0 {
                return Err(FontSplitError::InvalidSubsets(format!(
                    "subsets[{index}] 的字节长度 {} 不是 4 的倍数",
                    subset.len()
                )));
            }
            Ok(u8_array_to_u32_array(subset))
        })
        .collect()
}

// 主要的预处理函数，用于执行字体的预处理和子集化操作
pub fn pre_subset(
    source: &mut FontSource<'_>,
    config: &Config,
) -> Result<PreSubsetOutput> {
    // 初始化二进制文件数据和所有Unicode字符的集合
    let all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(source.face.collect_unicodes());

    // 创建字体文件游标并读取字体数据
    let mut font_file = Cursor::new(source.binary);
    let font = opentype::Font::read(&mut font_file).map_err(|e| {
        FontSplitError::InvalidFont(format!("读取 OpenType 字体失败: {e}"))
    })?;

    // 生成SVG图像（pre 阶段的附加文件，由调用方统一按顺序 emit）
    let extra_files = gen_svg_extra_files(config, &source.face);
    // 可变字体表缺失或解析失败时按非可变字体处理，不影响切割。
    let vars: Option<FontVariations> = font.take(&mut font_file).ok().flatten();
    let fvar = analyze_fvar_table(vars);

    let user_subsets: Vec<Vec<u32>> = decode_user_subsets(&config.subsets)?;

    // 初始化预处理上下文
    let subsets: Vec<IndexSet<u32>> = vec![];
    let mut context = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut source.face,
        // 每个包的大小
        predict_bytes_pre_subset: config.chunk_size as u32,
        font: &font,
        subsets: &user_subsets,
        font_file: &mut font_file,
        used_languages: HashMap::new(),
    };

    // 执行 PIPELINE 中所有启用的插件，顺序见文件顶部的顺序约束说明。
    let mut draft =
        SubsetDraft { subsets, remaining: all_unicodes, ctx: &mut context };
    for plugin in PIPELINE {
        if plugin.enabled(config) {
            plugin.apply(&mut draft)?;
        }
    }
    // 根据处理结果得到每个分包的字符表，空包不输出。
    let subsets = draft
        .subsets
        .iter()
        .filter(|v| !v.is_empty())
        .map(|v| v.iter().copied().collect::<Vec<u32>>())
        .collect();
    // `draft` 到此不再使用，`context` 的可变借用于此结束。
    let languages = context.used_languages;

    // 分析名称表
    let name_table = name_table::analyze_name_table(&font, &mut font_file);
    Ok(PreSubsetOutput { subsets, name_table, fvar, languages, extra_files })
}

#[cfg(test)]
mod tests {
    use super::PIPELINE;

    /// 顺序即产物语义；改动顺序必须同步更新此断言并重跑 bench hash 对比。
    #[test]
    fn pipeline_order_is_stable() {
        let names: Vec<&str> =
            PIPELINE.iter().map(|plugin| plugin.name()).collect();
        assert_eq!(
            names,
            vec![
                "add_user_subset",
                "language_area",
                "add_remain_chars",
                "auto_subset",
                "font_features",
                "reduce_min",
            ]
        );
    }
}
