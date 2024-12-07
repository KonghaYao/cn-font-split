import { WASI } from '@tybys/wasm-util';
import 'buffer';
import { Volume, createFsFromVolume } from 'memfs-browser';
import { api_interface } from '../../ffi/gen/index';

// @ts-ignore
globalThis.process = {
    env: {
        // NODE_DEBUG_NATIVE: 'wasi',
    },
};

const volume = new Volume();
const fs = createFsFromVolume(volume);
await fs.promises.mkdir('/tmp');
await fs.promises.mkdir('/tmp/fonts');

export type FontSplitProps = ConstructorParameters<
    typeof api_interface.InputTemplate
>[0];
export { fs, api_interface as proto };
export async function fontSplit(
    input: FontSplitProps,
    loadWasm: (
        imports: any,
    ) => Promise<WebAssembly.WebAssemblyInstantiatedSource>,
    options?: {
        key?: string;
        logger: (str: string, type: 'log' | 'error') => void;
    },
) {
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
            pthread_mutex_init: (mutex, attr) => {
                console.log('Initializing mutex');
                return 0; // 成功初始化
            },
            pthread_mutex_lock: (mutex) => {
                console.log('Locking mutex');
                return 0; // 成功锁定
            },
            pthread_mutex_unlock: (mutex) => {
                console.log('Unlocking mutex');
                return 0; // 成功解锁
            },
            pthread_mutex_destroy: (mutex) => {
                console.log('Destroying mutex');
                return 0; // 成功销毁
            },
        },
    };

    const { instance } = await loadWasm(imports);
    console.time('wasm');
    await wasi.start(instance);
    console.timeEnd('wasm');
    const dirs = await fs.promises.readdir('/tmp/' + key);
    return Promise.all(
        dirs.map(async (dir) => {
            return {
                name: dir,
                data: await fs.promises.readFile('/tmp/' + key + '/' + dir),
            };
        }),
    ).finally(() => {
        // TODO 清理内存
    });
}
