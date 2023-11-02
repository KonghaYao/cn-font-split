import fs from 'fs-extra';
import _ from 'lodash-es';
import { fontStore } from './FileStore.mjs';

[
    {
        url: 'https://github.com/adobe-fonts/source-han-serif/raw/release/Variable/OTF/SourceHanSerifSC-VF.otf',
        key: 'SourceHanSerifSC-VF',
    },
].map((i) =>
    fontStore.get(i.url).then((resPath) => {
        fs.createSymlinkSync(
            resPath,
            './temp/font/' + i.key + i.fontLink.replace(/.*\.(.*?)/g, '.$1'),
            'file',
        );
    }),
);
fs.copyFileSync(
    '../demo/public/SmileySans-Oblique.ttf',
    './temp/font/SmileySans-Oblique.ttf',
);
