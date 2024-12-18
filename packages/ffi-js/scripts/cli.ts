import { fontSplit } from '../dist/bun';
import { getCliParams } from './getCliParams';

const data = getCliParams(process.argv);
await fontSplit(data.opts());
