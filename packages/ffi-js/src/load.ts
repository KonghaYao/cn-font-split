export const matchPlatform = (
    platform: string,
    arch: string,
    isMusl: () => boolean,
): string => {
    const platformArchMap: { [key: string]: { [key: string]: string | null } } =
        {
            android: {
                arm64: null,
                arm: null,
            },
            win32: {
                x64: 'x86_64-pc-windows-msvc',
                arm64: 'aarch64-pc-windows-msvc',
            },
            darwin: {
                x64: 'x86_64-apple-darwin',
                arm64: 'aarch64-apple-darwin',
            },
            freebsd: {
                x64: 'x86_64-unknown-freebsd',
            },
            linux: {
                x64: isMusl() ? null : 'x86_64-unknown-linux-gnu',
                arm64: isMusl() ? null : 'aarch64-unknown-linux-gnu',
                arm: null,
                riscv64: isMusl() ? null : 'riscv64gc-unknown-linux-gnu',
                s390x: 's390x-unknown-linux-gnu',
            },
        };
    return platformArchMap?.[platform]?.[arch] ?? 'wasm32-wasip1';
};

/**
 * 当前平台对应的可发布二进制包名后缀（`@cn-font-split/<name>`）。
 * 没有对应包时返回 null：musl / android / 32 位等只支持 CN_FONT_SPLIT_BIN 覆盖。
 */
export const getPlatformPackageName = (
    platform: string,
    arch: string,
    isMusl: () => boolean,
): string | null => {
    if (platform === 'darwin') {
        if (arch === 'arm64') return 'darwin-arm64';
        if (arch === 'x64') return 'darwin-x64';
        return null;
    }
    if (platform === 'win32') {
        if (arch === 'x64') return 'win32-x64-msvc';
        if (arch === 'arm64') return 'win32-arm64-msvc';
        return null;
    }
    if (platform === 'linux' && !isMusl()) {
        if (arch === 'x64') return 'linux-x64-gnu';
        if (arch === 'arm64') return 'linux-arm64-gnu';
    }
    return null;
};

export function getBinName(platform: string) {
    const ext = platform.includes('windows')
        ? 'dll'
        : platform.includes('darwin')
        ? 'dylib'
        : platform.includes('wasm')
        ? 'wasm'
        : 'so';
    const fileName = `libffi-${platform}.${ext}`;
    return fileName;
}
