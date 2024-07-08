/** 直接从 A 中删除 B */
export function differenceSet(A: Set<number>, B: Set<number> | number[]) {
    const BSet = B instanceof Set ? B.values() : B;
    for (const i of BSet) {
        if (A.has(i)) A.delete(i);
    }
    return A;
}

/**
 * 获取字符串中所有字符的Unicode编码
 * @param s 输入的字符串
 * @returns 包含字符串中所有字符Unicode编码的数组
 */
export function getAllCharCodeOfString(s: string) {
    const data = [];
    // 遍历字符串中的每个字符
    for (let ch of s) {
        // 将字符的Unicode编码推入数组
        data.push(ch.codePointAt(0)!);
    }
    return data;
}
