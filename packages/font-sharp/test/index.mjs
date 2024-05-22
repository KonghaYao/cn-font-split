import fs from 'fs'
import { font2svg } from '..'

const ttfFile = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf')
const svg = await font2svg(new Uint8Array(ttfFile))
fs.writeFileSync('./temp.svg', svg)
