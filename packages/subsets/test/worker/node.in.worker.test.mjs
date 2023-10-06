import { fontSplit } from '../../dist/index.js';

import { parentPort } from 'worker_threads';
import { expose } from 'comlink';
import nodeEndpoint from 'comlink/dist/esm/node-adapter.mjs';
expose(
    {
        fontSplit,
    },
    nodeEndpoint(parentPort)
);
