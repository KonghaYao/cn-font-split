# 开发 BUG 自助

## 安装 protoc 命令

```sh
apt update -y
apt install -y protobuf-compiler && protoc --version
```

## 安装 Wasm-sdk 

安装并自动配置，执行文件在 packages/wasm-edge/scripts/wasi-install.sh，需要在容器中执行

## 修复 vscode 不识别 tonic 的 proto 问题

```json
{
    "rust-analyzer.cargo.buildScripts.enable": true,
}
```