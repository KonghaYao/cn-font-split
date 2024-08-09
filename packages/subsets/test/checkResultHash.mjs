import fs from 'fs'
import crypto from 'crypto'
// 获取文件夹下面的所有 .woff2 结尾文件，并全部进行 hash


export const getWoff2Hash = (root) => {

    const files = fs.readdirSync(root)
    const hash = crypto.createHash('sha256')
    files.filter(file => file.endsWith('.woff2')).map(file => {
        hash.update(file)

    })
    return hash.digest('hex')
}

console.log([getWoff2Hash('./temp/bun')
    , getWoff2Hash('./temp/deno')
    , getWoff2Hash('./temp/node')].join('\n')
)