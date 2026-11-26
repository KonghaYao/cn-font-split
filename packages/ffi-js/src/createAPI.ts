import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
    EventMessageSchema,
    EventName,
    InputTemplateSchema,
} from './gen/index_pb.js';
import type { EventMessage } from './gen/index_pb.js';
import { toInputTemplateInit } from './inputTemplate.js';
import { FontSplitProps, OriginInput } from './interface.js';
export * from './decodeReporter.js';
export * as proto from './gen/index_pb.js';
import fs from 'fs-extra';
import path from 'path';

/** 转换 JS 接口数据为 proto 接口数据（字段白名单见 inputTemplate.ts） */
const transType = async (props: FontSplitProps): Promise<OriginInput> => {
    return toInputTemplateInit({
        ...props,
        input:
            typeof props.input === 'string'
                ? await fs.readFile(props.input)
                : props.input,
    });
};
export const createAPI = <
    OriginCB extends (buffer: any, length: number) => void,
>(
    font_split: (buffer: Uint8Array, length: number, cb: OriginCB) => void,
    createCallback: (cb: (data: Uint8Array) => void) => OriginCB,
    finallyFn?: () => void,
) => {
    return async function fontSplit(config: FontSplitProps) {
        const midType = await transType(config);
        const input = create(InputTemplateSchema, midType);
        const outDir = input.outDir;
        if (!outDir) throw new Error('cn-font-split need outDir');
        const key = Math.random().toString().slice(2, 5);
        console.time('cn-font-split ' + key);
        let handles: Promise<void>[] = [];
        return new Promise<void>((res, rej) => {
            const buf = toBinary(InputTemplateSchema, input);
            // 事件流只允许结算一次：先到 ERROR 就 reject，先到 END 就 resolve。
            let settled = false;
            const appCallback = (data: Uint8Array): void => {
                if (settled) return;
                let e: EventMessage;
                try {
                    e = fromBinary(EventMessageSchema, data);
                } catch (err) {
                    settled = true;
                    rej(err);
                    return;
                }
                switch (e.event) {
                    case EventName.ERROR:
                        settled = true;
                        rej(new Error(e.message || 'cn-font-split 未知错误'));
                        break;
                    case EventName.END:
                        settled = true;
                        res();
                        break;
                    case EventName.OUTPUT_DATA:
                        !config.silent && console.log(e.message);
                        let handle = (config.outputFile || fs.outputFile)(
                            path.join(outDir, e.message),
                            // OUTPUT_DATA 一定带 data；兜底空字节是为了保持旧版
                            // `getFieldWithDefault(..., new Uint8Array(0))` 的语义。
                            e.data ?? new Uint8Array(0),
                        );
                        handles.push(handle);
                        break;
                    default:
                    // console.log(e.event);
                }
            };
            font_split(buf, buf.length, createCallback(appCallback));
        })
            .then(async (res) => {
                await Promise.all(handles);
                return res;
            })
            .finally(() => {
                console.timeEnd('cn-font-split ' + key);
                finallyFn?.();
            });
    };
};
