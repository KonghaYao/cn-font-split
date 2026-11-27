import crypto from 'crypto';
import type { BundlePluginConfig } from '../subset/index.js';

/**
 * 会把内容写进产物的配置字段（白名单）。
 *
 * 字段名沿用 `packages/ffi-js` 的 `FontSplitProps`（proto InputTemplate 的 camelCase），
 * 逐项核对过 `toInputTemplateInit` 的白名单。
 *
 * 不在此列表的配置，要么由缓存路径承载（`cacheDir` / `outDir` / 字体文件名），
 * 要么不影响产物字节：
 * - `server` / `emptyCacheDir`：只控制插件是否执行构建与是否清空缓存
 * - `include` / `exclude`：只决定哪些文件交给插件处理
 * - `scanFiles` / `ignore` / `whiteList`：影响的是码点集合，已由码点哈希体现
 * - `multiThreads`：Rust 侧保证并行与顺序构建产物相同
 * - `buildMode`：当前只接受省略 / 空串 / "default"，取值唯一
 */
export const ARTIFACT_CONFIG_KEYS = [
    'css',
    'targetType',
    'chunkSize',
    'chunkSizeTolerance',
    'maxAllowSubsetsCount',
    'testHtml',
    'reporter',
    'previewImage',
    'renameOutputFont',
    'languageAreas',
    'fontFeature',
    'reduceMins',
    'autoSubset',
    'subsetRemainChars',
    'subsetChunkSize',
] as const;

/** 把值递归归一化成「对象键有序、无 undefined」的普通结构 */
function normalize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'function' || typeof value === 'symbol') {
            return undefined;
        }
        if (typeof value === 'number' && !Number.isFinite(value)) {
            return String(value);
        }
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalize(item) ?? null);
    }
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
        const item = normalize(record[key]);
        if (item !== undefined) normalized[key] = item;
    }
    return normalized;
}

/**
 * 确定性序列化：同一份配置永远得到同一个字符串，
 * 且对象键顺序、值为 undefined 的键都不影响结果。
 */
export function stableStringify(value: unknown): string {
    return JSON.stringify(normalize(value)) ?? 'null';
}

/** 按白名单提取会影响产物的配置 */
export function getArtifactConfig(
    config: BundlePluginConfig,
): Record<string, unknown> {
    const picked: Record<string, unknown> = {};
    const record = config as Record<string, unknown>;
    for (const key of ARTIFACT_CONFIG_KEYS) {
        if (record[key] !== undefined) picked[key] = record[key];
    }
    return picked;
}

/**
 * 产物配置哈希：参与缓存目录命名，配置变化后必然重新构建，
 * 不会命中旧配置生成的 result.css / 字体分包。
 */
export function hashBundleConfig(config: BundlePluginConfig): string {
    return crypto
        .createHash('md5')
        .update(stableStringify(getArtifactConfig(config)))
        .digest('hex');
}
