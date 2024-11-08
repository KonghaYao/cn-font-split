import fs from 'fs';
const b = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
fetch('http://localhost:8787/woff2', {
    method: 'post',
    body: b,
})
    .then((res) => {
        return res.arrayBuffer();
    })
    .then((res) => {
        fs.writeFileSync('./a.woff2', new Uint8Array(res));
    });
