/** 获取未强制分包的 unicodes */
export const getUnForcedCodes = (
    totalChars: Uint32Array,
    forcePartSet: Set<number>
) => {
    if (forcePartSet.size === 0) return [...totalChars];
    /** 求出未分包的 unicodes */
    const codes: number[] = [];
    totalChars.forEach((element) => {
        if (!forcePartSet.has(element)) {
            codes.push(element);
        }
    });
    return codes;
};
