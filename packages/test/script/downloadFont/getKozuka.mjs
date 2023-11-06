import { fontStore } from "../FileStore.mjs";
import JSZip from 'jszip'
import fs from 'fs-extra'
const commonHeader = {
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
}
await fontStore.isExist('Kozuka Mincho Pro.otf').then(async res => {
    if (res)
        return
    const { data: { url } } = await fetch("https://www.fonts.net.cn/font-download.html", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            ...commonHeader
        },
        "referrer": "https://www.fonts.net.cn/font-34110358882.html",
        "body": "id=34110358882&type=font&ver=new",
        "method": "POST",
    }).then(res => res.json())

    await fetch('https:' + url, { headers: commonHeader }).then(res => res.arrayBuffer()).then((buffer) => {
        return JSZip.loadAsync(new Uint8Array(buffer))
    }).then(zip => {
        return zip.files['XiaoMingChaoTiPro/XiaoMingChaoPro-B-6.otf'].async('arraybuffer')
    }).then(buffer => {
        return fs.outputFileSync('./temp/font/Kozuka Mincho Pro.otf', new Uint8Array(buffer));
    })
})