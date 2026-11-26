//! 8.0 起 `data/*.dat` 已入库，构建阶段不再生成数据，也不需要 cmake。
//!
//! 只有在显式重新生成数据时才需要运行 `pnpm gen:unicodes`
//! （见 `examples/gen_unicodes.rs`）。

use std::path::Path;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let data_dir = Path::new(&manifest_dir).join("data");

    for name in ["cn_char_rank.dat", "hangul-syl.dat"] {
        let file = data_dir.join(name);
        println!("cargo:rerun-if-changed={}", file.display());
        if !file.exists() {
            panic!(
                "缺少生成的数据文件 {}，请在仓库根目录运行 `pnpm gen:unicodes` 重新生成后重试",
                file.display()
            );
        }
    }
}
