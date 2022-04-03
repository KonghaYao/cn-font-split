import { resolve } from "path";
// 必须要放置在这里测得的才是文件夹目录
export default resolve(import.meta.url.replace("file:///", ""), "../");
