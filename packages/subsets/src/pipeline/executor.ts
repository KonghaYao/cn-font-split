import { Context } from "./context";
export interface PerformanceRecord {
    name: string;
    start: number;
    end: number;
}
import { Parallel } from './parallel'
export type Step<CTX> = ((ctx: CTX) => void | Promise<void>)
// ctx = new Context<{}>(
//     {},
//     { log: { settings: { name: "executor", type: "pretty" } } }
// );

export class Executor<
    T extends Step<CTX> | Parallel<CTX>,
    CTX extends Context<unknown>
> {
    constructor(
        /** 定义每一个运行步骤的函数 */
        private steps: T[],
        public context: CTX
    ) { }

    /**
     * state of class
     *  -1 => idle;
     *  index of this.order => running;
     *  more => done;
     */
    protected ptr = -1;
    setPtr(newPtr: number) {
        if (newPtr <= this.steps.length && newPtr >= 0) {
            this.ptr = newPtr;
            return this.ptr;
        } else {
            throw new Error("setPtr: Array boundary number error: " + newPtr);
        }
    }
    public records: PerformanceRecord[] = [];
    startTask(task: Step<CTX>) {
        this.context.info("-->\t\t" + task.name + "\tStart");
        const start = performance.now();
        return { start, p: (async () => task(this.context))().then(() => this.endTask({ start, task })), task }
    }
    endTask({ start, task }: {
        start: number;
        task: Step<CTX>;
    }) {
        const end = performance.now();
        this.context.info(
            "<--\t" +
            (end - start).toFixed(0) +
            "ms\t" +
            task.name +
            "\tDone\t"
        );

        const record: PerformanceRecord = { name: task.name, start, end };
        this.records.push(record);
    }
    /** 步进机制，可以添加事件响应，或者 debugger */
    async nextStep() {
        const ptr = this.setPtr(this.ptr + 1);
        const task = this.steps[ptr];
        if (typeof task === 'function') {
            const message = this.startTask(task)
            await message.p
            const pending = this.concurrentMap.get(task.name)
            if (pending) {
                await Promise.all(pending.map(async i => i.p))
            }
            return true;
        } else if (task instanceof Parallel) {
            const pending = this.concurrentMap.get(task.to) ?? []
            pending.push(this.startTask(task.task) as ReturnType<this["startTask"]>)
            this.concurrentMap.set(task.to, pending)
            return true
        } else {
            return false;
        }
    }
    private concurrentMap = new Map<string, ReturnType<this['startTask']>[]>()
    async run(
        /**
         * 当任务执行次数超过这个倍数时将会跳出循环并且报错 */
        maxStepsOver = 1.5
    ) {
        if (!this.steps)
            throw new Error("run: Please defineOrder for the tasks");
        const max = this.steps.length * maxStepsOver;
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
