// 在 preinstall 阶段校验包管理器，避免使用 npm/yarn 安装导致依赖树错误。
// 只依赖 Node 内置能力，保证在依赖安装完成前也能运行。
const userAgent = process.env.npm_config_user_agent ?? '';
const isPnpm = /^pnpm\//.test(userAgent);

if (!isPnpm) {
    console.error('请使用 pnpm 安装依赖：pnpm install');
    console.error(`当前包管理器：${userAgent || 'unknown'}`);
    process.exit(1);
}
