import fs from 'fs'
const file = fs.readFileSync('./dist/unplugin.js', 'utf-8')

fs.writeFileSync('./dist/unplugin.js', file + '\nmodule.exports = fontPlugin;')