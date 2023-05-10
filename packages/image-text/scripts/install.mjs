import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import childProcess from "child_process";
const { platform, arch } = process;
const checkRequire = (root) => {
    return (tag) => {
        try {
            createRequire(root)(tag);
            console.log("@woff2 检测到依赖 ", tag);
        } catch (e) {
            console.log("@woff2 缺失依赖 ", tag);
            childProcess.exec(
                "npm install -D " + tag,
                (error, stdout, stderr) => {
                    if (error) {
                        console.log(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.log(`stderr: ${stderr}`);
                        return;
                    }
                    console.log(`stdout: ${stdout}`);
                }
            );
        }
    };
};
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
                checkRequire(import.meta.url)("@woff2/woff2-rs-android-arm64");

                break;
            case "arm":
                checkRequire(import.meta.url)(
                    "@woff2/woff2-rs-android-arm-eabi"
                );

                break;
            default:
                throw new Error(`Unsupported architecture on Android ${arch}`);
        }
        break;
    case "win32":
        switch (arch) {
            case "x64":
                checkRequire(import.meta.url)("@woff2/woff2-rs-win32-x64-msvc");

                break;
            case "ia32":
                checkRequire(import.meta.url)(
                    "@woff2/woff2-rs-win32-ia32-msvc"
                );

                break;
            case "arm64":
                checkRequire(import.meta.url)(
                    "@woff2/woff2-rs-win32-arm64-msvc"
                );

                break;
            default:
                throw new Error(`Unsupported architecture on Windows: ${arch}`);
        }
        break;
    case "darwin":
        checkRequire(import.meta.url)("@woff2/woff2-rs-darwin-universal");

        switch (arch) {
            case "x64":
                checkRequire(import.meta.url)("@woff2/woff2-rs-darwin-x64");

            case "arm64":
                checkRequire(import.meta.url)("@woff2/woff2-rs-darwin-arm64");

                break;
            default:
                throw new Error(`Unsupported architecture on macOS: ${arch}`);
        }
        break;
    case "freebsd":
        if (arch !== "x64") {
            throw new Error(`Unsupported architecture on FreeBSD: ${arch}`);
        }
        checkRequire(import.meta.url)("@woff2/woff2-rs-freebsd-x64");

        break;
    case "linux":
        switch (arch) {
            case "x64":
                if (isMusl()) {
                    checkRequire(import.meta.url)(
                        "@woff2/woff2-rs-linux-x64-musl"
                    );
                } else {
                    checkRequire(import.meta.url)(
                        "@woff2/woff2-rs-linux-x64-gnu"
                    );
                }
                break;
            case "arm64":
                if (isMusl()) {
                    checkRequire(import.meta.url)(
                        "@woff2/woff2-rs-linux-arm64-musl"
                    );
                } else {
                    checkRequire(import.meta.url)(
                        "@woff2/woff2-rs-linux-arm64-gnu"
                    );
                }
                break;
            case "arm":
                checkRequire(import.meta.url)(
                    "@woff2/woff2-rs-linux-arm-gnueabihf"
                );

                break;
            default:
                throw new Error(`Unsupported architecture on Linux: ${arch}`);
        }
        break;
    default:
        throw new Error(`Unsupported OS: ${platform}, architecture: ${arch}`);
}
