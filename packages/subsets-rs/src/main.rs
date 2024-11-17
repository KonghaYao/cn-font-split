mod pre_subset;
mod run_subset;

use std::io::Read;
use crate::run_subset::run_subset;
use opentype::File;
use prost::Message;

mod protos {
    include!("./pb/api_interface.rs");
}

fn main() {
    let path = "../demo/public/SmileySans-Oblique.ttf";
    let mut font_file = std::fs::File::open(path).expect("Failed to open file");
    let File { mut fonts } = File::read(&mut font_file).expect("Failed to read file");
    // make_gpos(&fonts[0],&mut font_file);
    let set = pre_subset::analyze_gsub(&fonts[0], &mut font_file);
    run_subset(&path, &set)
}

#[test]
fn test() {
    let path = "../demo/public/SmileySans-Oblique.ttf";
    let font_file = read_binary_file(&path).expect("Failed to read file");
    let person = protos::InputTemplate { input: font_file, out_dir: None, css: None, target_type: None, subsets: None, language_areas: None, chunk_size: None, chunk_size_tolerance: None, max_allow_subsets_count: None, css_file_name: None, test_html: None, reporter: None, preview_image: None, rename_output_font: None, build_mode: None, multi_threads: None, font_feature: None, reduce_mins: None, auto_subset: None, subset_remain_chars: None };
    let mut encoded = Vec::new();
    person.encode(&mut encoded).expect("encoding failed");

    let decoded = protos::InputTemplate::decode(&encoded[..]).unwrap();
    // println!("Decoded: {:?}", decoded);
}
pub fn read_binary_file(file_path: &str) -> std::io::Result<Vec<u8>> {
    // 打开文件
    let mut file = std::fs::File::open(file_path)?;

    // 创建一个空的 Vec<u8> 来存储文件内容
    let mut buffer = Vec::new();

    // 读取文件内容到缓冲区
    file.read_to_end(&mut buffer)?;

    Ok(buffer)
}