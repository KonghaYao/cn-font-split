# cn-font-split 的 ffi 构建项目

目标： 实现本机跨语言调用，保证高性能复用代码
跨语言平台：

- [x] nodejs
- [x] deno
- [x] bun
- [ ] go 


需求实现
1. CN_FONT_SPLIT_BIN 环境变量将会写入二进制 ffi 产物的地址，各个语言可直接获取
2. gen 文件夹存储生成的文件
3. dist 文件夹存储生产代码 dist/node 表示 node 版本的代码

