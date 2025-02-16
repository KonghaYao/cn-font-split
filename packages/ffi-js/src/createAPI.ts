import { api_interface } from './gen/index';
import { FontSplitProps, OriginInput } from './interface';
export * from './decodeReporter';
import fs from 'fs-extra';
import path from 'path';
export { api_interface as proto };
/** 转换 JS 接口数据为 proto 接口数据 */
const transType = async (props: FontSplitProps): Promise<OriginInput> => {
    const data: Partial<OriginInput> = {};
    if (typeof props.input === 'string') {
        data.input = await fs.readFile(props.input);
    } else {
        data.input = props.input;
    }
    if (Array.isArray(props.subsets)) {
        data.subsets = props.subsets.map(
            (i) => new Uint8Array(new Uint32Array(i).buffer),
        );
    }
    return { ...props, ...data } as any as OriginInput;
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
        const input = api_interface.InputTemplate.fromObject(midType);
        if (!input.outDir) throw new Error('cn-font-split need outDir');
        const key = Math.random().toString().slice(2, 5);
        console.time('cn-font-split ' + key);
        let handles: Promise<void>[] = [];
        return new Promise<void>((res) => {
            const buf = input.serialize();
            const appCallback = (data: Uint8Array): void => {
                let e = api_interface.EventMessage.deserialize(data);
                switch (e.event) {
                    case api_interface.EventName.END:
                        res();
                        break;
                    case api_interface.EventName.OUTPUT_DATA:
                        !config.silent && console.log(e.message);
                        let handle = (config.outputFile || fs.outputFile)(
                            path.join(input.outDir, e.message),
                            e.data,
                        );
                        handles.push(handle);
                        break;
                    default:
                    // console.log(e.event);
                }
            };
            font_split(buf as any, buf.length, createCallback(appCallback));
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
