import { Logger } from "tslog";
import { Context } from "./context";

// ctx = new Context<{}>(
//     {},
//     { log: { settings: { name: "executor", type: "pretty" } } }
// );

export class Executor<
    T extends Record<string, Function>,
    K extends keyof T,
    CTX extends Context<unknown>
> {
    constructor(
        /** 定义每一个运行步骤的函数 */
        private steps: T,
        public context: CTX
    ) {}

    /** step 函数将会根据这个来运行 */
    order: K[];
    defineOrder(keys: K[]) {
        if (this.ptr === -1) this.order = keys;
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
    nextStep() {
        const ptr = this.setPtr(this.ptr + 1);
        const task = this.order[ptr];
        if (task instanceof Function) {
            return this.steps[task](this.context);
        }
    }
}
