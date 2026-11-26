//! 核心错误模型。
//!
//! 8.0 起核心路径不再 panic：所有面向用户输入的失败都返回
//! [`FontSplitError`]，由入口（CLI / FFI / JS）决定如何呈现。
//!
//! 变体划分对应调用方需要区分的处理方式：
//! - [`FontSplitError::EmptyInput`]：输入 buffer 为空
//! - [`FontSplitError::InvalidWoff2`]：WOFF2 头合法但解压失败
//! - [`FontSplitError::InvalidFont`]：字体解析失败（损坏/非字体数据）
//! - [`FontSplitError::InvalidSubsets`]：`subsets` 编码不合法
//! - [`FontSplitError::InvalidConfig`]：配置值非法（如 `chunk_size <= 0`）
//! - [`FontSplitError::Io`]：IO 相关失败
//! - [`FontSplitError::Internal`]：内部不变量/上游库失败（可视为 bug）

/// 核心流程的结构化错误。
#[derive(Debug, thiserror::Error)]
pub enum FontSplitError {
    #[error("输入字体数据为空")]
    EmptyInput,
    #[error("非法的 WOFF2 字体: {0}")]
    InvalidWoff2(String),
    #[error("无法解析字体: {0}")]
    InvalidFont(String),
    #[error("非法的 subsets: {0}")]
    InvalidSubsets(String),
    #[error("非法的配置: {0}")]
    InvalidConfig(String),
    #[error("IO 错误: {0}")]
    Io(String),
    #[error("内部错误: {0}")]
    Internal(String),
}

/// 核心流程的统一 `Result`。
pub type Result<T> = std::result::Result<T, FontSplitError>;
