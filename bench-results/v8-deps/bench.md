# Benchmark: v8-deps

- commit: `99e4cc9`
- platform: `macos-aarch64`
- timestamp: `2026-11-25T17:17:23.530603+08:00`

| font | case | median ms | min ms | max ms | woff2 bytes | subsets | subset min/median/max |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| packages/demo/public/NotoSerifSC-Regular.ttf | default | 240.4 | 239.2 | 274.3 | 8703836 | 223 | 1440/41900/87080 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-48k | 249.9 | 242.8 | 256.2 | 8831632 | 301 | 788/31224/72200 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-120k | 244.6 | 237.0 | 249.9 | 8521896 | 149 | 2824/61344/122540 |
| packages/demo/public/SmileySans-Oblique.ttf | default | 33.9 | 33.8 | 34.2 | 1343376 | 46 | 848/32388/62156 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-48k | 33.9 | 33.7 | 34.1 | 1363272 | 62 | 872/25668/47192 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-120k | 33.7 | 33.0 | 34.1 | 1314548 | 34 | 872/37352/91192 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | default | 58.7 | 57.5 | 67.0 | 1655948 | 59 | 876/29416/60664 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-48k | 58.0 | 57.7 | 59.5 | 1677684 | 79 | 876/21704/46428 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-120k | 59.7 | 56.3 | 60.9 | 1627532 | 42 | 876/41460/88788 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | default | 13.8 | 13.7 | 14.5 | 211524 | 9 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-48k | 13.8 | 13.6 | 13.8 | 208000 | 8 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-120k | 13.5 | 13.5 | 13.5 | 208000 | 8 | 1780/4544/157996 |
