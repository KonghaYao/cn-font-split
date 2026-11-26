//! CSS 文本的极简 AST。
//!
//! 只覆盖本库实际生成的形态：一段头部注释 + 若干 `@font-face` 规则（可选
//! 前置 unicode 注释）。渲染结果必须与历史字符串拼接逐字节一致，因此这里
//! 刻意保留了几处历史怪癖（见 `render_src` 与 `FontFace::render`）。

use unicode_range::UnicodeRange;

/// `src` 描述符中的一项。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SrcItem {
    /// `local("...")`
    Local(String),
    /// `url("...")`，可选 `format("...")` 后缀。
    Url { url: String, format: Option<String> },
}

/// 一条 `@font-face` 规则。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FontFace {
    pub family: String,
    pub src: Vec<SrcItem>,
    pub style: String,
    pub display: String,
    pub weight: String,
    pub unicode_range: Vec<u32>,
}

/// 样式表中的节点。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CssNode {
    /// 渲染为 `/* text */\n`；`compress` 下换行同样保留。
    Comment(String),
    FontFace(FontFace),
}

/// 完整样式表：头部文本按原样输出，后接各节点。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Stylesheet {
    pub header: String,
    pub nodes: Vec<CssNode>,
}

impl Stylesheet {
    /// 渲染样式表。
    ///
    /// `compress` 为真时删除 `@font-face` 内部的换行（历史行为），但头部与
    /// 注释节点里的换行保持不变；否则每条声明前缩进 `indent` 个空格、
    /// 闭合 `}` 顶格。
    pub fn render(&self, compress: bool, indent: usize) -> String {
        let mut out = String::new();
        out.push_str(&self.header);
        for node in &self.nodes {
            match node {
                CssNode::Comment(text) => {
                    out.push_str("/* ");
                    out.push_str(text);
                    out.push_str(" */\n");
                }
                CssNode::FontFace(face) => {
                    out.push_str(&face.render(compress, indent));
                }
            }
        }
        out
    }
}

impl FontFace {
    fn render(&self, compress: bool, indent: usize) -> String {
        let space = if compress { String::new() } else { " ".repeat(indent) };
        let rules = [
            format!("font-family:\"{}\"", self.family),
            format!("src:{}", render_src(&self.src)),
            format!("font-style:{}", self.style),
            format!("font-display:{}", self.display),
            format!("font-weight:{}", self.weight),
            format!(
                "unicode-range:{}",
                UnicodeRange::stringify(&self.unicode_range)
            ),
        ];
        let mut block = String::from("@font-face{\n");
        for rule in rules {
            block.push_str(&space);
            block.push_str(&rule);
            block.push_str(";\n");
        }
        block.push('}');
        if compress { block.replace('\n', "") } else { block }
    }
}

/// 渲染 `src` 描述符。
///
/// 历史产物里分包文件本身的 `url(...)` 与 `format(...)` 之间没有空格，而
/// polyfill 的写法是 `url(...) format(...)`（有一个空格）。`SrcItem::Url`
/// 不携带这个差异，故约定 `src` 中第一个 `Url` 是分包文件、其余都是
/// polyfill；`output_css` 里唯一的构造点满足该约定。
fn render_src(src: &[SrcItem]) -> String {
    let mut out = String::new();
    let mut has_subset_url = false;
    for (idx, item) in src.iter().enumerate() {
        if idx > 0 {
            out.push(',');
        }
        match item {
            SrcItem::Local(name) => {
                out.push_str("local(\"");
                out.push_str(name);
                out.push_str("\")");
            }
            SrcItem::Url { url, format } => {
                out.push_str("url(\"");
                out.push_str(url);
                out.push_str("\")");
                if let Some(format) = format {
                    if has_subset_url {
                        out.push(' ');
                    }
                    out.push_str("format(\"");
                    out.push_str(format);
                    out.push_str("\")");
                }
                has_subset_url = true;
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_face() -> FontFace {
        FontFace {
            family: "Demo Sans".to_string(),
            src: vec![
                SrcItem::Local("Demo Sans".to_string()),
                SrcItem::Url {
                    url: "./abc.woff2".to_string(),
                    format: Some("woff2".to_string()),
                },
                SrcItem::Url {
                    url: "fallback.ttf".to_string(),
                    format: Some("truetype".to_string()),
                },
            ],
            style: "italic".to_string(),
            display: "swap".to_string(),
            weight: "700".to_string(),
            unicode_range: vec![0x4E00, 0x4E01, 0x4E03],
        }
    }

    fn sample_stylesheet() -> Stylesheet {
        Stylesheet {
            header: "/* hdr\n */\n\n".to_string(),
            nodes: vec![
                CssNode::Comment("一丁".to_string()),
                CssNode::FontFace(sample_face()),
            ],
        }
    }

    #[test]
    fn render_compressed_keeps_legacy_bytes() {
        let expected = concat!(
            "/* hdr\n */\n\n",
            "/* 一丁 */\n",
            "@font-face{",
            "font-family:\"Demo Sans\";",
            "src:local(\"Demo Sans\"),url(\"./abc.woff2\")format(\"woff2\"),",
            "url(\"fallback.ttf\") format(\"truetype\");",
            "font-style:italic;",
            "font-display:swap;",
            "font-weight:700;",
            "unicode-range:U+4E00-4E01,U+4E03;",
            "}",
        );
        assert_eq!(sample_stylesheet().render(true, 4), expected);
    }

    #[test]
    fn render_pretty_keeps_legacy_bytes() {
        let expected = concat!(
            "/* hdr\n */\n\n",
            "/* 一丁 */\n",
            "@font-face{\n",
            "    font-family:\"Demo Sans\";\n",
            "    src:local(\"Demo Sans\"),url(\"./abc.woff2\")format(\"woff2\"),",
            "url(\"fallback.ttf\") format(\"truetype\");\n",
            "    font-style:italic;\n",
            "    font-display:swap;\n",
            "    font-weight:700;\n",
            "    unicode-range:U+4E00-4E01,U+4E03;\n",
            "}",
        );
        assert_eq!(sample_stylesheet().render(false, 4), expected);
    }
}
