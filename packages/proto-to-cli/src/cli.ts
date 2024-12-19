import { Command } from 'commander';
import { genCommanderCode } from './adapter/genCommanderCode';
import { outputFile } from 'fs-extra';
const program = new Command();
program
    .requiredOption('-i, --input <path>', 'proto file path')
    .requiredOption('-t --target <target_name>', 'target to gen', 'commander')
    .requiredOption('-m, --message_name <name>', 'message name in proto')
    .requiredOption('-o, --output <path>', 'path to gen file');
const data = program.parse(process.argv).opts();
// console.log(data);

export type Adapter = (filePath: string, messageName: string) => string;
const adapters: Record<string, Adapter> = {
    commander: genCommanderCode,
};
if (!adapters[data.target])
    throw new Error(`${data.target} target not support`);
const file = adapters[data.target](data.input, data.message_name);
outputFile(data.output, file);
