# cn-font-split Python Version Beta

```sh
# 国内请设置环境变量, windows 用 set
export CN_FONT_SPLIT_GH_HOST=https://ik.imagekit.io/github
# set CN_FONT_SPLIT_GH_HOST=https://ik.imagekit.io/github # windows
cn-font-split-py i default 
cn-font-split-py -i ../demo/public/SmileySans-Oblique.ttf -o dist
```

## 原生库查找

`font_split()` 按顺序决定加载哪个动态库：

1. 环境变量 `CN_FONT_SPLIT_BIN` 指向的绝对路径（优先）；
2. 否则按「平台 + 架构」拼出 `cn_font_split/gen/libffi-<triple>.<ext>`
   （由 `build.sh` 之外的打包流程放入，见 `cn_font_split/font_split.py` 的
   `match_platform`）。

目前已发布的 Linux 平台包只有 **glibc**（`linux-x64-gnu` / `linux-arm64-gnu`），
没有 musl 产物。musl 环境（Alpine 等）与 arm/android 一样会退回
`wasm32-wasip1`；这类环境下请显式设置 `CN_FONT_SPLIT_BIN`，指向自己
`cargo build --release -p ffi` 出来的 `libffi.so`，否则会因找不到文件而报错。

`is_musl()` 现在会真实探测（`platform.libc_ver()`，读不到时退化为
`ldd --version` 的版本串），不再恒返回 `False`。

## CLI 的 `i` 子命令

`cn-font-split-py i <platform@version>` 会转调 `cn_font_split/gen/init.sh`
（Windows 为 `init.ps1`）。这两个脚本在本仓库已不存在（8.0 的二进制改由
平台包分发），`build.sh` 也不会再生成它们；该子命令在当前版本属于 best-effort，
失败时由 `cli.py` 捕获并打印错误。

## Dev

```sh
sh build.sh        # protoc 生成 cn_font_split/gen/*_pb2.py（需 protoc）
pip3 install -e .
```

`sh build.sh` 依赖 `../../crates/proto/src/` 下的 `index.proto` 与
`services.proto`，本机 protoc 36.2 已验证可用。生成代码会写入 protobuf 运行时
版本断言（protoc 36.x ⇒ protobuf 7.x），因此 `setup.py` 里的 `protobuf` pin
必须与生成时使用的 protoc 匹配：用更老的 protoc 重新生成后需同步下调 pin。
