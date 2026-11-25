import { createRequire } from 'node:module';
import wrapper from '@konghayao/harfbuzzjs/hb.js';
import { Font2SVGOptions, makeImage } from './makeImage.js';

type HbjsFactory = (module: any) => any;

const require = createRequire(import.meta.url);

let hbjsFactory: HbjsFactory | undefined;

/**
 * 上游 `@konghayao/harfbuzzjs@9.0.5` 的 `hbjs.js` 只有 CJS 的 `module.exports = hbjs`，
 * 但包声明了 `"type": "module"`：静态 ESM import 会抛 `does not provide an export
 * named 'default'`，`createRequire` 直接 require 也只会得到空命名空间（赋值被包内的
 * `try { module.exports = hbjs } catch (e) {}` 吞掉）。
 * 这里用 `createRequire(import.meta.url)` 定位文件，再按 CJS 语义包一层同步求值。
 */
const loadHbjs = (): HbjsFactory => {
    if (hbjsFactory) return hbjsFactory;
    const filename = require.resolve('@konghayao/harfbuzzjs/hbjs.js');
    const source = require('node:fs').readFileSync(filename, 'utf8');
    const cjsModule: { exports: unknown } = { exports: {} };
    const factory = new Function(
        'exports',
        'require',
        'module',
        '__filename',
        '__dirname',
        `${source}\nreturn module.exports;`,
    );
    const exported = factory(
        cjsModule.exports,
        require,
        cjsModule,
        filename,
        require('node:path').dirname(filename),
    );
    if (typeof exported !== 'function') {
        throw new TypeError(
            '@konghayao/harfbuzzjs/hbjs.js 未导出 hbjs 工厂函数，上游打包方式可能已变更',
        );
    }
    hbjsFactory = exported as HbjsFactory;
    return hbjsFactory;
};

export const font2svg = async (
    ttfFile: Uint8Array,
    text: string,
    options?: Font2SVGOptions,
) => {
    const hb = loadHbjs()(await wrapper());
    const blob = hb.createBlob(ttfFile);
    const face = hb.createFace(blob, 0);
    blob.destroy();
    const font = hb.createFont(face);
    return makeImage(hb, font, text, options);
};
