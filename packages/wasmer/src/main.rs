use std::cell::RefCell;
use std::error::Error;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use clap::Parser;
mod proto;
use cn_font_proto::api_interface::{
    self, InputTemplate,
    input_template::{CssProperties, PreviewImage},
};
use cn_font_utils::{output_file, read_binary_file};

type Result<T> = std::result::Result<T, Box<dyn Error>>;

impl TryFrom<proto::InputTemplate> for api_interface::InputTemplate {
    type Error = Box<dyn Error>;

    fn try_from(args: proto::InputTemplate) -> Result<Self> {
        let input = args.input.to_str().ok_or_else(|| {
            format!("输入字体路径不是合法的 UTF-8: {}", args.input.display())
        })?;

        let preview_image =
            match (args.preview_image_text, args.preview_image_name) {
                (Some(text), Some(name)) => Some(PreviewImage { text, name }),
                _ => None,
            };
        let subsets: Vec<Vec<u8>> = args
            .subsets
            .iter()
            .map(|subset| {
                let path = subset.to_str().ok_or_else(|| {
                    format!(
                        "subsets 路径不是合法的 UTF-8: {}",
                        subset.display()
                    )
                })?;
                read_binary_file(path).map_err(|e| -> Box<dyn Error> {
                    format!("读取 subsets 文件 {path} 失败: {e}").into()
                })
            })
            .collect::<Result<Vec<_>>>()?;
        let css = CssProperties {
            font_family: args.css_font_family,
            font_weight: args.css_font_weight,
            font_style: args.css_font_style,
            font_display: args.css_font_display,
            local_family: vec![],
            polyfill: vec![],
            comment_base: args.css_comment_base,
            comment_name_table: args.css_comment_name_table,
            comment_unicodes: args.css_comment_unicodes,
            compress: args.css_compress,
            file_name: args.css_file_name,
        };
        Ok(api_interface::InputTemplate {
            input: read_binary_file(input).map_err(|e| -> Box<dyn Error> {
                format!("读取字体文件 {input} 失败: {e}").into()
            })?,
            out_dir: args.out_dir,
            css: Some(css),
            target_type: args.target_type,
            subsets,
            chunk_size: args.chunk_size,
            chunk_size_tolerance: args.chunk_size_tolerance,
            max_allow_subsets_count: args.max_allow_subsets_count,
            test_html: args.test_html,
            reporter: args.reporter,
            preview_image,
            rename_output_font: args.rename_output_font,
            build_mode: args.build_mode,
            language_areas: args.language_areas,
            multi_threads: args.multi_threads,
            font_feature: args.font_feature,
            reduce_mins: args.reduce_mins,
            auto_subset: args.auto_subset,
            subset_remain_chars: args.subset_remain_chars,
        })
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("cli: {err}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<()> {
    let args = proto::InputTemplate::parse();
    let config = InputTemplate::try_from(args)?;
    let out_dir =
        config.out_dir.clone().ok_or("缺少输出目录: -o / --outDir")?;

    // `font_split` 的回调是 `Fn`，写文件失败没法就地返回，只能把首个错误
    // 存进内部可变状态，等核心流程结束后再统一上报。
    let write_error: RefCell<Option<String>> = RefCell::new(None);
    let result = cn_font_split::font_split(config, |m| {
        // println!("{}  {}", m.event, m.message.unwrap_or("".to_owned()));
        // 打开一个文件以供写入，如果文件不存在，则创建它
        let Some(data) = m.data else { return };
        if write_error.borrow().is_some() {
            return;
        }
        let path = resolve_path(&out_dir, &m.message);
        let Some(path_str) = path.to_str() else {
            *write_error.borrow_mut() =
                Some(format!("输出路径不是合法的 UTF-8: {}", path.display()));
            return;
        };
        if let Err(e) = output_file(path_str, &data) {
            *write_error.borrow_mut() =
                Some(format!("写入 {} 失败: {e}", path.display()));
        }
    });

    if let Some(err) = write_error.into_inner() {
        return Err(err.into());
    }
    result?;
    Ok(())
}

fn resolve_path(out_dir: &str, relative_path: &str) -> PathBuf {
    let out_path = Path::new(out_dir);

    out_path.join(relative_path)
}
