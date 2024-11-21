use crate::protos::EventMessage;
use crate::runner::Context;
use harfbuzz_rs_now::subset::Subset;
use harfbuzz_rs_now::{Face, Owned};
use log::{info, trace};
use woff::version2::compress;

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
use std::time::Instant;
/// 根据预处理结果，生成字体子集文件，通过 callback 返回文件保存数据
pub fn run_subset(ctx: &mut Context) {
    let face = Face::from_bytes(&ctx.input.input, 0);
    info!("font subset result log");
    ctx.pre_subset_result.iter().enumerate().for_each(|(index, r)| {
        let start_time = Instant::now();

        let result = build_single_subset(&face, r);
        let result_bytes = vec_size_in_kb(&result);
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

        let duration = start_time.elapsed();
        info!(
            "{}\t{}ms/{}/{}kb\t{:x}",
            index,
            duration.as_millis(),
            r.len(),
            result_bytes,
            digest
        )
    });
}

pub struct RunSubsetResult {
    pub hash: String,
    pub unicodes: Vec<u32>,
}
fn vec_size_in_kb(vec: &Vec<u8>) -> u32 {
    let size_in_bytes = vec.len();
    let size_in_kb = size_in_bytes as f64 / 1024.0;
    size_in_kb as u32
}
