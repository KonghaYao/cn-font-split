// import {
//     fontSplit,
//     Assets,
//     DenoAdapter,
// } from 'http://0.0.0.0:8888/dist/cn-font-split.browser.js';

// Assets.pathTransform = (innerPath) =>
//     innerPath.replace(
//         './',
//         'http://0.0.0.0:8888/dist/',
//     );
import {
    fontSplit,
    Assets,
    DenoAdapter,
} from 'https://unpkg.com/cn-font-split@6.0.0/dist/cn-font-split.browser.js';

Assets.pathTransform = (innerPath) =>
    innerPath.replace('./', 'https://unpkg.com/cn-font-split@6.0.0/dist/');
await DenoAdapter();
export { fontSplit };
