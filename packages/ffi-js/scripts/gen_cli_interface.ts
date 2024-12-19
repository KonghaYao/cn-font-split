import protobuf from 'protobufjs';
import fs from 'fs';

function main() {
    const buf = fs.readFileSync('../../crates/proto/src/index.proto', 'utf-8');
    const proto = protobuf.parse(buf);
    const template = proto.root.lookup('InputTemplate')!;
    console.log();
    const { fields, nested } = template.toJSON();
    const importHeader = `import { toInt, toFloat, toFile, HandleRepeated } from "./parser";
import { Command } from 'commander';
const program = new Command();
`;

    console.log(fields);
    const params = `program` + createFlatDefine(fields).join('\n    ');

    function createFlatDefine(fields: any, parentKey = ''): string[] {
        return Object.entries<any>(fields).flatMap(([key, value]): string[] => {
            let isOption = value.options?.proto3_optional ?? false;
            if (parentKey) isOption = true;
            const comment = '';
            const defaultValue = null;
            if (Object.keys(nested).includes(value.type)) {
                console.log(value.type);
                return createFlatDefine(
                    nested[value.type].fields,
                    key + '.',
                ) as string[];
            }
            let parser;
            let placeholder = ` <${value.type}>`;
            if (value.type.startsWith('int')) {
                parser = 'toInt';
            } else if (value.type.startsWith('float')) {
                parser = 'toFloat';
            } else if (value.type.startsWith('bytes')) {
                parser = 'toFile';
            } else if (value.type === 'bool') {
                placeholder = '';
            }
            if (value.rule === 'repeated' && parser) {
                parser = `HandleRepeated(${parser})`;
                isOption = true;
            }
            return [
                `.${isOption ? 'option' : 'requiredOption'}('--${
                    parentKey + key
                }${placeholder}',"${comment}"${parser ? ',' + parser : ''}${
                    defaultValue ? ',' + defaultValue : ''
                })`,
            ];
        });
    }
    return (
        importHeader +
        params +
        `\nexport const getCliParams = (argv: string[], extraFn?: (cm: Command) => void) => { extraFn && extraFn(program); return program.parse(argv) };`
    );
}
fs.writeFileSync('./scripts/getCliParams.ts', main());
