use crate::config::Config;
use crate::error::{FontSplitError, Result};
use crate::link_subset::name_template::name_template;
use crate::runner::{FontSource, PreSubsetOutput, RunSubsetOutput};
use cn_font_proto::api_interface::output_report::{
    BundleMessage, SubsetDetail,
};
use cn_font_utils::u8_size_in_kb;
use harfbuzz_rs_now::subset::Subset;
use harfbuzz_rs_now::{Face, Owned};
use indexmap::IndexSet;
use log::{debug, warn};
use rayon::iter::{
    IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator,
};
use std::time::Instant;
use woff::version2::compress;

/// 构建单个分包为字体文件
pub fn build_single_subset(
    face: &Owned<Face>,
    subset: &[u32],
) -> Result<Vec<u8>> {
    let subset_runner = Subset::new();
    subset_runner.clear_drop_table();
    subset_runner.adjust_layout();
    subset_runner.add_chars(subset);
    let new_face = subset_runner.run_subset(face).face_data();
    let ttf_binary = new_face.get_data();
    // woff 0.4.0 的 compress 以 Option 表示失败（上游 woff2 编码失败）。
    compress(ttf_binary, String::from(""), 1, true).ok_or_else(|| {
        FontSplitError::Internal(format!(
            "WOFF2 压缩失败（{} 个字符）",
            subset.len()
        ))
    })
}

struct ThreadResult {
    pub subset_result: RunSubsetResult,
    pub log: SubsetDetail,
    /// 待输出的 woff2 字节，emit 由 `font_split_inner` 统一完成。
    pub data: Vec<u8>,
}
/// 根据预处理结果，生成字体子集文件；产物交给调用方按顺序输出
pub fn run_subset(
    source: &FontSource<'_>,
    config: &Config,
    pre: &PreSubsetOutput,
) -> Result<RunSubsetOutput> {
    // 与拆分前一致：报告里的原始字节数是输入字节数，而不是解码后的字体长度。
    let origin_bytes = config.input.len() as u32;
    let all_chars: IndexSet<u32> =
        source.face.collect_unicodes().iter().cloned().collect();
    let origin_size = all_chars.len() as u32;
    let file_name_template = config.rename_output_font.clone();
    debug!("font subset result log");
    let thread_result: Vec<ThreadResult> = pre
        .subsets
        .par_iter()
        .enumerate()
        .map(|(index, r)| {
            let start_time = Instant::now();

            let result = build_single_subset(&source.face, r)?;
            let result_bytes = u8_size_in_kb(&result);
            let hash_string =
                blake3::hash(result.as_slice()).to_hex().to_string();
            let duration = start_time.elapsed();
            debug!(
                "{}\t{}ms/{}/{}kb\t{}",
                index,
                duration.as_millis(),
                r.len(),
                result_bytes,
                hash_string
            );
            let file_name = file_name_template
                .as_ref()
                .map(|name| name_template(name, &hash_string, "woff2", &index))
                .unwrap_or_else(|| format!("{}.woff2", hash_string));
            Ok(ThreadResult {
                subset_result: RunSubsetResult {
                    hash: hash_string.clone(),
                    unicodes: r.clone(),
                    file_name: file_name.clone(),
                },
                log: SubsetDetail {
                    id: index as u32 + 1,
                    file_name: file_name.clone(),
                    hash: hash_string.clone(),
                    chars: r.clone(),
                    bytes: result.len() as u32,
                    duration: duration.as_millis() as u32,
                },
                data: result,
            })
        })
        .collect::<Result<Vec<ThreadResult>>>()?;

    let mut items = Vec::with_capacity(thread_result.len());
    let mut details = Vec::with_capacity(thread_result.len());
    let mut files = Vec::with_capacity(thread_result.len());
    let mut bundle_chars: IndexSet<u32> = IndexSet::new();
    let mut bundled_bytes: u32 = 0;
    for res in thread_result {
        bundled_bytes += res.log.bytes;
        bundle_chars.extend(res.log.chars.iter().cloned());
        let file_name = res.log.file_name.clone();
        items.push(res.subset_result);
        details.push(res.log);
        files.push((file_name, res.data));
    }

    // 汇报构建前后的 unicode 差异
    let diff: Vec<u32> = bundle_chars
        .difference(&all_chars)
        .cloned()
        .filter(|&x| x != 0)
        .collect();

    if !diff.is_empty() {
        warn!(
            "subsets result diff: {} \n {}",
            diff.len(),
            diff.iter()
                .map(|x| x.to_string())
                .collect::<Vec<String>>()
                .join(" ")
        );
    }

    Ok(RunSubsetOutput {
        items,
        bundle: BundleMessage {
            origin_size,
            bundled_size: bundle_chars.len() as u32,
            origin_bytes,
            bundled_bytes,
        },
        files,
        details,
    })
}

#[derive(Debug, Clone, Default)]
pub struct RunSubsetResult {
    pub hash: String,
    pub unicodes: Vec<u32>,
    pub file_name: String,
}
