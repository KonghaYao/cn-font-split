pub mod features;
pub mod fvar;
pub mod gen_svg;
pub mod name_table;
pub mod plugin;
mod plugin_auto_subset;

use crate::error::{FontSplitError, Result};
use crate::runner::Context;
mod plugin_add_user_subset;
use cn_font_utils::u8_array_to_u32_array;
use features::features_plugin;
use fvar::analyze_fvar_table;
use gen_svg::gen_svg_from_ctx;
use harfbuzz_rs_now::{Face, Owned};
use indexmap::IndexSet;
use opentype::tables::FontVariations;
use plugin::{
    add_remain_chars_plugin, language_area_plugin, reduce_min_plugin,
};
use plugin_auto_subset::plugin_auto_subset;
use std::{
    collections::{BTreeSet, HashMap},
    io::Cursor,
};

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
pub fn pre_subset(ctx: &mut Context) -> Result<()> {
    // 初始化二进制文件数据和所有Unicode字符的集合
    let file_binary = &*ctx.binary;
    let mut all_unicodes: BTreeSet<u32> =
        BTreeSet::from_iter(ctx.face.collect_unicodes());

    // 创建字体文件游标并读取字体数据
    let mut font_file = Cursor::new(file_binary);
    let font = opentype::Font::read(&mut font_file).map_err(|e| {
        FontSplitError::InvalidFont(format!("读取 OpenType 字体失败: {e}"))
    })?;

    // 生成SVG图像
    gen_svg_from_ctx(ctx);
    // 可变字体表缺失或解析失败时按非可变字体处理，不影响切割。
    let vars: Option<FontVariations> = font.take(&mut font_file).ok().flatten();
    ctx.fvar_table = analyze_fvar_table(vars);

    let user_subsets: Vec<Vec<u32>> = decode_user_subsets(&ctx.input.subsets)?;

    // 初始化预处理上下文
    let mut subsets: Vec<IndexSet<u32>> = vec![];
    let mut context = PreSubsetContext {
        all_unicodes: all_unicodes.clone(),
        face: &mut ctx.face,
        // 每个包的大小
        predict_bytes_pre_subset: ctx.input.chunk_size.unwrap_or(1024 * 70)
            as u32,
        font: &font,
        subsets: &user_subsets,
        font_file: &mut font_file,
        used_languages: HashMap::new(),
    };

    // 初始化处理流程，根据输入配置决定是否启用各个插件功能
    let mut process: Vec<
        fn(
            &mut Vec<IndexSet<u32>>,
            &mut BTreeSet<u32>,
            &mut PreSubsetContext<'_, '_, '_>,
        ) -> Result<()>,
    > = vec![];
    process.push(plugin_add_user_subset::plugin_add_user_subset);
    if ctx.input.language_areas.unwrap_or(true) {
        process.push(language_area_plugin);
    }
    if ctx.input.subset_remain_chars.unwrap_or(true) {
        process.push(add_remain_chars_plugin);
    }
    if ctx.input.auto_subset.unwrap_or(true) {
        process.push(plugin_auto_subset);
    }
    if ctx.input.font_feature.unwrap_or(true) {
        process.push(features_plugin);
    }
    // 尚未调试好这个算法，所以不启用
    if ctx.input.reduce_mins.unwrap_or(false) {
        process.push(reduce_min_plugin);
    }
    // 执行所有启用的插件处理流程
    for p in process {
        p(&mut subsets, &mut all_unicodes, &mut context)?;
    }
    // 根据处理结果更新上下文的预处理子集结果
    ctx.pre_subset_result = subsets
        .iter()
        .filter(|v| !v.is_empty())
        .map(|v| v.iter().copied().collect::<Vec<u32>>())
        .collect();

    // 分析并更新名称表
    ctx.name_table = name_table::analyze_name_table(&font, &mut font_file);
    Ok(())
}
