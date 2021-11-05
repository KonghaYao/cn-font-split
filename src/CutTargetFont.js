import { chunk } from "lodash-es";

// 分包系统
export default async function ({ other, TC, SC }, chunkOptions = {}) {
    const total = { other, TC, SC };
    const last = Object.entries(total).reduce((col, [key, value]) => {
        if (value.length) {
            const subset = value;
            const size = Math.ceil(subset.length / chunkOptions[key]);
            const result = chunk(subset, size);
            col.set(key, result);
            console.log(
                key,
                "| 总数: ",
                value.length,
                "| 分包数目: ",
                result.length
            );

            console.log(result.map((i) => i.length).join(" "));
        }
        return col;
    }, new Map());
    return Object.fromEntries(last.entries());
}
