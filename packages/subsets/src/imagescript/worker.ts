

import { makeImage as mk } from './image.local'
import { Transfer, worker } from 'workerpool'

//ifdef browser
import { DenoAdapter } from '../adapter/deno';
import '../adapter/browser/URL.shim' // 为了防止全局状态中 base 出现 blob 而导致的 URL 解析错误
await DenoAdapter();
//endif


worker({
    async makeImage(ttfFile, text, level) {
        // console.log('多线程模式')
        const res = await mk(ttfFile, text, level)

        return new Transfer(res, [res.buffer])

    }
})