use harfbuzz_rs_now::{Face, Font};
use harfbuzz_rs_now::subset::Subset;
use woff::version2::compress;

pub fn run_subset(path: &str, pre_subsets: &Vec<Vec<u32>>) {
    let face = Face::from_file(path, 0).expect("Failed to read face");
    pre_subsets.iter().enumerate().for_each(|(index, subset)| {
        let subset_runner =
            Subset::new();
        subset_runner.clear_drop_table();
        subset_runner.adjust_layout();
        subset_runner.add_chars(subset);
        let new_face = subset_runner.run_subset(&face).face_data();
        let ttf_binary = new_face.get_data();
        let woff2_binary = compress(ttf_binary, String::from(""), 1, true).expect("Failed to compress subset");
        std::fs::write(format!("dist/{}.woff2", index), woff2_binary).expect("Failed to write subset");
    })
}