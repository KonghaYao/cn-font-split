use cn_font_proto::api_interface::InputTemplate;
use cn_font_split::font_split as fp;
use libc::size_t;
use prost::Message;
use std::slice;
type Callback = extern "C" fn(*const u8, size_t);

#[unsafe(no_mangle)]
pub extern "C" fn font_split(
    input: *const u8,
    input_len: size_t,
    callback: Callback,
) {
    // 将输入的指针和长度转换为切片
    let input_slice = unsafe { slice::from_raw_parts(input, input_len) };
    let config = InputTemplate::decode(input_slice)
        .expect("decode input_template error");
    // ABI 保持 void；错误事件在 B 阶段接入，这里先忽略返回值。
    let _ = fp(config, |e| {
        let mut output_data: Vec<u8> = vec![];
        e.encode(&mut output_data).expect("encode error");
        let size = output_data.len();
        let p = output_data.as_mut_ptr();
        callback(p, size);
    });
}
