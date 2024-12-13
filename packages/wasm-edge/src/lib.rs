use cn_font_proto::api_interface::{EventName, InputTemplate};
use cn_font_split::font_split;
use cn_font_utils::read_binary_file;
use env_logger;
use prost::Message;

#[no_mangle]
pub fn main() {
    env_logger::init();
    let args: Vec<String> = std::env::args().collect();
    let target = "/tmp/fonts/".to_owned() + &args[0];
    let input = read_binary_file(&target).expect("Failed to read input file");
    let config =
        InputTemplate::decode(&input[..]).expect("Failed to decode input");
    font_split(config, |x| {
        if EventName::try_from(x.event) == Ok(EventName::OutputData) {
            let path = "/tmp/".to_owned() + &args[0] + "/" + &x.message;
            let _ = std::fs::write(path, x.data.unwrap()).unwrap();
        }
    });
}

#[no_mangle]
pub fn _start() {
    main()
}
