import { fontSplit } from './node/index.js';
import { getCliParams } from './gen/proto.js';

const data = getCliParams(process.argv);
await fontSplit(data.opts());
