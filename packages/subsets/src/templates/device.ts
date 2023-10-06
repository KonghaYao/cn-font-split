import { getBrowserDeviceMessage } from '../adapter/browser/getDeviceMessage';
import { getNodeDeviceMessage } from '../adapter/node/getDeviceMessage';
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

export const getDeviceMessage = (env: string) => {
    if (env === 'browser') return getBrowserDeviceMessage();
    if (env === 'node') return getNodeDeviceMessage();
};
