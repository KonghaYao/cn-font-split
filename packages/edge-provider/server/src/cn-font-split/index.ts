import {
    fontSplit,
    Assets,
    DenoAdapter,
} from 'cn-font-split/dist/cn-font-split.browser.js';

Assets.pathTransform = (innerPath) =>
    innerPath.replace('./', '../subsets/dist/');
await DenoAdapter();
export { fontSplit };
