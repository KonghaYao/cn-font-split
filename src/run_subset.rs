use crate::link_subset::name_template::name_template;
use crate::message::EventFactory;
use crate::runner::Context;
use cn_font_proto::api_interface::output_report::{
    BundleMessage, SubsetDetail,
};
use cn_font_proto::api_interface::EventMessage;
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
pub fn build_single_subset(face: &Owned<Face>, subset: &Vec<u32>) -> Vec<u8> {
    let subset_runner = Subset::new();
    subset_runner.clear_drop_table();
    subset_runner.adjust_layout();
    subset_runner.add_chars(subset);
    let new_face = subset_runner.run_subset(&face).face_data();
    let ttf_binary = new_face.get_data();
    let woff2_binary = compress(ttf_binary, String::from(""), 1, true)
        .expect("Failed to compress subset");
    woff2_binary
}

struct ThreadResult {
    pub subset_result: RunSubsetResult,
    pub log: SubsetDetail,
    pub message: EventMessage,
}
/// 根据预处理结果，生成字体子集文件，通过 callback 返回文件保存数据
pub fn run_subset(ctx: &mut Context) {
    let origin_bytes = ctx.input.input.len() as u32;
    let all_chars: IndexSet<u32> =
        ctx.face.collect_unicodes().iter().cloned().collect();
    let origin_size = all_chars.len() as u32;
    let file_name_template = ctx.input.rename_output_font.clone();
    debug!("font subset result log");
    let thread_result: Vec<ThreadResult> = ctx
        .pre_subset_result
        .par_iter()
        .enumerate()
        .map(|(index, r)| {
            let start_time = Instant::now();

            let result = build_single_subset(&ctx.face, r);
            let result_bytes = u8_size_in_kb(&result);
            let hash_string = format!("{:x}", md5::compute(result.as_slice()));
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
            ThreadResult {
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
                message: EventMessage::output_data(&file_name, result),
            }
        })
        .collect();
    let (bundled_bytes, bundle_chars): (u32, IndexSet<u32>) = thread_result
        .iter()
        .fold((0, IndexSet::new()), |(mut bytes, mut chars), res| {
            (ctx.callback)(res.message.clone());

            bytes += res.log.bytes;
            chars.extend(res.log.chars.iter().cloned());
            ctx.run_subset_result.push(res.subset_result.clone());
            ctx.reporter.subset_detail.push(res.log.clone());
            (bytes, chars)
        });

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

    ctx.reporter.bundle_message = Some(BundleMessage {
        origin_size,
        bundled_size: bundle_chars.len() as u32,
        origin_bytes,
        bundled_bytes,
    })
}

#[derive(Debug, Clone, Default)]
pub struct RunSubsetResult {
    pub hash: String,
    pub unicodes: Vec<u32>,
    pub file_name: String,
}
