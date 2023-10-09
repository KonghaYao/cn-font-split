/** 获取浏览器环境信息 */
export const getNodeDeviceMessage = async () => {
    const os = await import('os');
    const { osLocale } = await import('os-locale');
    return {
        runtime: {
            name: 'javascript',
            version: process.versions.node,
        },
        os: {
            name: os.platform(),
            version: os.version(),
            release: os.release(),
        },
        device: {
            cpus: os.cpus().length,
            locale: await osLocale(),
            architecture: os.arch(),
        },
        createdTime: new Date().toUTCString(),
    };
};
