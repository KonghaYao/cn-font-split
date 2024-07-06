import { Logger, ISettingsParam } from 'tslog';
/**
 * 数据上下文, 同时具有 logger 的功能
 * @example
 * const ctx = new Context<{a:string,b:number}>()
 *
 * function someRuntimeSaveValue(){
 *      ctx.set('a','useful')
 * }
 * function someRuntime(){
 *    const {a}=ctx.pick('a')
 *
 * }
 * ctx.free()
 *
 */
export class Context<T, LogObj = unknown> extends Logger<LogObj> {
    constructor(
        /** 初始化数据 */
        private _originData: Partial<T> = {},
        opts: {
            log?: {
                settings?: ISettingsParam<LogObj>;
                logObj?: LogObj;
            };
        } = {},
    ) {
        super(opts?.log?.settings, opts?.log?.logObj);
    }

    registerLog(log: (...args: any[]) => void) {
        this.attachTransport((obj) => {
            const params = Object.keys(obj)
                .filter((i) => !isNaN(parseInt(i)))
                .map((i) => {
                    return [parseInt(i), obj[i]] as const;
                })
                .sort((a, b) => a[0] - b[0])
                .map((i) => i[1]);
            log(
                // 因为这里被标记为了 private，但是可以访问到，所以需要防止 ts 报错
                (this as any)._prettyFormatLogObjMeta(obj._meta),
                ...params,
            );
        });
    }

    set<K extends keyof T>(key: K, value: T[K]) {
        this._originData[key] = value;
    }

    free(...keys: (keyof T)[]) {
        for (const key of keys) {
            delete this._originData[key];
        }
    }
    check<K extends keyof T>(key: K) {
        return key in this._originData;
    }
    destroy() {
        this._originData = {};
    }
    /**
     * 使用Context时，必须要使用 pick 具名导出你需要的数据。
     * 如果在运行时，没有发现 key 则会 waning
     *  */
    pick<K extends keyof T>(...keys: K[]): Pick<T, K> {
        if (keys.length === 0)
            throw new Error(
                'Context pick: please send some name to access the keys you sure to be existed!',
            );
        // 创建一个新的对象，用于存储选取的属性
        const pickedObj = {} as Pick<T, K>;

        // 遍历所有要选取的属性
        keys.forEach((key) => {
            if (key in this._originData) {
                pickedObj[key] = this._originData[key] as T[K];
            } else {
                console.warn(
                    `[Warning] Context: ${
                        key as string
                    } isn't found in context, It could cause Error`,
                );
            }
        });

        return pickedObj;
    }
}
