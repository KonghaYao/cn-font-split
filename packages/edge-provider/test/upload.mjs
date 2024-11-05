import fs from 'fs';
fetch('http://localhost:3000/upload?filename=test.ttf', {
    method: 'post',
    body: fs.readFileSync('../demo/public/SmileySans-Oblique.ttf').buffer,
})
    .then((res) => res.text())
    .then((res) => {
        console.log(res);
    });
