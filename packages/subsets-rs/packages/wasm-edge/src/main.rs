use cn_font_proto::api_interface::InputTemplate;
use cn_font_split::font_split;
pub fn main() {
    let config = InputTemplate::default();
    font_split(config, |x| {
        println!("{:?}", x.message);
    });
}
