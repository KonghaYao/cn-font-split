//! 构建性能基准：在固定字体与固定配置下测量分包耗时与产物体积。
//!
//! 用法（在仓库根目录）：
//! ```sh
//! cargo run --release --example bench -- --label v7-baseline
//! ```
//!
//! 输出：
//! - `bench-results/<label>/bench.json`
//! - `bench-results/<label>/bench.md`
//!
//! 说明：本基准只统计内存中的数据回调，不写磁盘，避免文件系统噪声。
//! 输入字体在计时前读取，`InputTemplate` 的克隆在计时前完成。

use cn_font_proto::api_interface::{EventMessage, EventName, InputTemplate};
use cn_font_split::font_split;
use std::cell::RefCell;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;

const FONTS: &[&str] = &[
    "packages/demo/public/NotoSerifSC-Regular.ttf",
    "packages/demo/public/SmileySans-Oblique.ttf",
    "packages/demo/public/SmileySans-Oblique.ttf.woff2",
    "packages/demo/public/WorkSans-VariableFont_wght.ttf",
];

struct Case {
    name: &'static str,
    chunk_size: Option<i32>,
}

const CASES: &[Case] = &[
    Case { name: "default", chunk_size: None },
    Case { name: "chunk-48k", chunk_size: Some(48 * 1024) },
    Case { name: "chunk-120k", chunk_size: Some(120 * 1024) },
];

#[derive(Default, Clone)]
struct OutputStat {
    total_bytes: u64,
    woff2_bytes: u64,
    subset_sizes: Vec<u64>,
}

struct CaseResult {
    font: &'static str,
    case: &'static str,
    times_ms: Vec<f64>,
    stat: OutputStat,
}

fn main() {
    let mut label = String::from("local");
    let mut out_dir = PathBuf::from("bench-results");
    let mut rounds: usize = 3;
    let mut filter: Option<String> = None;

    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--label" => {
                i += 1;
                label = args.get(i).cloned().unwrap_or(label);
            }
            "--out" => {
                i += 1;
                out_dir =
                    PathBuf::from(args.get(i).cloned().unwrap_or_default());
            }
            "--rounds" => {
                i += 1;
                rounds =
                    args.get(i).and_then(|x| x.parse().ok()).unwrap_or(rounds);
            }
            "--filter" => {
                i += 1;
                filter = args.get(i).cloned();
            }
            other => {
                eprintln!("忽略未知参数: {other}");
            }
        }
        i += 1;
    }

    if !Path::new(FONTS[0]).exists() {
        eprintln!("找不到测试字体 {}，请在仓库根目录运行", FONTS[0]);
        std::process::exit(2);
    }

    let mut results = Vec::new();
    for font in FONTS {
        if let Some(f) = &filter {
            if !font.contains(f.as_str()) {
                continue;
            }
        }
        let binary = fs::read(font).expect("读取测试字体失败");
        for case in CASES {
            let mut times_ms = Vec::with_capacity(rounds);
            let mut stat = OutputStat::default();
            for round in 0..rounds {
                let config = InputTemplate {
                    input: binary.clone(),
                    chunk_size: case.chunk_size,
                    ..Default::default()
                };
                let collected = RefCell::new(OutputStat::default());
                let start = Instant::now();
                if let Err(err) = font_split(config, |msg: EventMessage| {
                    if msg.event != EventName::OutputData as i32 {
                        return;
                    }
                    let Some(data) = msg.data else { return };
                    let mut slot = collected.borrow_mut();
                    slot.total_bytes += data.len() as u64;
                    if msg.message.ends_with(".woff2") {
                        slot.woff2_bytes += data.len() as u64;
                        slot.subset_sizes.push(data.len() as u64);
                    }
                }) {
                    eprintln!("{} / {} 构建失败: {err}", font, case.name);
                    std::process::exit(1);
                }
                let elapsed = start.elapsed().as_secs_f64() * 1000.0;
                times_ms.push(elapsed);
                if round + 1 == rounds {
                    stat = collected.into_inner();
                }
                eprintln!(
                    "{} / {} round {}/{}: {:.1}ms",
                    font,
                    case.name,
                    round + 1,
                    rounds,
                    elapsed
                );
            }
            results.push(CaseResult { font, case: case.name, times_ms, stat });
        }
    }

    let label_dir = out_dir.join(&label);
    fs::create_dir_all(&label_dir).expect("创建输出目录失败");

    let json = render_json(&label, &results);
    let md = render_markdown(&label, &results);
    fs::write(label_dir.join("bench.json"), &json)
        .expect("写入 bench.json 失败");
    fs::write(label_dir.join("bench.md"), &md).expect("写入 bench.md 失败");

    println!("{md}");
    println!("结果已写入 {}", label_dir.display());
}

fn median(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mut sorted = values.to_vec();
    sorted
        .sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        (sorted[mid - 1] + sorted[mid]) / 2.0
    } else {
        sorted[mid]
    }
}

fn min_f64(values: &[f64]) -> f64 {
    values.iter().cloned().fold(f64::INFINITY, f64::min)
}

fn max_f64(values: &[f64]) -> f64 {
    values.iter().cloned().fold(f64::NEG_INFINITY, f64::max)
}

fn median_u64(values: &[u64]) -> u64 {
    if values.is_empty() {
        return 0;
    }
    let mut sorted = values.to_vec();
    sorted.sort_unstable();
    sorted[sorted.len() / 2]
}

fn min_u64(values: &[u64]) -> u64 {
    values.iter().copied().min().unwrap_or(0)
}

fn max_u64(values: &[u64]) -> u64 {
    values.iter().copied().max().unwrap_or(0)
}

fn git_commit() -> String {
    Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn render_json(label: &str, results: &[CaseResult]) -> String {
    let mut entries = Vec::new();
    for r in results {
        let t = &r.times_ms;
        let sizes = &r.stat.subset_sizes;
        entries.push(format!(
            "    {{\n      \"font\": \"{}\",\n      \"case\": \"{}\",\n      \"rounds\": {},\n      \"time_ms_median\": {:.3},\n      \"time_ms_min\": {:.3},\n      \"time_ms_max\": {:.3},\n      \"total_bytes\": {},\n      \"woff2_bytes\": {},\n      \"subsets\": {},\n      \"subset_bytes_min\": {},\n      \"subset_bytes_median\": {},\n      \"subset_bytes_max\": {}\n    }}",
            r.font,
            r.case,
            t.len(),
            median(t),
            min_f64(t),
            max_f64(t),
            r.stat.total_bytes,
            r.stat.woff2_bytes,
            sizes.len(),
            min_u64(sizes),
            median_u64(sizes),
            max_u64(sizes),
        ));
    }
    format!(
        "{{\n  \"label\": \"{}\",\n  \"commit\": \"{}\",\n  \"os\": \"{}\",\n  \"arch\": \"{}\",\n  \"timestamp\": \"{}\",\n  \"cases\": [\n{}\n  ]\n}}\n",
        label,
        git_commit(),
        std::env::consts::OS,
        std::env::consts::ARCH,
        chrono::Local::now().to_rfc3339(),
        entries.join(",\n")
    )
}

fn render_markdown(label: &str, results: &[CaseResult]) -> String {
    let mut lines = Vec::new();
    lines.push(format!("# Benchmark: {label}"));
    lines.push(String::new());
    lines.push(format!("- commit: `{}`", git_commit()));
    lines.push(format!(
        "- platform: `{}-{}`",
        std::env::consts::OS,
        std::env::consts::ARCH
    ));
    lines.push(format!("- timestamp: `{}`", chrono::Local::now().to_rfc3339()));
    lines.push(String::new());
    lines.push("| font | case | median ms | min ms | max ms | woff2 bytes | subsets | subset min/median/max |".to_string());
    lines.push(
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |".to_string(),
    );
    for r in results {
        let t = &r.times_ms;
        let sizes = &r.stat.subset_sizes;
        lines.push(format!(
            "| {} | {} | {:.1} | {:.1} | {:.1} | {} | {} | {}/{}/{} |",
            r.font,
            r.case,
            median(t),
            min_f64(t),
            max_f64(t),
            r.stat.woff2_bytes,
            sizes.len(),
            min_u64(sizes),
            median_u64(sizes),
            max_u64(sizes)
        ));
    }
    lines.push(String::new());
    lines.join("\n")
}
