import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import childProcess from "child_process";
const { platform, arch } = process;

let nativeBinding!: { decode: (b: Buffer) => Buffer };
let loadError = null;
function isMusl() {
    // For Node 10
    if (!process.report || typeof process.report.getReport !== "function") {
        try {
            const lddPath = childProcess
                .execSync("which ldd")
                .toString()
                .trim();
            return readFileSync(lddPath, "utf8").includes("musl");
        } catch (e) {
            return true;
        }
    } else {
        /** @ts-ignore */
        const { glibcVersionRuntime } = process.report.getReport().header;
        return !glibcVersionRuntime;
    }
}

switch (platform) {
    case "android":
        switch (arch) {
            case "arm64":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-android-arm64"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            case "arm":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-android-arm-eabi"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            default:
                throw new Error(`Unsupported architecture on Android ${arch}`);
        }
        break;
    case "win32":
        switch (arch) {
            case "x64":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-win32-x64-msvc"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            case "ia32":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-win32-ia32-msvc"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            case "arm64":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-win32-arm64-msvc"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            default:
                throw new Error(`Unsupported architecture on Windows: ${arch}`);
        }
        break;
    case "darwin":
        try {
            nativeBinding = createRequire(import.meta.url)(
                "@woff2/woff2-rs-darwin-universal"
            );
            break;
        } catch {}
        switch (arch) {
            case "x64":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-darwin-x64"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            case "arm64":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-darwin-arm64"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            default:
                throw new Error(`Unsupported architecture on macOS: ${arch}`);
        }
        break;
    case "freebsd":
        if (arch !== "x64") {
            throw new Error(`Unsupported architecture on FreeBSD: ${arch}`);
        }
        try {
            nativeBinding = createRequire(import.meta.url)(
                "@woff2/woff2-rs-freebsd-x64"
            );
        } catch (e) {
            loadError = e;
        }
        break;
    case "linux":
        switch (arch) {
            case "x64":
                if (isMusl()) {
                    try {
                        nativeBinding = createRequire(import.meta.url)(
                            "@woff2/woff2-rs-linux-x64-musl"
                        );
                    } catch (e) {
                        loadError = e;
                    }
                } else {
                    try {
                        nativeBinding = createRequire(import.meta.url)(
                            "@woff2/woff2-rs-linux-x64-gnu"
                        );
                    } catch (e) {
                        loadError = e;
                    }
                }
                break;
            case "arm64":
                if (isMusl()) {
                    try {
                        nativeBinding = createRequire(import.meta.url)(
                            "@woff2/woff2-rs-linux-arm64-musl"
                        );
                    } catch (e) {
                        loadError = e;
                    }
                } else {
                    try {
                        nativeBinding = createRequire(import.meta.url)(
                            "@woff2/woff2-rs-linux-arm64-gnu"
                        );
                    } catch (e) {
                        loadError = e;
                    }
                }
                break;
            case "arm":
                try {
                    nativeBinding = createRequire(import.meta.url)(
                        "@woff2/woff2-rs-linux-arm-gnueabihf"
                    );
                } catch (e) {
                    loadError = e;
                }
                break;
            default:
                throw new Error(`Unsupported architecture on Linux: ${arch}`);
        }
        break;
    default:
        throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
}

if (!nativeBinding) {
    if (loadError) {
        throw loadError;
    }
    throw new Error(`Failed to load native binding`);
}

export default nativeBinding;
