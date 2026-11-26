use crate::config::Config;
use crate::contract::{
    FontSource, PreSubsetOutput, RunSubsetOutput, RunSubsetResult,
};
use crate::error::Result;
use crate::naming::name_template;
use crate::pack::build_single_subset;
use cn_font_proto::api_interface::output_report::{
    BundleMessage, SubsetDetail,
};
use cn_font_utils::u8_size_in_kb;
use harfbuzz_rs_now::{Face, Owned};
use indexmap::IndexSet;
use log::{debug, warn};
use rayon::iter::{
    IndexedParallelIterator, IntoParallelRefIterator, ParallelIterator,
};
use std::time::Instant;

struct ThreadResult {
    pub subset_result: RunSubsetResult,
    pub log: SubsetDetail,
    /// 待输出的 woff2 字节，emit 由 `font_split_inner` 统一完成。
    pub data: Vec<u8>,
}

/// 构建第 `index` 个分包：并行路径与顺序路径共用，保证两条路径的产物、
/// 文件名与 reporter 内容完全一致。
fn build_one(
    face: &Owned<Face>,
    subset: &[u32],
    file_name_template: Option<&str>,
    index: usize,
) -> Result<ThreadResult> {
    let start_time = Instant::now();

    let result = build_single_subset(face, subset)?;
    let result_bytes = u8_size_in_kb(&result);
    let hash_string = blake3::hash(result.as_slice()).to_hex().to_string();
    let duration = start_time.elapsed();
    debug!(
        "{}\t{}ms/{}/{}kb\t{}",
        index,
        duration.as_millis(),
        subset.len(),
        result_bytes,
        hash_string
    );
    let file_name = file_name_template
        .map(|name| name_template(name, &hash_string, "woff2", &index))
        .unwrap_or_else(|| format!("{}.woff2", hash_string));
    Ok(ThreadResult {
        subset_result: RunSubsetResult {
            unicodes: subset.to_vec(),
            file_name: file_name.clone(),
        },
        log: SubsetDetail {
            id: index as u32 + 1,
            file_name: file_name.clone(),
            hash: hash_string.clone(),
            chars: subset.to_vec(),
            bytes: result.len() as u32,
            duration: duration.as_millis() as u32,
        },
        data: result,
    })
}

/// 根据预处理结果，生成字体子集文件；产物交给调用方按顺序输出。
///
/// `multi_threads` 只决定用 rayon 并行还是顺序 `for` 构建，两条路径都走
/// [`build_one`]，因此输出顺序、文件名与字节内容相同（仅耗时字段不同）。
pub fn run_subset(
    source: &FontSource<'_>,
    config: &Config,
    pre: &PreSubsetOutput,
) -> Result<RunSubsetOutput> {
    // 与拆分前一致：报告里的原始字节数是输入字节数，而不是解码后的字体长度。
    let origin_bytes = config.input.len() as u32;
    // 字符全集由 pre 阶段给出（同一 face 不再重复 collect_unicodes）。
    let all_chars: IndexSet<u32> = pre.all_unicodes.iter().copied().collect();
    let origin_size = all_chars.len() as u32;
    let file_name_template = config.rename_output_font.as_deref();
    debug!("font subset result log");
    let thread_result: Vec<ThreadResult> = if config.multi_threads {
        pre.subsets
            .par_iter()
            .enumerate()
            .map(|(index, r)| {
                build_one(&source.face, r, file_name_template, index)
            })
            .collect::<Result<Vec<ThreadResult>>>()?
    } else {
        // 顺序路径：单线程宿主（如 wasm）避免 rayon 线程池开销。
        let mut results = Vec::with_capacity(pre.subsets.len());
        for (index, r) in pre.subsets.iter().enumerate() {
            results.push(build_one(
                &source.face,
                r,
                file_name_template,
                index,
            )?);
        }
        results
    };

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
