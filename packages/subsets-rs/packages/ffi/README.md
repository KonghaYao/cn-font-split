# cn-font-split 的 ffi 构建项目

目标： 实现本机跨语言调用，保证高性能复用代码
跨语言平台：

1. nodejs
2. deno
3. bun
4. go 


需求实现
1. CN_FONT_SPLIT_BIN 环境变量将会写入二进制 ffi 产物的地址，各个语言可直接获取