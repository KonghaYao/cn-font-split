//! 8.0 起 `src/lib/*.rs` 已入库，构建阶段不再生成代码，也不需要 protoc。
//!
//! 只有在显式重新生成代码时才需要运行 `pnpm gen:proto`
//! （见 `examples/gen_proto.rs`）。

use std::path::Path;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let src_dir = Path::new(&manifest_dir).join("src");
    let mod_rs = src_dir.join("lib").join("mod.rs");

    for file in [
        mod_rs.clone(),
        src_dir.join("index.proto"),
        src_dir.join("services.proto"),
    ] {
        println!("cargo:rerun-if-changed={}", file.display());
    }

    if !mod_rs.exists() {
        panic!(
            "缺少生成的 proto 代码 {}，请在仓库根目录运行 `pnpm gen:proto`（需要 protoc）重新生成后重试",
            mod_rs.display()
        );
    }
}
