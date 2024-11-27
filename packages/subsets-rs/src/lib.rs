pub mod link_subset;
pub mod pre_subset;
pub mod run_subset;
pub mod runner;
pub use runner::font_split;

#[test]
fn main_test() {
    use cn_font_proto::api_interface::InputTemplate;
    use cn_font_utils::{output_file, read_binary_file};
    use log::info;

    let path = "../demo/public/SmileySans-Oblique.ttf";
    let font_file = read_binary_file(&path).expect("Failed to read file");
    let input = InputTemplate { input: font_file, ..Default::default() };

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
