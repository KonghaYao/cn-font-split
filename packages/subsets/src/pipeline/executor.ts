import { Context } from "./context";

// ctx = new Context<{}>(
//     {},
//     { log: { settings: { name: "executor", type: "pretty" } } }
// );

export class Executor<
    T extends Record<string, (ctx: CTX) => void | Promise<void>>,
    K extends keyof T,
    CTX extends Context<unknown>
> {
    constructor(
        /** 定义每一个运行步骤的函数 */
        private steps: T,
        public context: CTX
    ) {}

    /** step 函数将会根据这个来运行 */
    order!: K[];
    defineOrder(keys: K[]) {
        if (this.ptr === -1) this.order = keys;
        return this;
    }
    /**
     * state of class
     *  -1 => idle;
     *  index of this.order => running;
     *  more => done;
     */
    protected ptr: number = -1;
    setPtr(newPtr: number) {
        if (newPtr <= this.order.length && newPtr >= 0) {
            this.ptr = newPtr;
            return this.ptr;
        } else {
            throw new Error("setPtr: Array boundary number error: " + newPtr);
        }
    }
    /** 步进机制，可以添加事件响应，或者 debugger */
    async nextStep() {
        const ptr = this.setPtr(this.ptr + 1);
        const taskName = this.order[ptr];
        if (taskName) {
            this.context.info("-->\t" + (taskName as string) + " Start");
            const start = performance.now();
            await this.steps[taskName](this.context);
            const end = performance.now();
            this.context.info(
                "<--\t" +
                    (taskName as string) +
                    " Done\t" +
                    (end - start).toFixed(0) +
                    "ms\t"
            );
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
        if (!this.order)
            throw new Error("run: Please defineOrder for the tasks");
        let max = this.order.length * maxStepsOver;
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
