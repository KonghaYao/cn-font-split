use std::borrow::Cow;
use woff::version2::decompress;

const WOFF2_MAGIC: [u8; 4] = [0x77, 0x4F, 0x46, 0x32];

// 探测文件是否为 WOFF2 格式
fn is_woff2(data: &[u8]) -> bool {
    data.starts_with(&WOFF2_MAGIC)
}

// 从字节数组中加载 WOFF2 字体，返回字节数组。若不是 WOFF2 格式，则返回原始字节数组。
pub fn smart_load_woff2(data: &[u8]) -> Cow<[u8]> {
    if is_woff2(data) {
        Cow::Owned(decompress(data).expect("illegal woff2 file"))
    } else {
        Cow::Borrowed(data)
    }
}