import { api_interface } from './gen/index';
import { FontSplitProps, OriginInput } from './interface';
import fs from 'fs-extra';
import path from 'path';
export { api_interface as proto };
export const decodeReporter = (reporterBin: Uint8Array) => {
    return api_interface.OutputReport.deserialize(reporterBin);
};

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
        return new Promise<void>((res) => {
            const buf = input.serialize();
            const appCallback = (data: Uint8Array): void => {
                let e = api_interface.EventMessage.deserialize(data);
                switch (e.event) {
                    case api_interface.EventName.END:
                        res();
                        break;
                    case api_interface.EventName.OUTPUT_DATA:
                        console.log(e.message);
                        (config.outputFile || fs.outputFile)(
                            path.join(input.outDir, e.message),
                            e.data,
                        );
                        break;
                    default:
                        console.log(e.event);
                }
            };
            font_split(buf as any, buf.length, createCallback(appCallback));
        }).finally(() => {
            console.log('构建完成');
            finallyFn?.();
        });
    };
};
