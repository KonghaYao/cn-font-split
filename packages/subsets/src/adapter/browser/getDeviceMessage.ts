import { DeviceMessage } from '../../templates/device';

/** 获取浏览器环境信息 */
export const getBrowserDeviceMessage = (): DeviceMessage => {
    const WINDOW = window;
    let OS_PLATFORM = '';
    let OS_PLATFORM_VERSION = '';
    let OS_ARCH = '';
    let OS_BROWSER = (WINDOW.navigator && WINDOW.navigator.userAgent) || '';
    let OS_MODEL = '';
    const OS_LOCALE =
        (WINDOW.navigator && WINDOW.navigator.language) ||
        (WINDOW.navigator &&
            WINDOW.navigator.languages &&
            WINDOW.navigator.languages[0]) ||
        '';

    // @ts-expect-error userAgentData is not part of the navigator interface yet
    const userAgentData = WINDOW.navigator.userAgentData;

    if (isUserAgentData(userAgentData)) {
        userAgentData
            .getHighEntropyValues([
                'architecture',
                'model',
                'platform',
                'platformVersion',
                'fullVersionList',
            ])
            .then((ua: UAData) => {
                OS_PLATFORM = ua.platform || '';
                OS_ARCH = ua.architecture || '';
                OS_MODEL = ua.model || '';
                OS_PLATFORM_VERSION = ua.platformVersion || '';

                if (ua.fullVersionList && ua.fullVersionList.length > 0) {
                    const firstUa =
                        ua.fullVersionList[ua.fullVersionList.length - 1];
                    OS_BROWSER = `${firstUa.brand} ${firstUa.version}`;
                }
            })
            .catch((e) => void e);
    }
    return {
        runtime: {
            name: 'javascript',
            version: navigator.userAgent,
        },
        os: {
            name: OS_PLATFORM,
            version: OS_PLATFORM_VERSION,
            build_number: OS_BROWSER,
        },
        device: {
            cpus: navigator.hardwareConcurrency,
            locale: OS_LOCALE,
            model: OS_MODEL,
            manufacturer: OS_BROWSER,
            architecture: OS_ARCH,
        },
        createdTime: new Date().toUTCString(),
    };
};
function isUserAgentData(data: unknown): data is UserAgentData {
    return (
        typeof data === 'object' &&
        data !== null &&
        'getHighEntropyValues' in data
    );
}
interface UserAgentData {
    getHighEntropyValues: (keys: string[]) => Promise<UAData>;
}

type UAData = {
    platform?: string;
    architecture?: string;
    model?: string;
    platformVersion?: string;
    fullVersionList?: {
        brand: string;
        version: string;
    }[];
};
