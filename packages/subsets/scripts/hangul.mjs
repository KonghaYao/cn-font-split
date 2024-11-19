// 处理韩文字符频率分布
// 来源 http://nlp.kookmin.ac.kr/data/syl-2.txt
import fs from 'fs-extra'
const data = fs.readFileSync('./scripts/syl-2.txt', 'utf-8')
const content = data.split('=====================================')[1]
const chars = content.split('\n').map(i => i.split(' ')[0]).filter(Boolean)
// console.log(chars);
fs.writeFileSync('./data/hangul-syl.dat', new Uint16Array(chars.map(i => i.codePointAt(0))))