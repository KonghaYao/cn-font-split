# Benchmark: v7-baseline

- commit: `1650af1`
- platform: `macos-aarch64`
- timestamp: `2026-11-25T15:11:44.547532+08:00`

| font | case | median ms | min ms | max ms | woff2 bytes | subsets | subset min/median/max |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| packages/demo/public/NotoSerifSC-Regular.ttf | default | 274.5 | 257.5 | 277.5 | 8703824 | 223 | 1440/41900/87080 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-48k | 464.8 | 404.7 | 596.4 | 8831632 | 301 | 788/31224/72200 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-120k | 602.9 | 546.5 | 628.7 | 8522124 | 149 | 2824/61344/122540 |
| packages/demo/public/SmileySans-Oblique.ttf | default | 83.8 | 54.2 | 94.4 | 1343376 | 46 | 848/32388/62156 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-48k | 105.8 | 81.1 | 114.3 | 1363272 | 62 | 872/25668/47192 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-120k | 72.7 | 64.5 | 103.6 | 1314548 | 34 | 872/37352/91192 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | default | 144.0 | 103.1 | 154.3 | 1655948 | 59 | 876/29416/60664 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-48k | 169.2 | 125.0 | 171.7 | 1677684 | 79 | 876/21704/46428 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-120k | 107.3 | 102.8 | 122.7 | 1627532 | 42 | 876/41460/88788 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | default | 28.4 | 21.6 | 33.0 | 211524 | 9 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-48k | 43.1 | 37.2 | 45.6 | 208000 | 8 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-120k | 25.2 | 22.5 | 26.4 | 208000 | 8 | 1780/4544/157996 |
