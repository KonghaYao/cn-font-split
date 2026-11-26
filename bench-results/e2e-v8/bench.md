# End-to-end benchmark: v8

- commit: `c2ca413`
- node: `v24.21.0`
- platform: `darwin-arm64`
- font: `packages/demo/public/NotoSerifSC-Regular.ttf`
- config: `fontFeature=false, reporter=false, testHtml=true`
- rounds: 5 measured + 1 warmup（中位数）
- ffi: `target/release/libffi.dylib`
- timestamp: `2026-11-26T02:10:33.646Z`

计时拆分：`compute` = 调用开始 → 最后一个 outputFile 回调；`write` = 最后一个回调 → fontSplit 结算（等待落盘排空）；`total` = 两者之和。写盘未 fsync。

| case | mode | compute ms | write ms | total ms | total min/max | files | bytes |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| default | memory | 491.9 | 0.2 | 492.1 | 482.0/497.9 | 213 | 8801396 |
| default | disk | 503.7 | 9.0 | 512.6 | 493.7/529.4 | 213 | 8801396 |
| chunk-48k | memory | 504.0 | 0.2 | 504.2 | 497.1/508.1 | 284 | 8958309 |
| chunk-48k | disk | 503.6 | 11.7 | 518.6 | 510.6/528.3 | 284 | 8958309 |

| case | memory total ms | disk total ms | 配对写盘开销 ms | 配对开销 % | 产物一致 |
| --- | ---: | ---: | ---: | ---: | --- |
| default | 492.1 | 512.6 | 20.2 | 4.0% | yes |
| chunk-48k | 504.2 | 518.6 | 16.6 | 3.3% | yes |

说明：内存 sink 为空实现（仅统计产物），写盘模式的 files/bytes 来自磁盘实际落盘结果；两者按文件名与字节数逐项一致才会通过校验（CSS header 含时间戳，只比大小不比内容）。

配置固定 `fontFeature=false`、`reporter=false`：产品默认下 `analyze_cmap` 的 HashMap 反查会让少量字符跨调用换包，`reporter.bin` 又内嵌每包耗时，都会破坏「两模式字节数一致」的可复跑校验。
