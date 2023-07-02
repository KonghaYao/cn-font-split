
import { WorkerURLWrapper } from '../utils/WorkerURLWrapper'
import { pool } from 'workerpool';
import WorkerURL from 'omt:./worker'


/** 为字体创建图片 */
export const makeImage = async (
    ttfFile: Uint8Array,
    text = "中文网字计划\nThe Project For Web",
    level = 9
): Promise<Uint8Array> => {
    const p = pool(WorkerURLWrapper('./' + WorkerURL), { maxWorkers: 2 })

    return new Promise<Uint8Array>((res, rej) => {
        // TODO : Deno 环境中失败并不报错
        p.exec('makeImage', [ttfFile, text, level], { transfer: [ttfFile.buffer] }).then(result => {
            res(result)
            p.terminate()
        }, (e) => {
            rej(e)
        })
    }).finally(() => {
        p.terminate()
    })

};
