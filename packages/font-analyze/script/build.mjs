import fs from 'fs-extra';
const data = fs.readFileSync('./dist/Charset/defaultCharsetLoader.js', 'utf-8');
const paths = fs.readdirSync('./data');
const res = data.replace(
    "const { default: D } = await import('../data/' + path);",
    `
let D
${paths
    .map((i) => {
        return `
if(path==='${i}'){
    D = await import('../data/${i}')
}
`;
    })
    .join('')}

`,
);
fs.writeFileSync('./dist/Charset/defaultCharsetLoader.js', res, 'utf-8');
