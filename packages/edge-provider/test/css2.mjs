fetch('http://localhost:3000/css2?family=test.ttf')
    .then((res) => res.text())
    .then((res) => {
        console.log(res);
    });
