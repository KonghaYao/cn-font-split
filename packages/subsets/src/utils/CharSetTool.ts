/** 直接从 A 中删除 B */
export function differenceSet(A: Set<number>, B: Set<number> | number[]) {
    const BSet = B instanceof Set ? B.values() : B;
    for (const i of BSet) {
        if (A.has(i)) A.delete(i);
    }
    return A;
}
