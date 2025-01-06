# python 依赖生成脚本
OUT_DIR="./cn_font_split/gen"
if [ ! -d "./cn_font_split/gen" ]; then
  mkdir ./cn_font_split/gen
fi
protoc \
  --python_out="${OUT_DIR}" \
  --proto_path="../../crates/proto/src/" \
  index.proto
protoc \
  --python_out="${OUT_DIR}" \
  --proto_path="../../crates/proto/src/" \
  services.proto

echo "from . import *" >"${OUT_DIR}/__init__.py"

# 脚本放置到 gen 文件夹中
cp ../ffi/scripts/* ./cn_font_split/gen
