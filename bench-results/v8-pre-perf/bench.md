# Benchmark: v8-pre-perf

- commit: `ea9255e`
- platform: `macos-aarch64`
- timestamp: `2026-11-25T17:33:27.141360+08:00`

| font | case | median ms | min ms | max ms | woff2 bytes | subsets | subset min/median/max |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| packages/demo/public/NotoSerifSC-Regular.ttf | default | 237.9 | 229.9 | 286.3 | 8703824 | 223 | 1440/41900/87080 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-48k | 235.9 | 230.0 | 256.3 | 8831632 | 301 | 788/31224/72200 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-120k | 232.7 | 226.6 | 239.4 | 8522040 | 149 | 2824/61344/122540 |
| packages/demo/public/SmileySans-Oblique.ttf | default | 32.3 | 31.6 | 35.6 | 1343376 | 46 | 848/32388/62156 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-48k | 33.3 | 32.9 | 38.5 | 1363272 | 62 | 872/25668/47192 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-120k | 35.8 | 33.0 | 38.7 | 1314548 | 34 | 872/37352/91192 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | default | 57.3 | 55.7 | 60.9 | 1655948 | 59 | 876/29416/60664 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-48k | 56.3 | 55.5 | 64.1 | 1677684 | 79 | 876/21704/46428 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-120k | 54.8 | 53.6 | 55.2 | 1627532 | 42 | 876/41460/88788 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | default | 13.2 | 13.1 | 13.4 | 211524 | 9 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-48k | 13.1 | 13.0 | 13.2 | 208000 | 8 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-120k | 13.1 | 13.1 | 13.1 | 208000 | 8 | 1780/4544/157996 |
