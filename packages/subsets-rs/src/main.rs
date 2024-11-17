mod run_subset;
mod pre_subset;

use opentype::File;
use crate::run_subset::run_subset;

fn main() {
    let path = "../demo/public/SmileySans-Oblique.ttf";
    let mut font_file =
        std::fs::File::open(path).expect("Failed to open file");
    let File { mut fonts } = File::read(&mut font_file).expect("Failed to read file");
    // make_gpos(&fonts[0],&mut font_file);
    let set = pre_subset::analyze_gsub(&fonts[0], &mut font_file);
    run_subset(&path, &set)
}


