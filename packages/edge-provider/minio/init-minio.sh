#!/bin/sh
set -e

# 等待 MinIO 启动
until curl -f http://minio:9000/minio/health/live; do
  echo "Waiting for MinIO to start..."
  sleep 1
done

# 使用 mc 命令行工具创建存储桶
mc alias set local http://minio:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

mc mb --ignore-existing local/origin-font 

mc mb --ignore-existing local/result-font

# 设置 minio 容器的访问权限，你也可以不设置为 public，设置为 private，并在应用中进行管理
mc anonymous set public local/result-font

