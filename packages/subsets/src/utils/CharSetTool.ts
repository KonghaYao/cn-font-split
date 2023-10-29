export const CharsetTool = {
    /** 直接从 A 中删除 B */
    difference(A: Set<number>, B: Set<number> | number[]) {
        const BSet = B instanceof Set ? B.values() : B;
        for (const i of BSet) {
            if (A.has(i)) A.delete(i);
        }
        return A;
    },
};
