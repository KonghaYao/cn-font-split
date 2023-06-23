import { Remote, wrap } from "comlink";
import { Pool } from "../utils/Pool";
import { API } from "./convert.worker";
import WORKER_URL from "omt:./convert.manager";
export class ConvertManager extends Pool<Remote<API>> {
    async create() {
        const w = new Worker(new URL(WORKER_URL, import.meta.url), {
            type: "module",
        });
        return wrap<API>(w);
    }
    destroy(): void {
        throw new Error("Method not implemented.");
    }
}
