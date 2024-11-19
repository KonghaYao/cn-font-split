fn main() {
    // protoc 3.12.4
    prost_build::Config::new()
        .out_dir("src/pb/") //设置proto输出目录
        .protoc_arg("--experimental_allow_proto3_optional")
        .compile_protos(&["src/pb/index.proto"], &["."]) //我们要处理的proto文件
        .unwrap();
}
