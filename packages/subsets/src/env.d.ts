declare module "*.html" {
    const a: string;
    export default a;
}
declare global {
    var __cn_font_split_version__: string
}

declare module "https://*" {
    const a: any;
    export const ensureDir: any;
    export const fileURLToPath: any;
    export const Md5: any
    export default a;
}
declare module "omt:*" {
    const a: string;
    export default a;
}
declare module "https://deno.land/std@0.170.0/node/url.ts" {
    export * from 'node:url'
}
declare module "comlink/dist/esm/node-adapter.mjs" {
    import { Endpoint } from "comlink/dist/esm/protocol";
    export interface NodeEndpoint {
        postMessage(message: any, transfer?: any[]): void;
        on(
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: {}
        ): void;
        off(
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: {}
        ): void;
        start?: () => void;
    }
    export default function nodeEndpoint(nep: NodeEndpoint): Endpoint;
}
export { }