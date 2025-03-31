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
    let re = Regex::new(r"\[(\\\w+\\|\w+(?::\w+)?)\]").unwrap();

    re.replace_all(template, |caps: &regex::Captures| {
        let text = caps.get(0).map_or("", |m| m.as_str());
        let inner_tag = caps.get(1).map_or("", |m| m.as_str());

        // 检查是否是转义的占位符
        if inner_tag.starts_with('\\') && inner_tag.ends_with('\\') {
            // 如果是转义的占位符，去掉转义字符并返回 [tag] 格式
            let tag = &inner_tag[1..inner_tag.len() - 1];
            return format!("[{}]", tag);
        }

        // 处理非转义的占位符
        if let Some(captures) =
            Regex::new(r"^(\w+)(?::(\w+))?$").unwrap().captures(inner_tag)
        {
            let kind = captures.get(1).map_or("", |m| m.as_str());
            let arg = captures.get(2).map_or("", |m| m.as_str());

            // 获取对应的替换函数，并应用参数进行替换
            if let Some(replacer) = replacements.get(kind) {
                return replacer(Some(arg)).to_owned();
            }
        }
        // 对无法识别的匹配项，原样返回。
        caps[0].to_string()
    })
    .to_string()
}

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
                hash: "d41d8cd98f00b204e9800998ecf8427e".to_string(),
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
        let mut fixture = TestFixture::default();
        fixture.index = 42;
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
}
