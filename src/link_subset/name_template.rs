use cn_font_utils::slice_string;
use regex::Regex;
use std::collections::HashMap;

type Replacer = Box<dyn Fn(Option<&str>) -> String>;

fn create_replacer(value: impl Into<String>) -> Replacer {
    let value_str = value.into();
    Box::new(move |_| value_str.clone())
}

fn create_length_replacer(replacer: Replacer) -> Replacer {
    Box::new(move |arg| {
        if let Some(length_arg) = arg {
            if let Ok(length) = length_arg.parse::<usize>() {
                return replacer(None).chars().take(length).collect();
            }
        }
        replacer(None)
    })
}

pub fn name_template(
    template: &str,
    hash: &str,
    ext: &str,
    index: &usize,
) -> String {
    let mut replacements: HashMap<String, Replacer> = HashMap::new();
    // 添加索引占位符的替换函数。
    replacements
        .insert("index".to_string(), create_replacer(index.to_string()));
    replacements.insert("ext".to_string(), create_replacer(ext));

    // 添加哈希占位符的替换函数，这里同时使用'md5'作为别名。
    replacements.insert(
        "hash".to_string(),
        create_length_replacer(create_replacer(hash)),
    );
    replacements.insert(
        "md5".to_string(),
        create_length_replacer(create_replacer(hash)),
    );

    // 编译正则表达式
    let re = Regex::new(r"\[\\*([\w:]+)\\*\]").unwrap();

    re.replace_all(template, |caps: &regex::Captures| {
        let text = caps.get(0).map_or("", |m| m.as_str());
        // 判断是否为简单的占位符（无参数）。
        if text.len() > 2 {
            let inner_tag = slice_string(text, 1, -1);
            // 尝试解析占位符的类型和参数。
            if let Some(captures) =
                Regex::new(r"^(\w+)(?::(\w+))?$").unwrap().captures(&inner_tag)
            {
                let kind = captures.get(1).map_or("", |m| m.as_str());
                let arg = captures.get(2).map_or("", |m| m.as_str());

                // 获取对应的替换函数，并应用参数进行替换。
                if let Some(replacer) = replacements.get(kind) {
                    return replacer(Some(arg)).to_owned();
                }
            }
        } else if caps.get(1).map_or(false, |m| !m.as_str().is_empty()) {
            let inner_tag = slice_string(text, 2, -2);
            // 处理转义的字符。
            return format!("[{}]", inner_tag);
        }
        // 对无法识别的匹配项，原样返回。
        caps[0].to_string()
    })
    .to_string()
}

#[test]
fn test_simple_placeholder() {
    let template = "file_[hash].[ext]";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 1;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, format!("file_{}.{}", hash, ext));
}

#[test]
fn test_parameterized_placeholder() {
    let template = "short_hash_[hash:8]";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 1;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, format!("short_hash_{}", &hash[..8]));
}

#[test]
fn test_escaped_placeholder() {
    let template = r"file_[\ext\]";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 1;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, "file_[ext]");
}

#[test]
fn test_alias_placeholder() {
    let template = "alias_$(md5)";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 1;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, format!("alias_{}", hash));
}

#[test]
fn test_nonexistent_placeholder() {
    let template = "prefix_$(nonexistent)_suffix";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 1;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, template); // Should remain unchanged
}

#[test]
fn test_index_placeholder() {
    let template = "item_[index]";
    let hash = "d41d8cd98f00b204e9800998ecf8427e";
    let ext = "txt";
    let index = 42;
    let result = name_template(template, hash, ext, &index);
    assert_eq!(result, "item_42");
}
