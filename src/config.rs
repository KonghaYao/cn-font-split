//! 统一配置源：默认值、入口校验与 wire IR 转换。
//!
//! `Config` 是核心内部唯一的配置真相：
//!
//! - 所有默认值只在 [`Config::default`] / [`CssConfig::default`] 里出现一次，
//!   `pre_subset`、`run_subset`、`link_subset` 直接读已解析字段，不再各自
//!   `unwrap_or`；
//! - [`Config::from_template`] 负责把 `InputTemplate` 解析成 `Config`，并在此
//!   完成入口校验（错误 variant 与历史行为一致）；
//! - [`Config::to_template`] 把 `Config` 回写成 `InputTemplate`。
//!
//! `InputTemplate`（`crates/proto/src/index.proto`）只是跨语言 **wire IR**，
//! 不承载默认值语义；CLI 与 FFI 都以 `Config` 为构造入口。
//!
//! 默认值表见 `docs/CONFIG.md`，与代码的一致性由 `tests/config_defaults.rs`
//! 守住。

use cn_font_proto::api_interface::InputTemplate;
use cn_font_proto::api_interface::input_template::{
    CssProperties, PolyfillType, PreviewImage,
};

use crate::error::{FontSplitError, Result};

/// 默认分包体积预算：70 KiB。
///
/// `chunk_size` 是每个分包的压缩后目标字节数，`0`/负数会让切分无法推进，
/// 因此 [`Config::from_template`] 直接拒绝。
pub const DEFAULT_CHUNK_SIZE: i32 = 1024 * 70;

/// 默认包大小容差；当前尚未参与分包计算（见计划 §A.7）。
pub const DEFAULT_CHUNK_SIZE_TOLERANCE: f32 = 0.0;

/// name 表里找不到字体家族名时的 CSS 回退值。
pub const DEFAULT_FONT_FAMILY: &str = "default_font_family";

/// 默认 `font-display`。
pub const DEFAULT_FONT_DISPLAY: &str = "swap";

/// 默认 CSS 文件名。
pub const DEFAULT_CSS_FILE_NAME: &str = "result.css";

/// 已解析的 CSS 配置：凡是能静态确定的默认值都已在构造时填好，
/// 只有依赖 name 表的字段（家族/字重/样式）保留 `Option`。
#[derive(Debug, Clone, PartialEq)]
pub struct CssConfig {
    /// `None` 表示从 name 表推导。
    pub font_family: Option<String>,
    /// `None` 表示从 name 表/可变字体推导。
    pub font_weight: Option<String>,
    /// `None` 表示按子族名判断是否斜体。
    pub font_style: Option<String>,
    pub font_display: String,
    pub local_family: Vec<String>,
    pub polyfill: Vec<PolyfillType>,
    pub comment_base: bool,
    pub comment_name_table: bool,
    pub comment_unicodes: bool,
    pub compress: bool,
    pub file_name: String,
}

impl Default for CssConfig {
    fn default() -> Self {
        Self {
            font_family: None,
            font_weight: None,
            font_style: None,
            font_display: DEFAULT_FONT_DISPLAY.to_string(),
            local_family: vec![],
            polyfill: vec![],
            comment_base: true,
            comment_name_table: true,
            comment_unicodes: false,
            compress: true,
            file_name: DEFAULT_CSS_FILE_NAME.to_string(),
        }
    }
}

impl CssConfig {
    /// 从 wire IR 解析：显式给出的字段覆盖默认值，缺省字段保持 [`Default`]。
    pub fn from_proto(css: &CssProperties) -> Self {
        let defaults = Self::default();
        Self {
            font_family: css.font_family.clone(),
            font_weight: css.font_weight.clone(),
            font_style: css.font_style.clone(),
            font_display: css
                .font_display
                .clone()
                .unwrap_or(defaults.font_display),
            local_family: css.local_family.clone(),
            polyfill: css.polyfill.clone(),
            comment_base: css.comment_base.unwrap_or(defaults.comment_base),
            comment_name_table: css
                .comment_name_table
                .unwrap_or(defaults.comment_name_table),
            comment_unicodes: css
                .comment_unicodes
                .unwrap_or(defaults.comment_unicodes),
            compress: css.compress.unwrap_or(defaults.compress),
            file_name: css.file_name.clone().unwrap_or(defaults.file_name),
        }
    }

    /// 回写为 wire IR。已解析字段都会写成 `Some`，再次解析结果不变。
    pub fn to_proto(&self) -> CssProperties {
        CssProperties {
            font_family: self.font_family.clone(),
            font_weight: self.font_weight.clone(),
            font_style: self.font_style.clone(),
            font_display: Some(self.font_display.clone()),
            local_family: self.local_family.clone(),
            polyfill: self.polyfill.clone(),
            comment_base: Some(self.comment_base),
            comment_name_table: Some(self.comment_name_table),
            comment_unicodes: Some(self.comment_unicodes),
            compress: Some(self.compress),
            file_name: Some(self.file_name.clone()),
        }
    }
}

/// 已解析、已校验的核心配置。
///
/// 字段语义与 `InputTemplate` 对应，但默认值已在构造时落地，
/// 下游阶段不需要再判断 `Option`。
#[derive(Debug, Clone, PartialEq)]
pub struct Config {
    /// ttf/otf/woff2 文件内容。
    pub input: Vec<u8>,
    /// 每字符 4 字节小端编码的用户分包，解码在 `pre_subset` 内完成。
    pub subsets: Vec<Vec<u8>>,
    pub css: CssConfig,
    /// 是否按语言区域拆分剩余字符。
    pub language_areas: bool,
    /// 每个分包的目标字节数。
    pub chunk_size: i32,
    /// 包大小容差；当前未参与计算。
    pub chunk_size_tolerance: f32,
    /// 最大允许分包数；当前只做合法性校验。
    pub max_allow_subsets_count: Option<i32>,
    pub test_html: bool,
    pub reporter: bool,
    pub preview_image: Option<PreviewImage>,
    pub rename_output_font: Option<String>,
    /// 构建模式；当前只透传，语义待 §A.7 定义。
    pub build_mode: Option<String>,
    /// 是否使用多线程；当前恒为并行构建。
    pub multi_threads: bool,
    pub font_feature: bool,
    pub reduce_mins: bool,
    pub auto_subset: bool,
    pub subset_remain_chars: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            input: vec![],
            subsets: vec![],
            css: CssConfig::default(),
            language_areas: true,
            chunk_size: DEFAULT_CHUNK_SIZE,
            chunk_size_tolerance: DEFAULT_CHUNK_SIZE_TOLERANCE,
            max_allow_subsets_count: None,
            test_html: true,
            reporter: true,
            preview_image: None,
            rename_output_font: None,
            build_mode: None,
            multi_threads: true,
            font_feature: true,
            reduce_mins: false,
            auto_subset: true,
            subset_remain_chars: true,
        }
    }
}

impl Config {
    /// 解析 wire IR 并校验。校验失败的错误 variant 与迁入前一致。
    pub fn from_template(template: &InputTemplate) -> Result<Self> {
        validate(template)?;

        let defaults = Self::default();
        Ok(Self {
            input: template.input.clone(),
            subsets: template.subsets.clone(),
            css: template
                .css
                .as_ref()
                .map(CssConfig::from_proto)
                .unwrap_or_default(),
            language_areas: template
                .language_areas
                .unwrap_or(defaults.language_areas),
            chunk_size: template.chunk_size.unwrap_or(defaults.chunk_size),
            chunk_size_tolerance: template
                .chunk_size_tolerance
                .unwrap_or(defaults.chunk_size_tolerance),
            max_allow_subsets_count: template.max_allow_subsets_count,
            test_html: template.test_html.unwrap_or(defaults.test_html),
            reporter: template.reporter.unwrap_or(defaults.reporter),
            preview_image: template.preview_image.clone(),
            rename_output_font: template.rename_output_font.clone(),
            build_mode: template.build_mode.clone(),
            multi_threads: template
                .multi_threads
                .unwrap_or(defaults.multi_threads),
            font_feature: template
                .font_feature
                .unwrap_or(defaults.font_feature),
            reduce_mins: template.reduce_mins.unwrap_or(defaults.reduce_mins),
            auto_subset: template.auto_subset.unwrap_or(defaults.auto_subset),
            subset_remain_chars: template
                .subset_remain_chars
                .unwrap_or(defaults.subset_remain_chars),
        })
    }

    /// 回写 wire IR，供 CLI / FFI 交给 [`crate::font_split`]。
    pub fn to_template(&self) -> InputTemplate {
        InputTemplate {
            input: self.input.clone(),
            subsets: self.subsets.clone(),
            css: Some(self.css.to_proto()),
            language_areas: Some(self.language_areas),
            chunk_size: Some(self.chunk_size),
            chunk_size_tolerance: Some(self.chunk_size_tolerance),
            max_allow_subsets_count: self.max_allow_subsets_count,
            test_html: Some(self.test_html),
            reporter: Some(self.reporter),
            preview_image: self.preview_image.clone(),
            rename_output_font: self.rename_output_font.clone(),
            build_mode: self.build_mode.clone(),
            multi_threads: Some(self.multi_threads),
            font_feature: Some(self.font_feature),
            reduce_mins: Some(self.reduce_mins),
            auto_subset: Some(self.auto_subset),
            subset_remain_chars: Some(self.subset_remain_chars),
            ..Default::default()
        }
    }
}

/// 入口校验：在读取/解析字体之前把用户输入问题转成结构化错误。
fn validate(config: &InputTemplate) -> Result<()> {
    if config.input.is_empty() {
        return Err(FontSplitError::EmptyInput);
    }

    for (index, subset) in config.subsets.iter().enumerate() {
        if subset.len() % 4 != 0 {
            return Err(FontSplitError::InvalidSubsets(format!(
                "subsets[{index}] 的字节长度 {} 不是 4 的倍数",
                subset.len()
            )));
        }
    }

    // chunk_size 会被转换为 u32 用作分包字节预算；
    // 0 会让 `split_vector` 每次取 0 个字符而陷入死循环，负数则会被
    // 当成巨大的 u32，因此必须在入口拒绝。
    if let Some(chunk_size) = config.chunk_size {
        if chunk_size <= 0 {
            return Err(FontSplitError::InvalidConfig(format!(
                "chunk_size 必须大于 0，当前为 {chunk_size}"
            )));
        }
    }

    // 该字段当前未参与分包计算，但非法值说明调用方配置有误，仍然拒绝。
    if let Some(count) = config.max_allow_subsets_count {
        if count <= 0 {
            return Err(FontSplitError::InvalidConfig(format!(
                "max_allow_subsets_count 必须大于 0，当前为 {count}"
            )));
        }
    }

    Ok(())
}
