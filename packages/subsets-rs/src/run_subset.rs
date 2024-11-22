use crate::protos::{output_report, EventMessage};
use crate::runner::Context;
use cn_font_utils::u8_size_in_kb;
use harfbuzz_rs_now::subset::Subset;
use harfbuzz_rs_now::{Face, Owned};
use log::info;
use woff::version2::compress;
use std::time::Instant;

// 构建单个分包为字体文件
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

/// 根据预处理结果，生成字体子集文件，通过 callback 返回文件保存数据
pub fn run_subset(ctx: &mut Context) {
    let face = Face::from_bytes(&ctx.input.input, 0);

    let origin_length = u8_size_in_kb(&ctx.input.input);
    let origin_size: u32 = face.collect_unicodes().len().try_into().unwrap();
    let mut bundled_length: f64 = 0.0;
    let mut bundled_size: u32 = 0;

    info!("font subset result log");
    ctx.pre_subset_result.iter().enumerate().for_each(|(index, r)| {
        let start_time = Instant::now();

        let result = build_single_subset(&face, r);
        let result_bytes = u8_size_in_kb(&result);
        let digest = md5::compute(result.as_slice());
        // println!("{:?}", hash);
        let hash_string = format!("{:x}", digest);

        (ctx.callback)(EventMessage {
            event: "output_data".to_string(),
            data: Option::from(result),
            message: Option::from(hash_string.to_string() + ".woff2"),
        });
        ctx.run_subset_result.push(RunSubsetResult {
            hash: hash_string.to_string(),
            unicodes: r.clone(),
        });

        // 后面均是日志
        let duration = start_time.elapsed();

        bundled_size += r.len() as u32;
        bundled_length += result_bytes;

        ctx.reporter.subset_detail.push(
            output_report::SubsetDetail {
                id: index as u32,
                hash: hash_string.to_string(),
                chars: r.clone(),
                bytes: result_bytes as u32,
                duration: duration.as_millis() as u32,
            }
        );
        info!(
            "{}\t{}ms/{}/{}kb\t{}",
            index,
            duration.as_millis(),
            r.len(),
            result_bytes as u32,
            hash_string.to_string()
        )
    });

    ctx.reporter.bundle_message = Some(output_report::BundleMessage {
        origin_length: origin_length as u32,
        origin_size,
        bundled_length: bundled_length as u32,
        bundled_size,
    })
}

pub struct RunSubsetResult {
    pub hash: String,
    pub unicodes: Vec<u32>,
}

