/** 缓存函数，函数返回值不可以为 null */
export const cacheResult = <T extends (...args: any) => any>(func: T) => {
    let res = null as unknown as ReturnType<T>;
    return function (this: ThisType<T>, ...args: Parameters<T>) {
        if (res === null) {
            res = func.apply(this, args);
        }
        return res;
    } as T;
};
