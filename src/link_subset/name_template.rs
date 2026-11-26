use std::cmp::Ordering;

/// 与旧实现中 `regex` 的 Unicode `\w` 逐码位等价。
///
/// `\w` 的字符类是 `[\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\p{Join_Control}]`，
/// 标准库只暴露 Alphabetic 与 N* 类别，因此这里以
/// `is_alphanumeric() || '_'` 为基线，再用两张差集表修正：
/// `WORD_EXTRA`（`\w` 有、基线没有：组合符、连接符、Join_Control），
/// `NOT_WORD`（基线有、`\w` 没有：No 类数字，如 `²`、`¼`）。
/// 两表由移除 `regex` 前对全部码位的穷举差分生成，用于保证重构前后
/// 输出逐字符一致。基线用的是标准库的 Unicode 表（Rust 1.85 为 17.0），
/// 升级工具链后若该表变化，需重新生成差集。
fn is_word(c: char) -> bool {
    let cp = c as u32;
    if in_ranges(NOT_WORD, cp) {
        return false;
    }
    in_ranges(WORD_EXTRA, cp) || c.is_alphanumeric() || c == '_'
}

/// 码位是否落在有序且互不重叠的区间表内。
fn in_ranges(table: &[(u32, u32)], cp: u32) -> bool {
    table
        .binary_search_by(|&(lo, hi)| {
            if cp < lo {
                Ordering::Greater
            } else if cp > hi {
                Ordering::Less
            } else {
                Ordering::Equal
            }
        })
        .is_ok()
}

/// 非空且全部为词字符。
fn is_word_run(s: &str) -> bool {
    !s.is_empty() && s.chars().all(is_word)
}

/// `[` 与 `]` 之间的语法结构。
enum Placeholder<'a> {
    /// `[\tag\]`：转义，原样输出 `[tag]`。
    Escaped(&'a str),
    /// `[tag]` 或 `[tag:arg]`。
    Tag { name: &'a str, arg: Option<&'a str> },
}

/// 解析括号内部内容，不合法时返回 `None`（整段按字面量处理）。
///
/// 合法性判定与旧正则 `\[(\\\w+\\|\w+(?::\w+)?)\]` 完全一致：
/// 最多一个冒号，两侧均非空且全部为词字符。
fn parse_placeholder(inner: &str) -> Option<Placeholder<'_>> {
    // 转义形式 `\tag\`：内部为空（如 `[\\]`）时旧实现不匹配，按字面量处理。
    if let Some(rest) = inner.strip_prefix('\\') {
        let tag = rest.strip_suffix('\\')?;
        return is_word_run(tag).then_some(Placeholder::Escaped(tag));
    }
    let (name, arg) = match inner.split_once(':') {
        Some((name, arg)) => (name, Some(arg)),
        None => (inner, None),
    };
    let valid = is_word_run(name) && arg.is_none_or(is_word_run);
    valid.then_some(Placeholder::Tag { name, arg })
}

/// 写出 `tag` 对应的值；未知 tag 返回 `false`。
fn push_tag(
    out: &mut String,
    name: &str,
    arg: Option<&str>,
    hash: &str,
    ext: &str,
    index: &usize,
) -> bool {
    match name {
        "index" => out.push_str(&index.to_string()),
        "ext" => out.push_str(ext),
        // `[hash]` 为主名，`[blake3]` 为同义名，`[md5]` 仅为向后兼容保留的
        // 历史别名，三者指向同一份哈希值（不再计算 md5）。
        "hash" | "blake3" | "md5" => {
            // 长度参数解析失败（如 `[hash:abc]`）时与旧实现一致：用完整哈希。
            match arg.and_then(|a| a.parse::<usize>().ok()) {
                Some(len) => out.extend(hash.chars().take(len)),
                None => out.push_str(hash),
            }
        }
        _ => return false,
    }
    true
}

/// 按模板生成输出文件名。
///
/// 语法与旧实现（正则 `\[(\\\w+\\|\w+(?::\w+)?)\]`）完全一致：
/// - 普通文本原样输出；
/// - `[tag]` / `[tag:arg]`：`hash`（别名 `blake3`、`md5`）按
///   `chars().take(arg)` 截断，`arg` 非数字时用完整哈希；`ext`、`index`
///   忽略 `arg`；
/// - 未知 tag 原样保留；
/// - `[\tag\]` 去掉反斜杠后输出 `[tag]`；
/// - 未闭合的 `[`、空 tag、非法参数（如 `[a:b:c]`）原样保留；
/// - 嵌套括号等价于“外层 `[` 是字面量”，内层照常展开（`[[hash]]` →
///   `[<hash>]`）。
pub fn name_template(
    template: &str,
    hash: &str,
    ext: &str,
    index: &usize,
) -> String {
    let bytes = template.as_bytes();
    let mut out = String::with_capacity(template.len());
    let mut cursor = 0;
    // `]` 的扫描游标只前进，保证整体只扫描一遍。
    let mut close = 0;
    while cursor < bytes.len() {
        if bytes[cursor] != b'[' {
            let end = bytes[cursor..]
                .iter()
                .position(|&b| b == b'[')
                .map_or(bytes.len(), |p| cursor + p);
            out.push_str(&template[cursor..end]);
            cursor = end;
            continue;
        }
        if close < cursor + 1 {
            close = cursor + 1;
        }
        while close < bytes.len() && bytes[close] != b']' {
            close += 1;
        }
        if close == bytes.len() {
            // 没有可配对的 `]`：余下内容全部原样输出。
            out.push_str(&template[cursor..]);
            break;
        }
        let inner = &template[cursor + 1..close];
        let consumed = match parse_placeholder(inner) {
            Some(Placeholder::Escaped(tag)) => {
                out.push('[');
                out.push_str(tag);
                out.push(']');
                true
            }
            Some(Placeholder::Tag { name, arg }) => {
                push_tag(&mut out, name, arg, hash, ext, index)
            }
            None => false,
        };
        if consumed {
            cursor = close + 1;
        } else {
            // 未识别：`[` 按字面量输出，再从下一个字符继续扫描。旧实现在
            // 该位置匹配失败后同样只前移一位，因此嵌套的 `[...]` 仍会展开。
            out.push('[');
            cursor += 1;
        }
    }
    out
}

// 旧 `regex` 的 `\w` 相对 `is_alphanumeric() || '_'` 的差集，按码位升序。
#[rustfmt::skip]
const WORD_EXTRA: &[(u32, u32)] = &[
    (0x0300, 0x0344), (0x0346, 0x0362), (0x0483, 0x0489), (0x0591, 0x05AF),
    (0x0658, 0x0658), (0x06DF, 0x06E0), (0x06EA, 0x06EC), (0x0740, 0x074A),
    (0x07EB, 0x07F3), (0x07FD, 0x07FD), (0x0818, 0x0819), (0x082D, 0x082D),
    (0x0859, 0x085B), (0x0898, 0x089F), (0x08CA, 0x08D3), (0x08E0, 0x08E1),
    (0x08EA, 0x08EF), (0x093C, 0x093C), (0x094D, 0x094D), (0x0951, 0x0954),
    (0x09BC, 0x09BC), (0x09CD, 0x09CD), (0x09FE, 0x09FE), (0x0A3C, 0x0A3C),
    (0x0A4D, 0x0A4D), (0x0ABC, 0x0ABC), (0x0ACD, 0x0ACD), (0x0AFD, 0x0AFF),
    (0x0B3C, 0x0B3C), (0x0B4D, 0x0B4D), (0x0B55, 0x0B55), (0x0BCD, 0x0BCD),
    (0x0C3C, 0x0C3C), (0x0C4D, 0x0C4D), (0x0CBC, 0x0CBC), (0x0CCD, 0x0CCD),
    (0x0D3B, 0x0D3C), (0x0D4D, 0x0D4D), (0x0DCA, 0x0DCA), (0x0E47, 0x0E4C),
    (0x0E4E, 0x0E4E), (0x0EBA, 0x0EBA), (0x0EC8, 0x0ECC), (0x0ECE, 0x0ECE),
    (0x0F18, 0x0F19), (0x0F35, 0x0F35), (0x0F37, 0x0F37), (0x0F39, 0x0F39),
    (0x0F3E, 0x0F3F), (0x0F84, 0x0F84), (0x0F86, 0x0F87), (0x0FC6, 0x0FC6),
    (0x1037, 0x1037), (0x1039, 0x103A), (0x135D, 0x135F), (0x1714, 0x1715),
    (0x1734, 0x1734), (0x17B4, 0x17B5), (0x17C9, 0x17D3), (0x17DD, 0x17DD),
    (0x180B, 0x180D), (0x180F, 0x180F), (0x1939, 0x193B), (0x1A60, 0x1A60),
    (0x1A75, 0x1A7C), (0x1A7F, 0x1A7F), (0x1AB0, 0x1ABE), (0x1AC1, 0x1ACB),
    (0x1B34, 0x1B34), (0x1B44, 0x1B44), (0x1B6B, 0x1B73), (0x1BAA, 0x1BAB),
    (0x1BE6, 0x1BE6), (0x1BF2, 0x1BF3), (0x1C37, 0x1C37), (0x1CD0, 0x1CD2),
    (0x1CD4, 0x1CE8), (0x1CED, 0x1CED), (0x1CF4, 0x1CF4), (0x1CF7, 0x1CF9),
    (0x1DC0, 0x1DD2), (0x1DF5, 0x1DFF), (0x200C, 0x200D), (0x203F, 0x2040),
    (0x2054, 0x2054), (0x20D0, 0x20F0), (0x2CEF, 0x2CF1), (0x2D7F, 0x2D7F),
    (0x302A, 0x302F), (0x3099, 0x309A), (0xA66F, 0xA672), (0xA67C, 0xA67D),
    (0xA6F0, 0xA6F1), (0xA806, 0xA806), (0xA82C, 0xA82C), (0xA8C4, 0xA8C4),
    (0xA8E0, 0xA8F1), (0xA92B, 0xA92D), (0xA953, 0xA953), (0xA9B3, 0xA9B3),
    (0xA9C0, 0xA9C0), (0xAABF, 0xAABF), (0xAAC1, 0xAAC1), (0xAAF6, 0xAAF6),
    (0xABEC, 0xABED), (0xFE00, 0xFE0F), (0xFE20, 0xFE2F), (0xFE33, 0xFE34),
    (0xFE4D, 0xFE4F), (0xFF3F, 0xFF3F), (0x101FD, 0x101FD), (0x102E0, 0x102E0),
    (0x10A38, 0x10A3A), (0x10A3F, 0x10A3F), (0x10AE5, 0x10AE6), (0x10D6A, 0x10D6D),
    (0x10EFD, 0x10EFF), (0x10F46, 0x10F50), (0x10F82, 0x10F85), (0x11046, 0x11046),
    (0x11070, 0x11070), (0x1107F, 0x1107F), (0x110B9, 0x110BA), (0x11133, 0x11134),
    (0x11173, 0x11173), (0x111C0, 0x111C0), (0x111C9, 0x111CC), (0x11235, 0x11236),
    (0x112E9, 0x112EA), (0x1133B, 0x1133C), (0x1134D, 0x1134D), (0x11366, 0x1136C),
    (0x11370, 0x11374), (0x113CE, 0x113D0), (0x113D2, 0x113D2), (0x113E1, 0x113E2),
    (0x11442, 0x11442), (0x11446, 0x11446), (0x1145E, 0x1145E), (0x114C2, 0x114C3),
    (0x115BF, 0x115C0), (0x1163F, 0x1163F), (0x116B6, 0x116B7), (0x1172B, 0x1172B),
    (0x11839, 0x1183A), (0x1193D, 0x1193E), (0x11943, 0x11943), (0x119E0, 0x119E0),
    (0x11A33, 0x11A34), (0x11A47, 0x11A47), (0x11A98, 0x11A99), (0x11C3F, 0x11C3F),
    (0x11D42, 0x11D42), (0x11D44, 0x11D45), (0x11D97, 0x11D97), (0x11F41, 0x11F42),
    (0x11F5A, 0x11F5A), (0x13440, 0x13440), (0x13447, 0x13455), (0x1612F, 0x1612F),
    (0x16AF0, 0x16AF4), (0x16B30, 0x16B36), (0x16FE4, 0x16FE4), (0x1BC9D, 0x1BC9D),
    (0x1CF00, 0x1CF2D), (0x1CF30, 0x1CF46), (0x1D165, 0x1D169), (0x1D16D, 0x1D172),
    (0x1D17B, 0x1D182), (0x1D185, 0x1D18B), (0x1D1AA, 0x1D1AD), (0x1D242, 0x1D244),
    (0x1DA00, 0x1DA36), (0x1DA3B, 0x1DA6C), (0x1DA75, 0x1DA75), (0x1DA84, 0x1DA84),
    (0x1DA9B, 0x1DA9F), (0x1DAA1, 0x1DAAF), (0x1E130, 0x1E136), (0x1E2AE, 0x1E2AE),
    (0x1E2EC, 0x1E2EF), (0x1E4EC, 0x1E4EF), (0x1E5EE, 0x1E5EF), (0x1E8D0, 0x1E8D6),
    (0x1E944, 0x1E946), (0x1E948, 0x1E94A), (0xE0100, 0xE01EF),
];

// 同上，方向相反：`is_alphanumeric() || '_'` 有、`\w` 没有（No 类数字）。
#[rustfmt::skip]
const NOT_WORD: &[(u32, u32)] = &[
    (0x00B2, 0x00B3), (0x00B9, 0x00B9), (0x00BC, 0x00BE), (0x09F4, 0x09F9),
    (0x0B72, 0x0B77), (0x0BF0, 0x0BF2), (0x0C78, 0x0C7E), (0x0D58, 0x0D5E),
    (0x0D70, 0x0D78), (0x0F2A, 0x0F33), (0x1369, 0x137C), (0x17F0, 0x17F9),
    (0x19DA, 0x19DA), (0x2070, 0x2070), (0x2074, 0x2079), (0x2080, 0x2089),
    (0x2150, 0x215F), (0x2189, 0x2189), (0x2460, 0x249B), (0x24EA, 0x24FF),
    (0x2776, 0x2793), (0x2CFD, 0x2CFD), (0x3192, 0x3195), (0x3220, 0x3229),
    (0x3248, 0x324F), (0x3251, 0x325F), (0x3280, 0x3289), (0x32B1, 0x32BF),
    (0xA830, 0xA835), (0x10107, 0x10133), (0x10175, 0x10178), (0x1018A, 0x1018B),
    (0x102E1, 0x102FB), (0x10320, 0x10323), (0x10858, 0x1085F), (0x10879, 0x1087F),
    (0x108A7, 0x108AF), (0x108FB, 0x108FF), (0x10916, 0x1091B), (0x109BC, 0x109BD),
    (0x109C0, 0x109CF), (0x109D2, 0x109FF), (0x10A40, 0x10A48), (0x10A7D, 0x10A7E),
    (0x10A9D, 0x10A9F), (0x10AEB, 0x10AEF), (0x10B58, 0x10B5F), (0x10B78, 0x10B7F),
    (0x10BA9, 0x10BAF), (0x10CFA, 0x10CFF), (0x10E60, 0x10E7E), (0x10F1D, 0x10F26),
    (0x10F51, 0x10F54), (0x10FC5, 0x10FCB), (0x11052, 0x11065), (0x111E1, 0x111F4),
    (0x1173A, 0x1173B), (0x118EA, 0x118F2), (0x11C5A, 0x11C6C), (0x11FC0, 0x11FD4),
    (0x16B5B, 0x16B61), (0x16E80, 0x16E96), (0x1D2C0, 0x1D2D3), (0x1D2E0, 0x1D2F3),
    (0x1D360, 0x1D378), (0x1E8C7, 0x1E8CF), (0x1EC71, 0x1ECAB), (0x1ECAD, 0x1ECAF),
    (0x1ECB1, 0x1ECB4), (0x1ED01, 0x1ED2D), (0x1ED2F, 0x1ED3D), (0x1F100, 0x1F10C),
];

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试夹具：提供常用的测试数据
    struct TestFixture {
        hash: String,
        ext: String,
        index: usize,
    }

    impl Default for TestFixture {
        fn default() -> Self {
            Self {
                hash: "4f5e8f2d9c1b7a6301d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4"
                    .to_string(),
                ext: "txt".to_string(),
                index: 1,
            }
        }
    }

    /// 测试基本占位符替换功能
    #[test]
    fn test_simple_placeholder() {
        let fixture = TestFixture::default();
        let template = "file_[hash].[ext]";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, format!("file_{}.{}", fixture.hash, fixture.ext));
    }

    /// 测试带参数的占位符替换功能
    #[test]
    fn test_parameterized_placeholder() {
        let fixture = TestFixture::default();
        let template = "short_hash_[hash:8]";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, format!("short_hash_{}", &fixture.hash[..8]));
    }

    /// 测试转义占位符功能
    #[test]
    fn test_escaped_placeholder() {
        let fixture = TestFixture::default();
        let template = r"file_[\ext\]";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, "file_[ext]");
    }

    /// 测试不存在的占位符处理
    #[test]
    fn test_nonexistent_placeholder() {
        let fixture = TestFixture::default();
        let template = "prefix_$(nonexistent)_suffix";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, template);
    }

    /// 测试索引占位符功能
    #[test]
    fn test_index_placeholder() {
        let fixture = TestFixture { index: 42, ..Default::default() };
        let template = "item_[index]";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, "item_42");
    }

    /// 测试边界情况：空模板
    #[test]
    fn test_empty_template() {
        let fixture = TestFixture::default();
        let template = "";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, "");
    }

    /// 测试边界情况：特殊字符
    #[test]
    fn test_special_characters() {
        let fixture = TestFixture::default();
        let template = "!@#$%^&*()_+[hash]";
        let result = name_template(
            template,
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, format!("!@#$%^&*()_+{}", fixture.hash));
    }

    /// `[hash]`、`[blake3]`、`[md5]`（历史别名）必须展开为同一个哈希值
    #[test]
    fn test_hash_alias_equivalence() {
        let fixture = TestFixture::default();
        let expected = format!("{0}_{0}_{0}", &fixture.hash[..6]);
        let result = name_template(
            "[hash:6]_[blake3:6]_[md5:6]",
            &fixture.hash,
            &fixture.ext,
            &fixture.index,
        );
        assert_eq!(result, expected);
    }

    /// 新用例统一入口：固定夹具
    fn render(template: &str) -> String {
        let f = TestFixture::default();
        name_template(template, &f.hash, &f.ext, &f.index)
    }

    /// 未闭合的 `[` 与其后内容原样输出
    #[test]
    fn test_unclosed_bracket() {
        assert_eq!(render("a_[hash"), "a_[hash");
        assert_eq!(render("["), "[");
        assert_eq!(render("pre[hash"), "pre[hash");
    }

    /// 嵌套括号：外层 `[` 视为字面量，内层照常展开
    #[test]
    fn test_nested_brackets() {
        let hash = TestFixture::default().hash;
        assert_eq!(render("[[hash]]"), format!("[{hash}]"));
        assert_eq!(render("[[hash]"), format!("[{hash}"));
        assert_eq!(render("[a[hash]b]"), format!("[a{hash}b]"));
    }

    /// 空 tag、多冒号、含空白的 tag 都原样保留
    #[test]
    fn test_empty_and_invalid_tags() {
        assert_eq!(render("[]"), "[]");
        assert_eq!(render("[:]"), "[:]");
        assert_eq!(render("[hash:]"), "[hash:]");
        assert_eq!(render("[a:b:c]"), "[a:b:c]");
        assert_eq!(render("[hash:1:2]"), "[hash:1:2]");
        assert_eq!(render("[ hash ]"), "[ hash ]");
    }

    /// 连续占位符
    #[test]
    fn test_consecutive_placeholders() {
        let f = TestFixture::default();
        assert_eq!(
            render("[hash][ext][index]"),
            format!("{}{}{}", f.hash, f.ext, f.index)
        );
    }

    /// 转义形式：内部必须是词字符，否则整体原样保留
    #[test]
    fn test_escape_forms() {
        assert_eq!(render(r"[\unknown\]"), "[unknown]");
        assert_eq!(render(r"[\hash\]"), "[hash]");
        assert_eq!(render(r"[\a b\]"), r"[\a b\]");
        assert_eq!(render(r"[\\]"), r"[\\]");
        assert_eq!(render(r"[\hash:8\]"), r"[\hash:8\]");
    }

    /// 哈希长度参数：非数字回退完整哈希，非词字符整体原样保留
    #[test]
    fn test_hash_length_edges() {
        let f = TestFixture::default();
        assert_eq!(render("[hash:0]"), "");
        assert_eq!(render("[hash:999]"), f.hash);
        assert_eq!(render("[hash:abc]"), f.hash);
        assert_eq!(render("[hash:8x]"), f.hash);
        assert_eq!(render("[hash:+1]"), "[hash:+1]");
    }

    /// 非 ASCII：Alphabetic / Nd 属于 `\w`，可作为 tag 或参数
    #[test]
    fn test_non_ascii() {
        let f = TestFixture::default();
        assert_eq!(render("[中文]"), "[中文]");
        assert_eq!(render("[hash:中文]"), f.hash);
        assert_eq!(render("[hash:１２]"), f.hash);
    }

    /// 与 `is_alphanumeric()` 有差异的字符类别仍须保持旧 `\w` 语义：
    /// No 类数字（`²`）不是词字符；组合符、Join_Control、连接符是词字符。
    #[test]
    fn test_word_class_parity() {
        let f = TestFixture::default();
        assert_eq!(render("[hash:²]"), "[hash:²]");
        assert_eq!(render("[hash:¼]"), "[hash:¼]");
        assert_eq!(render("[hash:①]"), "[hash:①]");
        assert_eq!(render("[hash:\u{0301}]"), f.hash);
        assert_eq!(render("[hash:\u{200D}]"), f.hash);
        assert_eq!(render("[hash:‿]"), f.hash);
        assert_eq!(render("[\\\u{0301}\\]"), "[\u{0301}]");
    }
}
