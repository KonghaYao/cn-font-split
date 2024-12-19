## Usage

1. 先在 subsets 文件夹 build `pnpm prepublish`

2. 安装依赖

```sh
pnpm install
pnpm playwright install
```

```sh
node ./script/downloadFonts.mjs # 先下载字体包，然后才能够本地测试, 失败可以多次执行
node ./script/build.mjs # 使用 cn-font-split 进行切割
bun ./script/build_rust.ts # rust 版本需要使用 bun 进行切割，需要提前开启 grpc 项目
node ./script/gen_hb_wasm.mjs # 【optional】使用 wasm 直接进行切割，对照实验作用
node ./script/gen_hb.mjs # 【optional】使用 hb-subset 直接进行切割，对照实验作用
pnpm dev # 开启服务， 测试之前要开启 Vite 打包服务
pnpm test # 直接进行测试
```

可以使用 VSCode Playwright 插件进行测试，比较简单。
因为很多 feature 浏览器支持就很差，有些 chromium 行， webkit 又不行。测试一般使用 webkit，部分采用 chromium。

3. 回归测试

```sh
pnpm dev # 开启服务
node ./script/build.mjs # 使用 cn-font-split 进行切割
```
