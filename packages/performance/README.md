# 字体分包性能测试

`packages/performance` 是**私有实验包**（`private: true`），不参与根构建、不发布，
用于观察不同 `chunkSize` 下的分包数量与体积。目录内有两个入口：

## 1. Vite 应用（页面对比）

`index.html` → `src/index.ts` → `src/App.tsx`（Solid），`vite.config.ts` 的
`publicDir` 指向 `../subsets/temp`：

```sh
pnpm exec vite packages/performance        # dev server
pnpm exec vite build packages/performance  # 静态产物
```

`vite` 与 `vite-plugin-solid` 来自根 `devDependencies`。`publicDir` 指向的
`packages/subsets/temp` 由旧流程生成，仓库内并不存在，需要自备预分包产物。

## 2. `src/sweet_point.ts` 脚本（采样曲线）

直接调用 `cn-font-split/dist/bun`，按 10–100KB、步长 5KB 采样 `chunkSize`，
读取 `sample/*.txt` 与 `../demo/public/NotoSerifSC-Regular.ttf`，把结果写到
`./build/<size>/`，最后在控制台打印「预设大小 / 均包 / 包数 / 总大小」表：

```sh
cd packages/performance && bun ./src/sweet_point.ts
```

脚本末尾是 `main(true)`，每次运行都会真实执行分包。

## 测试

```sh
pnpm -C packages/performance test   # node --experimental-strip-types --test "test/*.test.mjs"
```

只覆盖 `src/cmap.ts` 的 `buildCMapForCssFromReporter`。同目录的 `test/index.mjs`、
`test/calc.mjs` 是 7.x 旧 API（`destFold` / `FontPath` / `getSubsetsFromCSS`）的遗留
脚本，8.0 下不可直接运行。
