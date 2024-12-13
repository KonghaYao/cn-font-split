# 开发 BUG 自助

## 安装 protoc 命令

```sh
apt update -y
apt install -y protobuf-compiler && protoc --version
```

## 安装 Wasm-sdk

安装并自动配置，执行文件在 .devcontainer/wasi-install.sh，需要在容器中执行

## 修复 vscode 不识别 tonic 的 proto 问题

```json
{
    "rust-analyzer.cargo.buildScripts.enable": true
}
```

## 构建失败

1. 只有 Ubuntu 24 是稳定的构建服务器，其他均未测试过，所以会有很多问题，请更换为官方镜像
2. 我们有标准的 github action 能够通过构建，你可以参考相关的配置，检查是否少了什么
