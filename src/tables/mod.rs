//! 与管线阶段无关的字体表解析工具。
//!
//! `fvar` 与 `name_table` 只做「读字体表 → 结构化数据」，既不依赖
//! `pre_subset` 的中间状态，也不产生副作用。放在这里作为中性叶子，
//! `contract` 与 `link_subset` 可以直接引用，而不必跨阶段依赖 `pre_subset`。

pub mod fvar;
pub mod name_table;
