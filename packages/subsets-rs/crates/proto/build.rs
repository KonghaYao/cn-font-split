fn main() {
    let out_dir = std::path::PathBuf::from("./src/lib");
    let _ = std::fs::create_dir_all("./src/lib");
    // std::env::set_var("OUT_DIR", &out_dir);
    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .out_dir(out_dir)
        .compile_protos(
            &["./src/index.proto", "./src/services.proto"],
            &["./src"],
        )
        .unwrap();
    let files = std::fs::read_dir("./src/lib").unwrap();

    let mod_code = files
        .into_iter()
        .filter(|x| x.as_ref().unwrap().file_name() != "mod.rs")
        .map(|x| {
            let file_name = x.unwrap().file_name();
            let name = file_name.to_str().unwrap();
            let import_code =
                format!("pub mod {};", name.replace(".rs", "")).clone();
            if name.ends_with("_services.rs") {
                return format!(
                    "#[cfg(feature = \"server\")]\n{}",
                    import_code
                );
            }
            import_code
        })
        .collect::<Vec<String>>()
        .join("\n");
    let _ = std::fs::write("src/lib/mod.rs", mod_code);
}
