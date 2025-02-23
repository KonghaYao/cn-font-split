pub mod link_subset;
pub mod pre_subset;
pub mod run_subset;
pub mod runner;
pub use runner::font_split;
mod loader;
mod message;

#[test]
fn main_test() {
    use std::env;
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    fn test_on(path: &str, dist_dir: &str) {
        use cn_font_proto::api_interface::input_template::CssProperties;
        use cn_font_proto::api_interface::input_template::PreviewImage;
        use cn_font_proto::api_interface::InputTemplate;
        use cn_font_utils::{output_file, read_binary_file};
        use log::info;

        let font_file = read_binary_file(&path).expect("Failed to read file");
        let input = InputTemplate {
            input: font_file,
            preview_image: Some(PreviewImage {
                name: "preview".to_string(),
                text: "中文网字计划\nThe Chinese Web Font Project".to_string(),
            }),
            css: Some(CssProperties {
                // font_family: Some("New".to_string()),
                // font_weight: Some("200".to_string()),
                // font_style: Some("italic".to_string()),
                // font_display: Some("auto".to_string()),
                // local_family: vec!["New2".to_string()],
                // polyfill: vec![],
                // comment_base: Some(true),
                // comment_name_table: Some(true),
                // comment_unicodes: Some(true),
                // compress: Some(true),
                // file_name: Some("input.css".to_string()),
                ..Default::default()
            }),

            // 精确控制
            // subsets: vec![[65]].iter().map(|x| u32_array_to_u8_array(x)).collect(),
            // language_areas: Some(false),
            // auto_subset: Some(false),
            // font_feature: Some(false),
            // reduce_mins: Some(false),
            // rename_output_font: Some("font_[hash:6].[ext]".to_string()),
            ..Default::default()
        };

        let start = std::time::Instant::now();
        font_split(input, |m| {
            // println!("{}  {}", m.event, m.message.unwrap_or("".to_owned()));
            // 打开一个文件以供写入，如果文件不存在，则创建它
            match m.data {
                Some(data) => {
                    output_file(
                        &format!("dist/{}/{}", dist_dir, m.message),
                        &data,
                    )
                    .expect("write file error");
                }
                _ => (),
            }
        });

        let duration = start.elapsed();
        println!("Time: {:?}", duration);
    }

    test_on("./packages/demo/public/SmileySans-Oblique.ttf", "ttf");
    test_on("./packages/demo/public/SmileySans-Oblique.ttf.woff2", "woff2");
}
