import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ARTIFACT_CONFIG_KEYS,
    hashBundleConfig,
    stableStringify,
} from '../src/utils/configHash.ts';

test('对象键顺序不影响 hash（同一份配置同一份 hash）', () => {
    const a = {
        css: { fontDisplay: 'swap', fontFamily: 'Demo' },
        chunkSize: 1024,
        previewImage: { text: '你好', name: 'preview' },
    };
    const b = {
        previewImage: { name: 'preview', text: '你好' },
        chunkSize: 1024,
        css: { fontFamily: 'Demo', fontDisplay: 'swap' },
    };
    assert.equal(hashBundleConfig(a), hashBundleConfig(b));
    assert.match(hashBundleConfig(a), /^[0-9a-f]{32}$/);
});

test('改 css.fontDisplay 后 hash 变化', () => {
    const base = { css: { fontDisplay: 'optional' }, chunkSize: 1024 };
    const changed = { css: { fontDisplay: 'swap' }, chunkSize: 1024 };
    assert.notEqual(hashBundleConfig(base), hashBundleConfig(changed));
});

test('产物相关配置任一变化都会改变 hash', () => {
    const base = { css: { fontDisplay: 'swap' }, chunkSize: 1024 };
    const baseHash = hashBundleConfig(base);
    const cases = {
        css: { ...base, css: { fontDisplay: 'swap', compress: true } },
        targetType: { ...base, targetType: 'woff2' },
        chunkSize: { ...base, chunkSize: 2048 },
        chunkSizeTolerance: { ...base, chunkSizeTolerance: 0 },
        maxAllowSubsetsCount: { ...base, maxAllowSubsetsCount: 10 },
        testHtml: { ...base, testHtml: true },
        reporter: { ...base, reporter: false },
        previewImage: { ...base, previewImage: { text: 'a', name: 'a' } },
        renameOutputFont: { ...base, renameOutputFont: '[hash].[ext]' },
        languageAreas: { ...base, languageAreas: false },
        fontFeature: { ...base, fontFeature: false },
        reduceMins: { ...base, reduceMins: false },
        autoSubset: { ...base, autoSubset: false },
        subsetRemainChars: { ...base, subsetRemainChars: false },
        subsetChunkSize: { ...base, subsetChunkSize: 100 },
    };
    // 白名单里的每一项都要在用例里覆盖到，避免新增字段忘了测试
    assert.deepEqual(
        Object.keys(cases).sort(),
        [...ARTIFACT_CONFIG_KEYS].sort(),
    );
    for (const [key, config] of Object.entries(cases)) {
        assert.notEqual(
            hashBundleConfig(config),
            baseHash,
            `${key} 变化后 hash 应变化`,
        );
    }
});

test('不影响产物内容的配置不参与 hash', () => {
    const base = { css: { fontDisplay: 'swap' } };
    const baseHash = hashBundleConfig(base);
    const irrelevant = {
        ...base,
        cacheDir: 'node_modules/.vite',
        server: false,
        scanFiles: { default: ['./index.html'] },
        ignore: ['node_modules/**'],
        whiteList: '你好',
        emptyCacheDir: true,
        include: [/\.ttf/],
        exclude: [/node_modules/],
        multiThreads: false,
        buildMode: 'default',
    };
    assert.equal(hashBundleConfig(irrelevant), baseHash);
});

test('stableStringify：键排序、丢弃 undefined', () => {
    assert.equal(
        stableStringify({ b: 1, a: { d: 2, c: undefined } }),
        '{"a":{"d":2},"b":1}',
    );
    assert.equal(stableStringify({ a: undefined }), '{}');
    assert.equal(stableStringify([{ b: 1, a: 2 }]), '[{"a":2,"b":1}]');
});
