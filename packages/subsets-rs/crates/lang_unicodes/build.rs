use std::env;
use std::process::Command;

fn main() {
    // 检查 npm 是否存在
    if Command::new("npm").arg("--version").status().is_err() {
        panic!("npm is not installed or not in PATH");
    }

    // 执行 npm run build 并捕获输出
    let output = Command::new("npm")
        .arg("run")
        .arg("build")
        .current_dir(
            env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string()),
        )
        .output()
        .expect("Failed to execute 'npm run build'");

    // 打印命令的输出和错误
    println!("status: {}", output.status);
    println!("stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("stderr: {}", String::from_utf8_lossy(&output.stderr));

    // 检查命令是否成功完成
    if !output.status.success() {
        panic!("'npm run build' failed with status: {}", output.status);
    }
}
