use clap::Parser;
use cn_font_proto::api_interface::EventName;
use cn_font_split::config::Config;
use cn_font_split::font_split;
use cn_font_utils::output_file;
use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::atomic::{AtomicBool, Ordering};
/// Simple program to greet a person
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
#[clap(name = "cn-font-split")]
struct Args {
    /// 对接此层，需要直接输入 buffer
    #[clap(short, long)]
    input: PathBuf,

    /// 切割后放置文件的文件夹
    #[clap(short, long, default_value = "dist")]
    out_dir: String,

    #[clap(flatten)]
    css: Option<CssProperties>,

    // /// 目标类型
    // #[clap(long)]
    // target_type: Option<String>,
    // 子集
    // #[clap(long, short)]
    // subsets: Option<PathBuf>,
    /// 语言区域
    #[clap(long)]
    language_areas: Option<bool>,

    /// 块大小
    #[clap(long)]
    chunk_size: Option<i32>,

    /// 块大小容差
    #[clap(long)]
    chunk_size_tolerance: Option<f32>,

    /// 最大允许子集数
    #[clap(long)]
    max_allow_subsets_count: Option<i32>,

    /// 测试 HTML
    #[clap(long)]
    test_html: Option<bool>,

    /// 报告文件
    #[clap(long)]
    reporter: Option<bool>,

    #[clap(flatten)]
    preview_image: Option<PreviewImage>,

    /// 重命名输出字体
    #[clap(long)]
    rename_output_font: Option<String>,

    /// 构建模式
    #[clap(long)]
    build_mode: Option<String>,

    /// 多线程
    #[clap(long)]
    multi_threads: Option<bool>,

    /// 字体特性
    #[clap(long)]
    font_feature: Option<bool>,

    /// 减少最小值
    #[clap(long)]
    reduce_mins: Option<bool>,

    /// 自动子集
    #[clap(long)]
    auto_subset: Option<bool>,

    /// 子集保留字符
    #[clap(long)]
    subset_remain_chars: Option<bool>,
}

#[derive(Parser, Debug)]
struct CssProperties {
    /// 字体家族
    #[clap(long)]
    font_family: Option<String>,

    /// 字体粗细
    #[clap(long)]
    font_weight: Option<String>,

    /// 字体样式
    #[clap(long)]
    font_style: Option<String>,

    /// 字体显示
    #[clap(long)]
    font_display: Option<String>,

    // /// 本地字体家族
    // #[clap(long)]
    // local_family: Vec<String>,

    // #[clap(flatten)]
    // comment: Option<CommentProperties>,
    // 压缩
    // #[clap(long)]
    // compress: Option<bool>,
    /// 文件名
    #[clap(long)]
    file_name: Option<String>,
}

#[derive(Parser, Debug)]
struct PreviewImage {
    /// 文本
    #[clap(long)]
    preview_text: Option<String>,

    /// 名称
    #[clap(long)]
    preview_name: Option<String>,
}

fn main() -> ExitCode {
    let args = Args::parse();
    match run(args) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("cn-font-split: {err}");
            ExitCode::FAILURE
        }
    }
}

/// 只在参数显式给出时覆盖默认值；默认值本身只存在于 `Config`。
fn apply<T>(slot: &mut T, value: Option<T>) {
    if let Some(value) = value {
        *slot = value;
    }
}

/// 可选字段：参数给出时整体覆盖。
fn apply_optional<T>(slot: &mut Option<T>, value: Option<T>) {
    if let Some(value) = value {
        *slot = Some(value);
    }
}

fn run(args: Args) -> std::result::Result<(), String> {
    let out_dir = args.out_dir.clone();
    let input = std::fs::read(&args.input).map_err(|e| {
        format!("读取输入字体 {} 失败: {e}", args.input.display())
    })?;

    let mut config = Config { input, ..Config::default() };
    if let Some(css) = args.css {
        apply(&mut config.css.font_display, css.font_display);
        apply(&mut config.css.file_name, css.file_name);
        apply_optional(&mut config.css.font_style, css.font_style);
        apply_optional(&mut config.css.font_family, css.font_family);
        apply_optional(&mut config.css.font_weight, css.font_weight);
    }
    apply(&mut config.language_areas, args.language_areas);
    apply(&mut config.chunk_size, args.chunk_size);
    apply(&mut config.chunk_size_tolerance, args.chunk_size_tolerance);
    apply_optional(
        &mut config.max_allow_subsets_count,
        args.max_allow_subsets_count,
    );
    apply(&mut config.test_html, args.test_html);
    apply(&mut config.reporter, args.reporter);
    apply_optional(&mut config.rename_output_font, args.rename_output_font);
    apply_optional(&mut config.build_mode, args.build_mode);
    apply(&mut config.multi_threads, args.multi_threads);
    apply(&mut config.font_feature, args.font_feature);
    apply(&mut config.reduce_mins, args.reduce_mins);
    apply(&mut config.auto_subset, args.auto_subset);
    apply(&mut config.subset_remain_chars, args.subset_remain_chars);

    let write_failed = AtomicBool::new(false);
    font_split(config.to_template(), |x| {
        let p = std::path::Path::new(&out_dir).join(&x.message);
        match EventName::try_from(x.event).unwrap_or(EventName::Unspecified) {
            EventName::Unspecified => {}
            EventName::OutputData => {
                println!("output {} ", p.display());
                let Some(data) = x.data else { return };
                if let Err(e) = output_file(p.to_string_lossy().as_ref(), &data)
                {
                    eprintln!(
                        "cn-font-split: 写出产物 {} 失败: {e}",
                        p.display()
                    );
                    write_failed.store(true, Ordering::Relaxed);
                }
            }
            EventName::End => {}
            // 核心已把错误文本随 Err 返回，这里不重复打印，避免 stderr 出现两遍。
            EventName::Error => {}
        }
    })
    .map_err(|err| err.to_string())?;

    if write_failed.load(Ordering::Relaxed) {
        return Err("部分产物文件写出失败".to_string());
    }
    Ok(())
}
