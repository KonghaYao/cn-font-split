import { getBrowserDeviceMessage } from '../browser/getDeviceMessage';
/** 获取deno环境信息 */
export const getDenoDeviceMessage = async () => {
    const { default: os } = await import(
        'https://deno.land/x/dos@v0.11.0/mod.ts'
    );
    const info = getBrowserDeviceMessage();
    const denoVersion = globalThis.Deno.version;
    info.runtime.version = denoVersion.deno;

    info.os = {
        name: os.platform(),
        version: '',
        // release: os.release(),
    };
    info.device.architecture = await os.arch();
    info.runtime.name = 'typescript';
    return info;
};
