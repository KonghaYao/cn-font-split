import { HB } from "src/hb.js";
import { Context, Executor } from "../pipeline/index.js";
import { InputTemplate, SubsetResult, Subsets } from "../interface.js";
export type IContext = ReturnType<typeof createContext>;
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
                    prettyLogTimeZone: "local",
                    prettyLogTemplate:
                        (true
                            ? ""
                            : "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}} {{ms}}\t ") +
                        "{{logLevelName}}\t",
                },
            },
        }
    );
