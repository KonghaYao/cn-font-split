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
