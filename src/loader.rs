use std::borrow::Cow;
use woff::version2::decompress;

const WOFF2_MAGIC: [u8; 4] = [0x77, 0x4F, 0x46, 0x32];

// 探测文件是否为 WOFF2 格式
fn is_woff2(data: &[u8]) -> bool {
    data.starts_with(&WOFF2_MAGIC)
}

// 从字节数组中加载 WOFF2 字体，返回字节数组。若不是 WOFF2 格式，则返回原始字节数组。
pub fn smart_load_woff2(data: &[u8]) -> Cow<'_, [u8]> {
    if is_woff2(data) {
        Cow::Owned(decompress(data).expect("illegal woff2 file"))
    } else {
        Cow::Borrowed(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_woff2() {
        // 有效的 WOFF2 文件头
        let valid_woff2 = [0x77, 0x4F, 0x46, 0x32, 0x00, 0x00, 0x00, 0x00];
        assert!(is_woff2(&valid_woff2));

        // 无效的文件头
        let invalid_data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        assert!(!is_woff2(&invalid_data));

        // 空数据
        let empty_data = [];
        assert!(!is_woff2(&empty_data));
    }

    #[test]
    fn test_smart_load_woff2() {
        // 测试非 WOFF2 数据
        let non_woff2_data = [0x01, 0x02, 0x03, 0x04];
        let result = smart_load_woff2(&non_woff2_data);
        assert!(matches!(result, Cow::Borrowed(_)));
        assert_eq!(result.as_ref(), non_woff2_data);

        // 注意：由于 WOFF2 解压缩需要有效的 WOFF2 数据，
        // 这里我们只测试了非 WOFF2 的情况。
        // 完整的 WOFF2 测试需要提供有效的 WOFF2 文件数据，
        // 这通常需要较大的测试数据文件。
    }
}
