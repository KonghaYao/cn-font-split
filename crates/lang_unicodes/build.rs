use cn_font_utils::output_file;
#[cfg(feature = "with_extra")]
use lazy_static::lazy_static;
#[cfg(feature = "with_extra")]
use opencc_rs::{Config, OpenCC};
use std::fs;
use std::fs::{create_dir, exists, read_to_string};

#[cfg(feature = "with_extra")]
const CN_SYMBOL: &str = "⸺、。〈〉《》「」『』【】〔〕〖〗︐︑︒︓︔︕︖︐︑︒︓︔︕︖︗︘︙︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄";

const CN_CHAR_RANK_FILE: &str = "./data/cn_char_rank.dat";
const HANGUL_SYL_FILE: &str = "./data/hangul-syl.dat";

#[cfg(feature = "with_extra")]
fn encode_utf16(s: &char) -> u16 {
    let mut buf = [0; 1];
    *s.encode_utf16(&mut buf).iter().next().unwrap()
}

#[cfg(feature = "with_extra")]
lazy_static! {
    static ref OPENCC: OpenCC = OpenCC::new([Config::S2T]).unwrap();
}

#[cfg(feature = "with_extra")]
fn opencc_convert(s: String) -> String {
    OPENCC.convert(s).unwrap()
}

/*
@author modified by konghayao
@link  https://github.com/sxei/pinyinjs/blob/master/other/%E5%B8%B8%E7%94%A86763%E4%B8%AA%E6%B1%89%E5%AD%97%E4%BD%BF%E7%94%A8%E9%A2%91%E7%8E%87%E8%A1%A8.txt,modify by konghayao

常用6763个汉字使用频率表


原文地址：http://blog.sina.com.cn/s/blog_5e2ffb490100dnfg.html


汉字频度表统计资料来源于清华大学，现公布如下，仅供参考。
     使用字数   6763   字（国标字符集），范文合计总字数   86405823 个。
     说明如下：

     假若认识  500 字，则覆盖面为  78.53 % 。其余类推，

列表如下：
字数          覆盖面（  % ）
  500        78.53202
 1000        91.91527
 1500        96.47563
 2000        98.38765
 2500        99.24388
 3000        99.63322
 3500        99.82015
 4000        99.91645
 4500        99.96471
 5000        99.98633
 5500        99.99553
 6000        99.99901
 6479       100.00000
 6500       100.00000
 6763       100.00000

*/

#[cfg(feature = "with_extra")]
fn process_chinese_chars() {
    use std::collections::HashSet;

    use cn_font_utils::{read_binary_file, u8_array_to_u16_array};
    let _ = build_sc_rank();
    let data = read_binary_file("./data/sc.bin").unwrap();
    let symbol: Vec<char> = CN_SYMBOL.chars().clone().collect();
    let sc = u8_array_to_u16_array(&data);
    let tc: Vec<u16> = sc
        .iter()
        .map(|x| char::from_u32(x.clone() as u32).unwrap())
        .map(|i| opencc_convert(i.to_string()).chars().next().unwrap())
        // 不能大于 665545
        .filter(|x| return x.len_utf16() < 2)
        .map(|i| encode_utf16(&i))
        .collect();
    let symbol: Vec<u16> = symbol.iter().map(encode_utf16).collect();

    let hashset_sc: HashSet<&u16> = HashSet::from_iter(sc.iter());

    let tc_set: Vec<u16> =
        tc.iter().filter(|i| !hashset_sc.contains(i)).copied().collect();

    println!(
        "common: {}\tsc_set: {}\ttc_set: {}\t使用 uint16存储",
        symbol.len(),
        sc.len(),
        tc_set.len()
    );
    let data: Vec<u16> = symbol
        .iter()
        .chain([0].iter())
        .chain(sc.iter())
        .chain([0].iter())
        .chain(tc_set.iter())
        .copied()
        .collect();
    fs::write(
        CN_CHAR_RANK_FILE,
        data.iter().flat_map(|&x| x.to_le_bytes()).collect::<Vec<u8>>(),
    )
    .unwrap();
}

fn build_sc_rank() -> Result<(), Box<dyn std::error::Error>> {
    let css = read_to_string("./scripts/noto-sans-sc.css").unwrap();
    let data = get_subsets_from_css(&css);

    let flatten_data: Vec<Vec<u32>> = data
        .into_iter()
        .map(|i| i.into_iter().flat_map(flatten_subset).collect())
        .collect();

    let final_data: Vec<u32> = flatten_data
        .into_iter()
        .map(|i| {
            i.into_iter()
                .filter(|&ii| ii >= 0x4e00 && ii <= 0x9fff)
                .collect::<Vec<u32>>()
        })
        .rev()
        .flatten()
        .take(7000)
        .collect();

    if final_data.iter().any(|&i| i > 65535) {
        eprintln!("注入危险");
    }

    let buffer: Vec<u16> = final_data.iter().map(|&i| i as u16).collect();
    output_file("./data/sc.bin", &u16_vec_to_u8_vec(buffer));

    println!(
        "{}",
        final_data
            .iter()
            .map(|&i| char::from_u32(i).unwrap())
            .collect::<String>()
    );
    Ok(())
}
fn u16_vec_to_u8_vec(vec: Vec<u16>) -> Vec<u8> {
    vec.into_iter()
        .flat_map(|n| {
            // 将每个u16转换为两个u8，此处使用小端序
            vec![(n & 0xFF) as u8, (n >> 8) as u8]
        })
        .collect()
}
fn flatten_subset(subset: Vec<u32>) -> Vec<u32> {
    if subset.len() == 2 {
        (subset[0]..=subset[1]).collect()
    } else {
        subset
    }
}

fn get_subsets_from_css(css: &str) -> Vec<Vec<Vec<u32>>> {
    let list = regex::Regex::new(r"@font-face[\s\S]+?\}")
        .unwrap()
        .find_iter(css)
        .map(|m| m.as_str())
        .collect::<Vec<&str>>();

    list.iter()
        .filter_map(|face| {
            let unicode_list =
                regex::Regex::new(r"unicode-range:[\s\S]*(?:[,;])")
                    .unwrap()
                    .captures(face)
                    .and_then(|cap| cap.get(0));

            unicode_list.map(|range| {
                range
                    .as_str()
                    .split(|c| c == ',' || c == ';')
                    .filter_map(|i| {
                        let i = i.trim().replace("U+", "");
                        if i.contains('-') {
                            Some(
                                i.split('-')
                                    .filter_map(|i| {
                                        u32::from_str_radix(i, 16).ok()
                                    })
                                    .collect(),
                            )
                        } else {
                            u32::from_str_radix(&i, 16).ok().map(|n| vec![n])
                        }
                    })
                    .collect()
            })
        })
        .collect()
}

// 处理韩文字符频率分布
// 来源 http://nlp.kookmin.ac.kr/data/syl-2.txt
#[cfg(feature = "with_extra")]
fn process_korean_syllables() {
    let data = read_to_string("./scripts/syl-2.txt").unwrap();
    let binding =
        data.split("=====================================").collect::<Vec<_>>();
    let content = binding.get(1).unwrap();
    let chars: Vec<char> = content
        .split("\n")
        .map(|i| {
            i.split(" ")
                .map(|i| i.to_string())
                .collect::<Vec<String>>()
                .first()
                .cloned()
                .unwrap()
        })
        .filter(|i| !i.is_empty())
        .map(|i| i.chars().next().unwrap())
        .collect();
    fs::write(
        HANGUL_SYL_FILE,
        chars
            .iter()
            .map(encode_utf16)
            .flat_map(|x| x.to_le_bytes())
            .collect::<Vec<u8>>(),
    )
    .unwrap()
}

#[cfg(feature = "with_extra")]
fn main() {
    println!("cargo::rerun-if-changed=scripts/noto-sans-sc.css");
    println!("cargo::rerun-if-changed=scripts/syl-2.txt");
    println!("cargo::rerun-if-changed={}", CN_CHAR_RANK_FILE);
    println!("cargo::rerun-if-changed={}", HANGUL_SYL_FILE);

    if !exists("./data").unwrap() {
        create_dir("./data").unwrap();
    }

    process_chinese_chars();
    process_korean_syllables();
}

#[cfg(not(feature = "with_extra"))]
fn main() {
    if exists(CN_CHAR_RANK_FILE).unwrap_or(false)
        && exists(HANGUL_SYL_FILE).unwrap_or(false)
    {
        println!(
            "feature with_extra is set, data process will be skipped...exit"
        );
    } else {
        panic!("feature with_extra is set but data file not found");
    }
}
