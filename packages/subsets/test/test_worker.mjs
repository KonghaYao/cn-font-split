import { spawn, Thread, Worker } from "threads";
const auth = await spawn(new Worker("./test.mjs"));
