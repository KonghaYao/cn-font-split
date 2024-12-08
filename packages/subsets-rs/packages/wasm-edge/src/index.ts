import { IDirent, WASI } from '@tybys/wasm-util';
import 'buffer';
import { IFs, Volume, createFsFromVolume } from 'memfs-browser';
import { api_interface } from '../../ffi/gen/index';

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
    const fs = options?.fs ?? createFsFromVolume(new Volume());
    await fs.promises.mkdir('/tmp');
    await fs.promises.mkdir('/tmp/fonts');
    const key = options?.key ?? 'input';
    const i = new api_interface.InputTemplate(input);
    await fs.promises.mkdir('/tmp/' + key);
    await fs.promises.writeFile('/tmp/fonts/' + key, i.serialize());

    const wasi = new WASI({
        args: [key],
        env: {
            WASI_SDK_PATH: '/opt/wasi-sdk',
            RUST_LOG: 'debug',
        },
        preopens: {
            '/': '/',
        },
        // @ts-ignore
        fs,
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

    const { instance } = await loadWasm(imports);
    console.time('wasm');
    await wasi.start(instance);
    console.timeEnd('wasm');
    const files = (await fs.promises.readdir('/tmp/' + key)) as string[];
    return Promise.all(
        files
            .filter((i) => typeof i === 'string')
            .map(async (file) => {
                if (file)
                    return {
                        name: file,
                        data: (await fs.promises.readFile(
                            '/tmp/' + key + '/' + file,
                        )) as Uint8Array,
                    };
            }),
    ).finally(() => {
        // TODO 清理内存
    });
}
