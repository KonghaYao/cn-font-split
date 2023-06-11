import { Context } from "./context";
export interface PerformanceRecord {
    name: string;
    start: number;
    end: number;
}
// ctx = new Context<{}>(
//     {},
//     { log: { settings: { name: "executor", type: "pretty" } } }
// );

export class Executor<
    T extends (ctx: CTX) => void | Promise<void>,
    CTX extends Context<unknown>
> {
    constructor(
        /** 定义每一个运行步骤的函数 */
        private steps: T[],
        public context: CTX
    ) {}

    /**
     * state of class
     *  -1 => idle;
     *  index of this.order => running;
     *  more => done;
     */
    protected ptr: number = -1;
    setPtr(newPtr: number) {
        if (newPtr <= this.steps.length && newPtr >= 0) {
            this.ptr = newPtr;
            return this.ptr;
        } else {
            throw new Error("setPtr: Array boundary number error: " + newPtr);
        }
    }
    public records: PerformanceRecord[] = [];
    /** 步进机制，可以添加事件响应，或者 debugger */
    async nextStep() {
        const ptr = this.setPtr(this.ptr + 1);
        const task = this.steps[ptr];
        if (task) {
            this.context.info("-->\t" + task.name + "\tStart");
            const start = performance.now();
            await task(this.context);
            const end = performance.now();
            this.context.info(
                "<--\t" +
                    task.name +
                    "\tDone\t" +
                    (end - start).toFixed(0) +
                    "ms"
            );

            const record: PerformanceRecord = { name: task.name, start, end };
            this.records.push(record);
            return true;
        } else {
            return false;
        }
    }
    async run(
        /**
         * 当任务执行次数超过这个倍数时将会跳出循环并且报错 */
        maxStepsOver = 1.5
    ) {
        if (!this.steps)
            throw new Error("run: Please defineOrder for the tasks");
        let max = this.steps.length * maxStepsOver;
        let count = 0;
        let keep = true;
        while (keep) {
            keep = await this.nextStep();
            count++;
            if (count >= max)
                throw new Error("Executor run: too many times task to run!");
        }
        return this.context;
    }
}
