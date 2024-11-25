fn main() {
    let out_dir = std::path::PathBuf::from("src/pb");
    // std::env::set_var("OUT_DIR", &out_dir);
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .out_dir(out_dir)
        .compile_protos(&["src/pb/index.proto"], &["src/pb"])
        .unwrap();
}
