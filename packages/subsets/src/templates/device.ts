import type { env as ENV } from '../utils/env';
import { getBrowserDeviceMessage } from '../adapter/browser/getDeviceMessage';
import { getNodeDeviceMessage } from '../adapter/node/getDeviceMessage';
import { getDenoDeviceMessage } from '../adapter/deno/getDeviceMessage';
export interface DeviceMessage {
    runtime: {
        name: string;
        version: string;
    };
    os: {
        name: string;
        version: string;
        build_number?: string;
    };
    device: {
        cpus: number;
        locale: string;
        model?: string;
        manufacturer?: string;
        architecture: string;
    };
    createdTime: string;
}

/** 获取设备信息 */
export const getDeviceMessage = async (
    env: typeof ENV,
): Promise<DeviceMessage | undefined> => {
    if (env === 'browser') return getBrowserDeviceMessage();
    //ifdef node
    if (env === 'node') return getNodeDeviceMessage();
    //endif
    if (env === 'deno') return getDenoDeviceMessage();
};
