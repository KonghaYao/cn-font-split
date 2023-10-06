import { Step } from './executor';

export class Parallel<CTX> {
    constructor(public to: string, public task: Step<CTX>) {}
}
