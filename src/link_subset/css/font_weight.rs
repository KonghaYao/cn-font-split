//! 字体权重相关的工具函数

// 按照字符串长度降序排序的权重映射
const FONT_WEIGHT_NAME: [(&str, u32); 15] = [
    ("extra light", 200),
    ("ultra light", 200),
    ("extra bold", 800),
    ("ultra bold", 800),
    ("semi bold", 600),
    ("demi bold", 600),
    ("hairline", 100),
    ("regular", 400),
    ("medium", 500),
    ("normal", 400),
    ("light", 300),
    ("black", 900),
    ("heavy", 900),
    ("bold", 700),
    ("thin", 100),
];

/// 从字体子族名称中获取字体权重
pub fn get_weight(sub_family: &str) -> u32 {
    let sub_family = sub_family.to_ascii_lowercase();

    // 遍历数组找到最长匹配的权重
    let mut max_len = 0;
    let mut weight = 400; // 默认权重

    for &(name, value) in FONT_WEIGHT_NAME.iter() {
        if sub_family.contains(name) && name.len() > max_len {
            max_len = name.len();
            weight = value;
        }
    }

    weight
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weight_detection() {
        // 基本权重测试
        assert_eq!(get_weight("thin"), 100);
        assert_eq!(get_weight("bold"), 700);
        assert_eq!(get_weight("regular"), 400);
        assert_eq!(get_weight("unknown"), 400); // 默认值

        // 组合权重测试
        assert_eq!(get_weight("extra bold italic"), 800);
        assert_eq!(get_weight("ultra light regular"), 200);
        assert_eq!(get_weight("semi bold thin"), 600);

        // 大小写测试
        assert_eq!(get_weight("BOLD"), 700);
        assert_eq!(get_weight("Light"), 300);
        assert_eq!(get_weight("ExTrA BoLd"), 800);

        // 边界情况测试
        assert_eq!(get_weight(""), 400);
        assert_eq!(get_weight("not a weight"), 400);
        assert_eq!(get_weight("bold light"), 300); // 应该匹配最先的
    }
}
