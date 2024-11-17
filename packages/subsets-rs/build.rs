fn main() {
    prost_build::Config::new()
        .out_dir("src/pb/") //设置proto输出目录
        .compile_protos(&["src/pb/index.proto"], &["."]) //我们要处理的proto文件
        .unwrap();
}
