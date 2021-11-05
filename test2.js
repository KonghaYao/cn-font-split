import Core, { Font } from "fonteditor-core";
import fs from "fs";
const file = fs.readFileSync("./fonts/站酷庆科黄油体.ttf");
const a = Font.create(file, {
    type: "ttf", // support ttf, woff, woff2, eot, otf, svg
    subset: [65, 66, 34, 938, 234], // only read `a`, `b` glyf
    hinting: true, // save font hinting
    compound2simple: true, // transform ttf compound glyf to simple
    inflate: null, // inflate function for woff
    combinePath: false, // for svg path
});
const obj = a.get();
console.log(Object.is(a.data, obj));
const gly = a.find({
    unicode: [65, 66, 34, 938, 234],
});
const gly2 = a.find({
    unicode: [65],
});

const new1 = new Font();
new1.set({ ...obj, glyf: gly });

const new2 = new Font();
new2.set({ ...obj, glyf: gly2 });

console.log(
    file.length,
    new1.write({ type: "ttf" }).length,
    new2.write({ type: "ttf" }).length
);
