cargo build --target wasm32-wasip1 --release

wasm-opt -Oz --output ../../target/wasm32-wasip1/release/wasm_edge.Oz.wasm ../../target/wasm32-wasip1/release/wasm_edge.wasm