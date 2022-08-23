// read font file
import { Font } from "fonteditor-core";
import { readFileSync } from "fs";
let buffer = readFileSync("./fonts/SourceHanSerifCN-Bold.ttf");
console.time("开始创建对象");
let font = Font.create(buffer, {
    type: "ttf", // support ttf, woff, woff2, eot, otf, svg
    hinting: true, // save font hinting
    compound2simple: false, // transform ttf compound glyf to simple
    inflate: null, // inflate function for woff
    combinePath: false, // for svg path
});
let fontObject = font.get();
console.timeEnd("开始创建对象");

const obj = { ...fontObject, glyf: font.find({ unicode: [97, 98, 99] }) };
// for (const key in fontObject) {
//     const Type = Object.prototype.toString.call(fontObject[key]);
//     console.log(key, Type, Object.keys(fontObject[key]).length);
// }
console.log(obj.glyf[0]);
const B = font.readEmpty().set(obj).write({
    type: "ttf",
});
console.log(B);
/* => [ 'version',
  'numTables',
  'searchRenge',
  'entrySelector',
  'rengeShift',
  'head',
  'maxp',
  'glyf',
  'cmap',
  'name',
  'hhea',
  'post',
  'OS/2',
  'fpgm',
  'cvt',
  'prep'
]
*/
