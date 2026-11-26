import { existsSync as fsExistsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * `resolveBinPath` 的可注入依赖。默认值都取自当前进程 / 当前模块，
 * 只有单元测试需要覆盖它们来构造临时目录或模拟解析失败。
 */
export interface ResolveBinPathOptions {
    /** 环境变量来源，默认 `process.env` */
    env?: Record<string, string | undefined>;
    /** 平台，默认 `process.platform` */
    platform?: string;
    /** 架构，默认 `process.arch` */
    arch?: string;
    /** musl 判定，默认恒为 false；Node / Bun 应传入真实实现 */
    isMusl?: () => boolean;
    /** 模块 URL，决定 `createRequire` 的基准与本地 dist 位置，默认 `import.meta.url` */
    moduleUrl?: string;
    /** 本地开发回退目录，默认 `<moduleUrl 所在目录>/../dist` */
    distDir?: string;
    /** 平台包解析实现，默认 `createRequire(moduleUrl).resolve` */
    resolve?: (specifier: string) => string;
    /** 文件存在性判定，默认 `fs.existsSync` */
    exists?: (filePath: string) => boolean;
}

const toErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

function createResolver(moduleUrl: string) {
    const req = createRequire(moduleUrl);
    return (specifier: string) => req.resolve(specifier);
}

/**
 * 解析动态库路径，Node / Bun / Deno 共用。优先级：
 * 1. `CN_FONT_SPLIT_BIN` 覆盖（最高优先级，即使平台包存在）
 * 2. `@cn-font-split/<platform>` 平台包（optionalDependencies）
 * 3. 仓库内 `dist/libffi-<target>.<ext>` 回退（本地开发）
 *
 * 全部失败时抛错，错误信息列出当前平台与所有尝试过的包名 / 路径。
 * 注意：musl / android / 32 位等没有预编译平台包，只能靠 `CN_FONT_SPLIT_BIN` 覆盖。
 */
export const resolveBinPath = (options: ResolveBinPathOptions = {}): string => {
    const env = options.env ?? process.env;
    const platform = options.platform ?? process.platform;
    const arch = options.arch ?? process.arch;
    const isMusl = options.isMusl ?? (() => false);
    const exists = options.exists ?? fsExistsSync;
    const moduleUrl = options.moduleUrl ?? import.meta.url;
    const moduleDir = path.dirname(fileURLToPath(moduleUrl));
    const distDir = options.distDir ?? path.resolve(moduleDir, '../dist');
    const resolve = options.resolve ?? createResolver(moduleUrl);

    // 1. 环境变量覆盖，直接返回，不做文件存在性校验（保持原有行为）。
    const override = env.CN_FONT_SPLIT_BIN;
    if (override) return override;

    const musl = isMusl();
    const triple = matchPlatform(platform, arch, () => musl);
    const packageKey = getPlatformPackageName(platform, arch, () => musl);
    const binName = getBinName(triple);
    const tried: string[] = ['CN_FONT_SPLIT_BIN（未设置）'];

    // 2. 平台包：解析到包内入口后再拼库文件名。
    const packageName = packageKey ? `@cn-font-split/${packageKey}` : null;
    if (packageName) {
        try {
            const resolved = resolve(packageName);
            const candidate = path.join(path.dirname(resolved), binName);
            if (exists(candidate)) return candidate;
            if (exists(resolved)) return resolved;
            tried.push(
                `${packageName} → ${candidate}（平台包内缺少 ${binName}）`,
            );
        } catch (error) {
            tried.push(
                `${packageName}（平台包未安装或无法解析：${toErrorMessage(
                    error,
                )}）`,
            );
        }
    }

    // 3. 本地开发回退：仓库内 dist/libffi-<target>.<ext>。
    const localPath = path.join(distDir, binName);
    if (exists(localPath)) return localPath;
    tried.push(`${localPath}（本地开发回退，不存在）`);

    const platformLabel = packageName
        ? `${platform}-${arch}（Rust target：${triple}，平台包：${packageName}）`
        : `${platform}-${arch}（Rust target：${triple}，无预编译平台包）`;
    const installHint = packageName
        ? `请安装对应的可选平台包：npm install ${packageName}`
        : `当前平台 ${platform}-${arch} 没有预编译平台包（musl / android / 32 位等），` +
          `只能通过 CN_FONT_SPLIT_BIN 指向自编译的 libffi 动态库。`;

    throw new Error(
        `cn-font-split 找不到可用的动态库。\n` +
            `当前平台：${platformLabel}\n` +
            `已尝试：\n${tried.map((item) => `  - ${item}`).join('\n')}\n` +
            `${installHint}\n` +
            `也可以用 CN_FONT_SPLIT_BIN 指向 libffi 动态库。`,
    );
};
