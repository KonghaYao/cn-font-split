#!/bin/sh
# 生成 packages/ffi-js/src/gen/index_pb.ts（protoc + @bufbuild/protoc-gen-es）
#
# 版本要求（可复现）：
#   - protoc >= 3.20（本仓库用 protoc 36.x 验证；需要支持 --es_out 插件协议）
#   - @bufbuild/protoc-gen-es 2.17.0（devDependency）
#   - @bufbuild/protobuf 2.17.0（运行时）
#   生成器与运行时必须同版本，否则下面的版本校验直接失败。
#
# 说明：
#   - proto 源保持不动，脚本只读取 crates/proto/src/index.proto。
#   - services.proto 仅供 Rust/gRPC 侧使用，JS 既未导出也未参与打包，
#     因此不再生成（旧版 src/gen/services.ts 已删除）。
#   - 可用 PROTOC=/path/to/protoc 覆盖 protoc 路径。
set -eu

PROTO_DIR="../../crates/proto/src"
OUT_DIR="./src/gen"
PLUGIN="./node_modules/.bin/protoc-gen-es"
PROTOC="${PROTOC:-protoc}"

if ! command -v "$PROTOC" >/dev/null 2>&1; then
    echo "找不到 protoc（需要 >= 3.20）。可用 PROTOC=/path/to/protoc 指定。" >&2
    exit 1
fi

if [ ! -x "$PLUGIN" ]; then
    echo "缺少 $PLUGIN，请先执行 pnpm install（需要 @bufbuild/protoc-gen-es 2.17.0）。" >&2
    exit 1
fi

RUNTIME_VERSION="$(node -p "require('./node_modules/@bufbuild/protobuf/package.json').version")"
PLUGIN_VERSION="$(node -p "require('./node_modules/@bufbuild/protoc-gen-es/package.json').version")"
if [ "$RUNTIME_VERSION" != "$PLUGIN_VERSION" ]; then
    echo "@bufbuild/protobuf($RUNTIME_VERSION) 与 @bufbuild/protoc-gen-es($PLUGIN_VERSION) 版本不一致。" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

"$PROTOC" \
    --plugin="protoc-gen-es=$PLUGIN" \
    --es_out="$OUT_DIR" \
    --es_opt=target=ts \
    --proto_path="$PROTO_DIR" \
    index.proto
