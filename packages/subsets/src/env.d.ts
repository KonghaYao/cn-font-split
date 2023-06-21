declare module "*.html" {
    const a: string;
    export default a;
}
declare module "https://*" {
    const a: any;
    export const ensureDir: any;
    export default a;
}
declare module "web-worker:*" {
    export default class WebWorker extends Worker {
        constructor();
    }
}
