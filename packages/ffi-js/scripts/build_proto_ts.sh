# npm i -g protoc-gen-ts
OUT_DIR="./gen"
if [ ! -d "./gen" ]; then
  mkdir ./gen
fi
protoc \
    --ts_out="${OUT_DIR}" \
    --proto_path="../../crates/proto/src/" \
    index.proto
protoc \
    --ts_out="${OUT_DIR}" \
    --proto_path="../../crates/proto/src/" \
    services.proto