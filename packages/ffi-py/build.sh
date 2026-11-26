#!/bin/sh
# Python 侧 protobuf 代码生成脚本。
#
# 前置条件：
#   - protoc 可用（`protoc --version`）；
#   - 依赖仓库内的 proto 定义 ../../crates/proto/src/{index,services}.proto；
#   - 生成结果写入 cn_font_split/gen/（已 gitignore，随 sdist/wheel 打包）。
#
# 注意：cn_font_split/cli.py 的 `i` 子命令会调用 gen/init.sh / gen/init.ps1，
# 但这两个下载脚本在本仓库已不存在（8.0 的二进制改为随平台包分发）。
# 因此这里不再从 `../ffi/scripts` 复制（该目录不存在，旧写法必然失败），
# `i` 子命令在缺少 init 脚本时会由 cli.py 捕获异常后报错，不影响 font_split()。
set -eu

OUT_DIR="./cn_font_split/gen"
mkdir -p "${OUT_DIR}"

protoc \
  --python_out="${OUT_DIR}" \
  --proto_path="../../crates/proto/src/" \
  index.proto
protoc \
  --python_out="${OUT_DIR}" \
  --proto_path="../../crates/proto/src/" \
  services.proto

echo "from . import *" >"${OUT_DIR}/__init__.py"

echo "generated $(ls -1 "${OUT_DIR}" | tr '\n' ' ')"
