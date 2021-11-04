import { resolve } from "path";
export default resolve(import.meta.url.replace("file:///", ""), "../");
