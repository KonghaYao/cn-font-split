import { FontAnalyze } from '../dist/index.js';
import fse from 'fs-extra';
const file = await fse.readFile('../demo/public/SmileySans-Oblique.ttf');
const data = await FontAnalyze(file.buffer, {
    charsetLoader: (path) => {
        return fse.readJSON('./data/' + path);
    },
});
console.log(data);
await fse.outputJSON('./dist/analyze.json', data);
