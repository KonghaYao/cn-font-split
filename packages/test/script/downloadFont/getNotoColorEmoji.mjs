import { fontStore } from "../FileStore.mjs";
import fs from 'fs-extra'

await fontStore.isExist('NotoColorEmoji.ttf').then(async res => {
    if (res)
        return
    await fetch('https://jsdelivr.deno.dev/gh//googlefonts/noto-emoji/fonts/NotoColorEmoji.ttf').then(res => res.arrayBuffer()).then(buffer => {
        return fs.outputFileSync('./temp/font/NotoColorEmoji.ttf', new Uint8Array(buffer));
    })
})