# npm i -g protoc-gen-ts
OUT_DIR="./src/gen"
if [ ! -d "./src/gen" ]; then
  mkdir ./src/gen
fi
protoc \
    --ts_out="${OUT_DIR}" \
    --proto_path="../../crates/proto/src/" \
    index.proto
protoc \
    --ts_out="${OUT_DIR}" \
    --proto_path="../../crates/proto/src/" \
    services.proto