//! 阶段之间的共享契约：输入句柄与各阶段产物。
//!
//! 依赖方向固定为：
//!
//! ```text
//! runner → contract
//! pre_subset → contract
//! run_subset → contract
//! link_subset → contract
//! ```
//!
//! 三个阶段彼此不互相引用（`pack` 与 `naming` 是共享的叶子实现），
//! 这样调整任一阶段的内部结构不会牵动其余阶段。本模块只在 crate 内可见。

use crate::pre_subset::fvar::FvarTable;
use crate::pre_subset::name_table::NameTableSets;
use cn_font_proto::api_interface::output_report::{
    BundleMessage, Css, SubsetDetail,
};
use harfbuzz_rs_now::{Face, Owned};

/// 管线输入：字体原始字节与已解析的 harfbuzz face。
///
/// `pre_subset` 需要 `&mut Face`（部分插件会改写 face 状态），后续阶段只读。
pub struct FontSource<'a> {
    pub binary: &'a [u8],
    pub face: Owned<Face<'a>>,
}

/// `pre_subset` 阶段产物。
pub struct PreSubsetOutput {
    /// 过滤掉空包后的分包字符表。
    pub subsets: Vec<Vec<u32>>,
    /// 字体覆盖的全部码点（升序去重），供 `run_subset` 复用，
    /// 避免对同一个 face 再调一次 `collect_unicodes`。
    pub all_unicodes: Vec<u32>,
    pub name_table: NameTableSets,
    /// 可变字体轴信息；非可变字体为 `None`。
    pub fvar: Option<FvarTable>,
    /// 需要在 pre 阶段输出的附加文件（当前只有 preview SVG），按产生顺序排列。
    pub extra_files: Vec<(String, Vec<u8>)>,
}

/// 单个分包的构建结果（供 CSS 的 unicode-range 与 reporter 使用）。
#[derive(Debug, Clone, Default)]
pub struct RunSubsetResult {
    pub unicodes: Vec<u32>,
    pub file_name: String,
}

/// `run_subset` 阶段产物。
pub struct RunSubsetOutput {
    pub items: Vec<RunSubsetResult>,
    pub bundle: BundleMessage,
    /// 待输出的 woff2 文件，与 [`Self::items`]、[`Self::details`]
    /// 一一对应且顺序相同。
    pub files: Vec<(String, Vec<u8>)>,
    /// 每个分包的构建明细，供 `OutputReport::subset_detail` 使用。
    pub details: Vec<SubsetDetail>,
}

/// `link_subset` 阶段产物。
pub struct LinkSubsetOutput {
    /// CSS 文件内容。
    pub css: String,
    /// 附带产物（`index.html`、`index.proto`），按输出顺序排列。
    pub extra_files: Vec<(String, Vec<u8>)>,
    /// 供 `OutputReport::css` 使用的字体家族/样式/字重/display。
    pub css_report: Css,
}
