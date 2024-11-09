fetch('http://0.0.0.0:8000/css2?family=test.ttf')
    .then((res) => res.text())
    .then((res) => {
        console.log(res);
    });
