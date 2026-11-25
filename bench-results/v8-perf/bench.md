# Benchmark: v8-perf

- commit: `d6e5d2b`
- platform: `macos-aarch64`
- timestamp: `2026-11-25T17:40:04.456714+08:00`

| font | case | median ms | min ms | max ms | woff2 bytes | subsets | subset min/median/max |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| packages/demo/public/NotoSerifSC-Regular.ttf | default | 73.6 | 71.7 | 82.6 | 8667296 | 210 | 1864/44088/85504 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-48k | 75.1 | 71.4 | 77.7 | 8790656 | 281 | 1312/33520/70404 |
| packages/demo/public/NotoSerifSC-Regular.ttf | chunk-120k | 68.9 | 68.0 | 72.0 | 8498224 | 142 | 2824/63916/124244 |
| packages/demo/public/SmileySans-Oblique.ttf | default | 13.4 | 13.1 | 14.0 | 1344516 | 47 | 872/31584/60644 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-48k | 13.6 | 13.5 | 13.7 | 1365956 | 64 | 872/23132/46196 |
| packages/demo/public/SmileySans-Oblique.ttf | chunk-120k | 12.9 | 12.7 | 13.0 | 1317300 | 34 | 872/42436/87628 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | default | 30.9 | 30.4 | 31.7 | 1661324 | 63 | 876/26704/57636 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-48k | 31.6 | 30.9 | 43.9 | 1679728 | 82 | 876/20372/44316 |
| packages/demo/public/SmileySans-Oblique.ttf.woff2 | chunk-120k | 31.3 | 31.1 | 31.5 | 1627388 | 44 | 876/38720/83524 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | default | 13.6 | 13.5 | 14.0 | 211524 | 9 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-48k | 15.0 | 13.5 | 15.2 | 208000 | 8 | 1780/4544/157996 |
| packages/demo/public/WorkSans-VariableFont_wght.ttf | chunk-120k | 13.8 | 13.7 | 14.3 | 208000 | 8 | 1780/4544/157996 |
