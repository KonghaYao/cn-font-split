#! /usr/bin/env node
import { fontSplit, VERSION_CN_FONT_SPLIT } from '../dist/index.js';
import fs from 'fs';
const args = process.argv.slice(2);

let input = {};
let help = false;
for (let i of args) {
    if (i.startsWith('-')) {
        const [, keysString, val] = i.match(/^[-]{1,2}(.*?)(=.*?)?$/i);
        if (['h', 'help'].some((i) => keysString === i)) help = true;

        let prev = input;
        const keys = keysString.split('.');
        for (const iterator of keys) {
            if (iterator === keys[keys.length - 1]) {
                if (!val) {
                    prev[iterator] = true;
                } else {
                    prev[iterator] = stringToValue(val.slice(1));
                }
                break;
            }
            if (!prev[iterator]) {
                prev[iterator] = {};
            }
            prev = prev[iterator];
        }
    }
}

if (help) {
    console.log(
        `//========== cn-font-split help ${VERSION_CN_FONT_SPLIT} ===========`,
    );
    console.log('    use . to set the input value.');
    console.log('    cn-font-split -i=./a.ttf -o=./dist');
    console.log('//==== more params ');
    console.log(
        fs
            .readFileSync(
                new URL('../src/interface.ts', import.meta.url),
                'utf-8',
            )
            .match(/(?<=InputTemplate = )([\s\S]+)/gm)[0],
    );
    console.log(
        `//========== cn-font-split help ${VERSION_CN_FONT_SPLIT} ===========`,
    );
} else {
    input.FontPath = input.FontPath || input.i || input.input;
    input.destFold = input.destFold || input.o || input.output || input.d;
    console.log(VERSION_CN_FONT_SPLIT);
    if (input.FontPath && input.destFold) {
        fontSplit(input);
    } else {
        console.log('Error: -i or -o must be filled!');
    }
}

function stringToValue(val) {
    if (val.toLowerCase() === 'true') {
        return true;
    } else if (val.toLowerCase() === 'false') {
        return false;
    } else if ('1234567890'.includes(val[0])) {
        return +val;
    }
    return val;
}
