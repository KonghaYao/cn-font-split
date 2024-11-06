import {
    fontSplit,
    Assets,
    DenoAdapter,
} from 'https://cdn.jsdelivr.net/npm/cn-font-split@6.0.0-0/dist/cn-font-split.browser.js';

Assets.pathTransform = (innerPath) =>
    innerPath.replace(
        './',
        'https://cdn.jsdelivr.net/npm/cn-font-split@6.0.0-0/dist/',
    );
await DenoAdapter();
export { fontSplit };
