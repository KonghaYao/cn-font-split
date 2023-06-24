import { HB } from "../hb";
import { Context } from "../pipeline/index";
import { InputTemplate, SubsetResult, Subsets } from "../interface";

/** 全局 Context 的类型，用于在分步函数中定义类型 */
export type IContext = ReturnType<typeof createContext>;

/** 创建全局 Context，任何一处都可以调用 */
export const createContext = (opt: InputTemplate) =>
    new Context<{
        input: InputTemplate;
        originFile: Uint8Array;
        ttfFile: Uint8Array;
        hb: HB.Handle;
        subsetResult: SubsetResult;
        face: HB.Face;
        blob: HB.Blob;
        subsets: Subsets;
        nameTable: Record<string, string>;
    }>(
        { input: opt },
        {
            log: {
                settings: {
                    // minLevel: 6,
                    prettyLogTimeZone: "local",
                    prettyLogTemplate:
                        (true
                            ? ""
                            : "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}} {{ms}}\t ") +
                        "{{logLevelName}}\t",
                    ...(opt?.logger?.settings ?? {}),
                },
            },
        }
    );
