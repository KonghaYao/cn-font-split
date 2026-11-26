// `main` / `_start` 是 wasm 导出符号，而 lib test 会自己生成一个 `main`
// 入口，两者在链接期冲突（entry symbol `main` declared multiple times）。
// 因此整个 WASI 运行时部分只在非 test 构建中存在：test 构建里它既无导出
// 也无调用方，保留反而只剩死代码。
#[cfg(not(test))]
use cn_font_proto::api_interface::{EventName, InputTemplate};
#[cfg(not(test))]
use cn_font_split::font_split;
#[cfg(not(test))]
use cn_font_utils::read_binary_file;
#[cfg(not(test))]
use prost::Message;

/// WASI 命令入口。
///
/// 失败只写 stderr 并返回：wasm 里 panic 是不可恢复的 trap，错误返回至少
/// 能让宿主看到原因。`no_mangle` 的签名保持不变（仍是 `fn()`）。
#[cfg(not(test))]
#[unsafe(no_mangle)]
pub fn main() {
    env_logger::init();
    if let Err(error) = run() {
        eprintln!("wasm-edge: {error}");
    }
}

#[cfg(not(test))]
fn run() -> Result<(), String> {
    let name = std::env::args().next().ok_or("缺少 argv[0]")?;
    let input_name = format!("/tmp/fonts/{name}");
    let input = read_binary_file(&input_name)
        .map_err(|e| format!("读取 {input_name} 失败: {e}"))?;
    let config = InputTemplate::decode(&input[..])
        .map_err(|e| format!("解码 InputTemplate 失败: {e}"))?;
    font_split(config, |x| {
        if EventName::try_from(x.event) != Ok(EventName::OutputData) {
            return;
        }
        let Some(data) = x.data else { return };
        let path = format!("/tmp/{name}/{}", x.message);
        if let Err(e) = std::fs::write(&path, data) {
            eprintln!("写入 {path} 失败: {e}");
        }
    })
    .map_err(|e| format!("font_split 失败: {e}"))
}

#[cfg(not(test))]
#[unsafe(no_mangle)]
pub fn _start() {
    main()
}
