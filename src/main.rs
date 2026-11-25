use clap::Parser;
use cn_font_proto::api_interface::{EventName, InputTemplate};
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
    /// 子集
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
    /// 压缩
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

fn run(args: Args) -> std::result::Result<(), String> {
    let out_dir = args.out_dir.clone();
    let input = std::fs::read(&args.input).map_err(|e| {
        format!("读取输入字体 {} 失败: {e}", args.input.display())
    })?;

    let config = InputTemplate {
        input,
        css: if let Some(css) = args.css {
            Some(cn_font_proto::api_interface::input_template::CssProperties {
                font_display: css.font_display,
                file_name: css.file_name,
                font_style: css.font_style,
                font_family: css.font_family,
                font_weight: css.font_weight,
                ..Default::default()
            })
        } else {
            None
        },
        language_areas: args.language_areas,
        chunk_size: args.chunk_size,
        chunk_size_tolerance: args.chunk_size_tolerance,
        max_allow_subsets_count: args.max_allow_subsets_count,
        test_html: args.test_html,
        reporter: args.reporter,
        rename_output_font: args.rename_output_font,
        build_mode: args.build_mode,
        multi_threads: args.multi_threads,
        font_feature: args.font_feature,
        reduce_mins: args.reduce_mins,
        auto_subset: args.auto_subset,
        subset_remain_chars: args.subset_remain_chars,
        ..Default::default()
    };
    let write_failed = AtomicBool::new(false);
    font_split(config, |x| {
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
