import { HB } from "../hb";
import { FontType, convert } from "../font-converter";
import { subsetFont } from "../subset";

/** 计算分包时，单个包内可以容纳的最大轮廓 */
export async function calcContoursBorder(
    hb: HB.Handle,
    face: HB.Face,
    targetType: FontType,
    contoursMap: Map<number, number>,
    maxSize: number
) {
    const sample = face.collectUnicodes();
    const space = Math.floor(sample.length / 300);
    let sampleUnicode: number[] = [];
    for (let index = 0; index < sample.length; index += space) {
        const element = sample[index];
        sampleUnicode.push(element);
    }
    // console.log(sampleUnicode.length);
    const [buffer, arr] = subsetFont(face, sampleUnicode, hb);
    const transferred = await convert(
        new Uint8Array(buffer!.buffer),
        targetType
    );

    const totalContours: number = arr.reduce((col, cur) => {
        return col + (contoursMap.get(cur) ?? contoursMap.get(0)!);
    }, 0);
    const ContoursPerByte = totalContours / transferred.byteLength;
    return maxSize * ContoursPerByte;
}
