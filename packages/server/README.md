# cn-font-server

字体构建服务器，使用 axum 库进行编写，高效构建并部署字体，面向服务集成，不直接对外。

./upload POST 指定上传文件构建字体。

```json
{
    "file_folder":"/temp/template2/",
    "file_url":"https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf"
}
```

./assets 目录直接保存构建产物，`file_folder` 为文件名。

## Token 算法

```js
// 10s 过期的 token
sha256(token + Math.floor(Date.now()/10000))
```
