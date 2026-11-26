//! 显式重新生成 `crates/proto/src/lib/*.rs` 的工具（需要 protoc）。
//!
//! 默认构建不需要 protoc：生成结果已入库，`build.rs` 只做存在性检查。
//! 仅在需要重新生成代码时运行：
//!
//! ```sh
//! pnpm gen:proto
//! ```

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn main() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let src_dir = manifest_dir.join("src");
    let out_dir = src_dir.join("lib");
    fs::create_dir_all(&out_dir).unwrap();

    // 构建 proto 代码
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .out_dir(&out_dir)
        .compile_protos(
            &[src_dir.join("index.proto"), src_dir.join("services.proto")],
            &[src_dir.clone()],
        )
        .unwrap();

    let mut files: Vec<String> = fs::read_dir(&out_dir)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".rs") && name != "mod.rs")
        .collect();
    files.sort();

    // 构建 mod.rs 出口
    let mut mod_code = files
        .iter()
        .map(|name| {
            let import_code =
                format!("pub mod {};", name.trim_end_matches(".rs"));
            if name.ends_with("_services.rs") {
                format!("#[cfg(feature = \"server\")]\n{}", import_code)
            } else {
                import_code
            }
        })
        .collect::<Vec<String>>()
        .join("\n");
    mod_code.push_str(
        "\npub const INDEX_PROTO: &[u8] = include_bytes!(\"../index.proto\");",
    );
    fs::write(out_dir.join("mod.rs"), mod_code).unwrap();

    format_generated(&out_dir, &files);
    println!("generated proto code in {}", out_dir.display());
}

/// 生成代码同样需要满足 `cargo fmt --check`，这里尽力格式化。
fn format_generated(out_dir: &Path, files: &[String]) {
    let mut targets: Vec<PathBuf> =
        files.iter().map(|name| out_dir.join(name)).collect();
    targets.push(out_dir.join("mod.rs"));

    let status = Command::new("rustfmt")
        .arg("--edition")
        .arg("2024")
        .args(&targets)
        .status();
    match status {
        Ok(status) if status.success() => {}
        _ => println!(
            "warning: rustfmt 不可用或执行失败，请手动运行 `cargo fmt -p cn-font-proto`"
        ),
    }
}
