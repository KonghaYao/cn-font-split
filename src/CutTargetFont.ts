import { chunk } from "lodash";
import { prepareCharset } from "./prepareCharset";
// 分包系统
export async function CutTargetFont<T = ReturnType<typeof prepareCharset>>(
    total: T,
    chunkOptions: any = {}
) {
    const last = Object.entries<number[]>(total as any).reduce(
        (col, [key, chars]) => {
            if (chars.length) {
                const subset = chars;
                const size = Math.ceil(
                    subset.length / (chunkOptions[key] as number)
                );
                const result = chunk(subset, size);
                col.set(key, result);
                console.log(
                    key,
                    "| 总数: ",
                    chars.length,
                    "| 分包数目: ",
                    result.length
                );

                console.log(result.map((i) => i.length).join(" "));
            }
            return col;
        },
        new Map<string, number[][]>()
    );
    return Object.fromEntries(last.entries());
}
