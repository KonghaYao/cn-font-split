import { api_interface } from '../../ffi/gen/index';
import { IFs, Volume, createFsFromVolume } from 'memfs-browser';
import { WASI } from '@tybys/wasm-util';

// @ts-ignore
globalThis.process = {
    env: {
        // NODE_DEBUG_NATIVE: 'wasi',
    },
};

export type FontSplitProps = ConstructorParameters<
    typeof api_interface.InputTemplate
>[0];
export { api_interface as proto };

export class APIInterface {
    constructor(
        public key: string = Math.random().toString().replace('.', ''),
    ) {}
    fs: IFs;
    async init(fs = createFsFromVolume(new Volume())) {
        await fs.promises.mkdir('/tmp/fonts', { recursive: true });
        await fs.promises.mkdir('/tmp/' + this.key);
        this.fs = fs;
    }
    async setConfig(config: FontSplitProps) {
        const i = new api_interface.InputTemplate(config);

        await this.fs.promises.writeFile(
            '/tmp/fonts/' + this.key,
            i.serialize(),
        );
    }
    async callback() {
        const files = (await this.fs.promises.readdir(
            '/tmp/' + this.key,
        )) as string[];
        return Promise.all(
            files
                .filter((i) => typeof i === 'string')
                .map(async (file) => {
                    if (file) {
                        const path = '/tmp/' + this.key + '/' + file;
                        const data = (await this.fs.promises.readFile(
                            path,
                        )) as Uint8Array;
                        await this.fs.promises.unlink(path);
                        return {
                            name: file,
                            data,
                        };
                    }
                }),
        ).finally(async () => {
            await this.fs.promises.unlink('/tmp/fonts/' + this.key);
        });
    }
}

export async function fontSplit(
    input: FontSplitProps,
    loadWasm: (
        imports: any,
    ) => Promise<WebAssembly.WebAssemblyInstantiatedSource>,
    options?: {
        key?: string;
        logger: (str: string, type: 'log' | 'error') => void;
        fs?: IFs;
    },
) {
    const api = new APIInterface(options?.key);
    await api.init();
    await api.setConfig(input);

    const { imports, wasi } = createWasi(api, options);

    const wasm = await loadWasm(imports);
    const { instance } = wasm;
    console.time('wasm');
    await wasi.start(instance);
    console.timeEnd('wasm');

    return api.callback();
}
export function createWasi(
    api: APIInterface,
    options:
        | {
              key?: string;
              logger: (str: string, type: 'log' | 'error') => void;
              fs?: IFs;
          }
        | undefined,
) {
    const wasi = new WASI({
        args: [api.key],
        env: {
            WASI_SDK_PATH: '/opt/wasi-sdk',
            RUST_LOG: 'debug',
        },
        preopens: {
            '/': '/',
        },
        // @ts-ignore
        fs: api.fs,
        print(text) {
            options?.logger(text, 'log');
        },
        printErr(text) {
            options?.logger(text, 'error');
        },
    });
    const imports = {
        wasi_snapshot_preview1: wasi.wasiImport,
        env: {
            pthread_mutex_init: () => {
                console.log('Initializing mutex');
                return 0; // 成功初始化
            },
            pthread_mutex_lock: () => {
                console.log('Locking mutex');
                return 0; // 成功锁定
            },
            pthread_mutex_unlock: () => {
                console.log('Unlocking mutex');
                return 0; // 成功解锁
            },
            pthread_mutex_destroy: () => {
                console.log('Destroying mutex');
                return 0; // 成功销毁
            },
        },
    };
    return { imports, wasi };
}

export class StaticWasm {
    wasmBuffer: Promise<ArrayBuffer>;
    constructor(public url: string) {
        this.wasmBuffer = fetch(url).then((res) => res.arrayBuffer());
    }
    WasiHandle = async (imports: any) => {
        return WebAssembly.instantiate(
            new Uint8Array((await this.wasmBuffer).slice()),

            // './target/wasm32-wasip1/release/wasm_edge.Oz.wasm',
            imports as any,
        );
    };
}
