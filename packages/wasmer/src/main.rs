use std::path::{Path, PathBuf};

use clap::Parser;
mod proto;
use cn_font_proto::api_interface::{
    self,
    input_template::{CssProperties, PreviewImage},
    InputTemplate,
};
use cn_font_utils::{output_file, read_binary_file};

impl From<proto::InputTemplate> for api_interface::InputTemplate {
    fn from(args: proto::InputTemplate) -> Self {
        let input = args.input.to_str().unwrap();

        let preview_image = if args.preview_image_name.is_some()
            && args.preview_image_text.is_some()
        {
            Some(PreviewImage {
                text: args.preview_image_text.unwrap(),
                name: args.preview_image_name.unwrap(),
            })
        } else {
            None
        };
        let subsets: Vec<Vec<u8>> = args
            .subsets
            .iter()
            .map(|x| read_binary_file(x.to_str().unwrap()).unwrap())
            .collect();
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
        api_interface::InputTemplate {
            input: read_binary_file(input).unwrap(),
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
        }
    }
}

fn main() {
    let args = proto::InputTemplate::parse();
    let config = InputTemplate::from(args);
    let out_dir = config.out_dir.clone().unwrap();
    cn_font_split::font_split(config, |m| {
        // println!("{}  {}", m.event, m.message.unwrap_or("".to_owned()));
        // 打开一个文件以供写入，如果文件不存在，则创建它
        match m.data {
            Some(data) => {
                let path = resolve_path(&out_dir, &m.message);
                output_file(&path.to_str().unwrap(), &data)
                    .expect("write file error");
            }
            _ => (),
        }
    });
}
fn resolve_path(out_dir: &str, relative_path: &str) -> PathBuf {
    let out_path = Path::new(out_dir);
    let resolved_path = out_path.join(relative_path);
    resolved_path
}
