use harfbuzz_rs_now::{Face, Owned};
use harfbuzz_rs_now::subset::Subset;
use woff::version2::compress;
use crate::protos::EventMessage;
use crate::runner::Context;

// 构建单个分包为字体文件
pub fn build_single_subset(face: &Owned<Face>, subset: &Vec<u32>) -> Vec<u8> {
    let subset_runner =
        Subset::new();
    subset_runner.clear_drop_table();
    subset_runner.adjust_layout();
    subset_runner.add_chars(subset);
    let new_face = subset_runner.run_subset(&face).face_data();
    let ttf_binary = new_face.get_data();
    let woff2_binary = compress(ttf_binary, String::from(""), 1, true).expect("Failed to compress subset");
    woff2_binary
}

/// 根据预处理结果，生成字体子集文件，通过 callback 返回文件保存数据
pub fn run_subset(ctx: &mut Context, callback: fn(event: EventMessage)) {
    let subset_packages = ctx.pre_subset_result.as_mut().expect("No subset packages found");
    let face = Face::from_bytes(&ctx.input.input, 0);
    subset_packages.iter().enumerate().for_each(|(index, r)| {
        let result = build_single_subset(&face, r);
        callback(EventMessage {
            event: "output_data".to_string(),
            data: Option::from(result),
            message: Option::from(index.to_string()),
        })
    });
}