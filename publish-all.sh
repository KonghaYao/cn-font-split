#!/bin/bash
# 更新 crates 文件夹下面的所有目录，保证依赖最新
for dir in crates/*; do
  if [ -f "$dir/Cargo.toml" ]; then
    echo "Publishing package in $dir"
    (cd "$dir" && cargo publish --registry crates-io --allow-dirty)
  fi
done