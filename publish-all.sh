#!/bin/bash
# 8.0：同步发布 crates/ 下所有 crate。
# 默认只执行 `cargo publish --dry-run`；确认真实发布时显式传入 --publish。
set -euo pipefail

PUBLISH=false
for arg in "$@"; do
  case "$arg" in
    --publish)
      PUBLISH=true
      ;;
    -h|--help)
      echo "用法: ./publish-all.sh [--publish]"
      echo "  默认: cargo publish --dry-run（不发布）"
      echo "  --publish: 真实发布到 crates.io"
      exit 0
      ;;
    *)
      echo "未知参数: $arg（可用: --publish）" >&2
      exit 2
      ;;
  esac
done

for dir in crates/*; do
  if [ -f "$dir/Cargo.toml" ]; then
    if [ "$PUBLISH" = true ]; then
      echo "Publishing package in $dir (real)"
      (cd "$dir" && cargo publish --registry crates-io --allow-dirty)
    else
      echo "Dry-run package in $dir"
      (cd "$dir" && cargo publish --dry-run --registry crates-io --allow-dirty)
    fi
  fi
done
