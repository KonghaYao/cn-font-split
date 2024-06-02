#! /usr/bin/env node
import { fontSplit, VERSION_CN_FONT_SPLIT } from '../dist/index.js';
import fs from 'fs';
import mri from 'mri';
const temp = mri(process.argv.slice(2), {
    alias: {
        i: 'FontPath',
        input: 'FontPath',
        output: 'destFold',
        o: 'destFold',
        d: 'destFold',
        h: 'help',
    },
});

const input = {};
Object.entries(temp).map(([k, v]) => {
    if (k.includes('.')) {
        const paths = k.split('.');
        let tempInput = input;
        paths.forEach((i, index) => {
            if (!tempInput[i]) {
                tempInput[i] = {};
            }
            if (index === paths.length - 1) {
                tempInput[i] = stringToValue(v);
            } else {
                tempInput = tempInput[i];
            }
        });
    } else {
        input[k] = stringToValue(v);
    }
});

if (input.help) {
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
    console.log(VERSION_CN_FONT_SPLIT);
    if (input.FontPath && input.destFold) {
        fontSplit(input).catch((e) => console.log('error !!!!!: ', e.message));
    } else {
        console.log('Error: -i or -o must be filled!');
    }
}

function stringToValue(val) {
    if (typeof va === 'string') {
        if (val.toLowerCase() === 'true') {
            return true;
        } else if (val.toLowerCase() === 'false') {
            return false;
        } else if ('1234567890'.includes(val[0])) {
            return +val;
        }
    }
    return val;
}
