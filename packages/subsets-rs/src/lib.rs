pub mod link_subset;
pub mod pre_subset;
pub mod run_subset;
pub mod runner;
pub use runner::font_split;

pub mod protos {
    include!("./pb/api_interface.rs");
}

#[test]
fn main_test() {
    use cn_font_utils::{output_file, read_binary_file};
    use log::info;

    let path = "../demo/public/SmileySans-Oblique.ttf";
    let font_file = read_binary_file(&path).expect("Failed to read file");
    let input =
        protos::InputTemplate { input: font_file, ..Default::default() };

    let start = std::time::Instant::now();
    env_logger::init();
    info!("this is a debug {}", "message");
    font_split(input, |m| {
        // println!("{}  {}", m.event, m.message.unwrap_or("".to_owned()));
        // 打开一个文件以供写入，如果文件不存在，则创建它
        match m.data {
            Some(data) => {
                output_file(&format!("dist/{}", m.message), &data)
                    .expect("write file error");
            }
            _ => (),
        }
    });
    let duration = start.elapsed();

    println!("Time: {:?}", duration);
}

#[test]
fn test() {
    use cn_font_utils::read_binary_file;
    use prost::Message;
    let path = "../demo/public/SmileySans-Oblique.ttf";
    let font_file = read_binary_file(&path).expect("Failed to read file");
    let person = protos::InputTemplate {
        input: font_file,
        out_dir: None,
        css: None,
        target_type: None,
        subsets: None,
        language_areas: None,
        chunk_size: None,
        chunk_size_tolerance: None,
        max_allow_subsets_count: None,
        test_html: None,
        reporter: None,
        preview_image: None,
        rename_output_font: None,
        build_mode: None,
        multi_threads: None,
        font_feature: None,
        reduce_mins: None,
        auto_subset: None,
        subset_remain_chars: None,
    };
    let mut encoded = Vec::new();
    person.encode(&mut encoded).expect("encoding failed");

    let decoded = protos::InputTemplate::decode(&encoded[..]).unwrap();
    println!("Decoded: {:?}", decoded.css);
}
