use crate::message::EventFactory;
use crate::runner::Context;
use cn_font_proto::api_interface::output_report::{
    BundleMessage, SubsetDetail,
};
use cn_font_proto::api_interface::EventMessage;
use cn_font_utils::u8_size_in_kb;
use harfbuzz_rs_now::subset::Subset;
use harfbuzz_rs_now::{Face, Owned};
use log::info;
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
    let origin_bytes: u32 = (&ctx.input.input).len() as u32;
    let origin_size: u32 =
        ctx.face.collect_unicodes().len().try_into().unwrap();

    info!("font subset result log");
    let thread_result: Vec<ThreadResult> = ctx
        .pre_subset_result
        .par_iter()
        .enumerate()
        .map(|(index, r)| {
            let start_time = Instant::now();

            let result = build_single_subset(&ctx.face, r);
            let result_bytes = u8_size_in_kb(&result);
            let digest = md5::compute(result.as_slice());
            // println!("{:?}", hash);
            let hash_string = format!("{:x}", digest);
            let duration = start_time.elapsed();
            info!(
                "{}\t{}ms/{}/{}kb\t{}",
                index,
                duration.as_millis(),
                r.len(),
                result_bytes,
                hash_string.to_string()
            );
            ThreadResult {
                subset_result: RunSubsetResult {
                    hash: hash_string.to_string(),
                    unicodes: r.clone(),
                },
                log: SubsetDetail {
                    id: index as u32,
                    hash: hash_string.to_string(),
                    chars: r.clone(),
                    bytes: result.len() as u32,
                    duration: duration.as_millis() as u32,
                },
                message: EventMessage::output_data(
                    (hash_string.to_string() + ".woff2").as_str(),
                    result,
                ),
            }
        })
        .collect::<Vec<ThreadResult>>();
    let mut bundled_bytes: u32 = 0;
    let mut bundled_size: u32 = 0;

    for res in thread_result {
        (ctx.callback)(res.message);

        bundled_bytes += res.log.bytes;
        bundled_size += res.log.chars.len() as u32;
        ctx.run_subset_result.push(res.subset_result);
        ctx.reporter.subset_detail.push(res.log);
    }

    ctx.reporter.bundle_message = Some(BundleMessage {
        origin_size,
        bundled_size,
        origin_bytes,
        bundled_bytes,
    })
}

#[derive(Debug, Clone)]
pub struct RunSubsetResult {
    pub hash: String,
    pub unicodes: Vec<u32>,
}
