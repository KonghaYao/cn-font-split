import fs from 'fs-extra';
import _ from 'lodash-es';
import { fontSplit, convert } from 'cn-font-split';
import grpc from '@grpc/grpc-js';

const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();
import { font_services } from '../../subsets-rs/packages/ffi/gen/services';
import { api_interface } from '../../subsets-rs/packages/ffi/gen/index';

features.forEach((i) => {
    if (allKey.has(i.featureKey)) throw new Error('重复键 ' + i.featureKey);
    allKey.add(i.featureKey);
});

const client = new font_services.FontApiClient(
    '127.0.0.1:50051',
    grpc.credentials.createInsecure(),
    {
        'grpc.max_send_message_length': 100 * 1024 * 1024,
        'grpc.max_receive_message_length': 100 * 1024 * 1024,
        'grpc.max_connection_age_ms': 60 * 1000,
        'grpc.max_concurrent_streams': 10,
        'grpc.default_compression_algorithm': 2,
    },
);

// fs.emptyDirSync('./temp');
for await (const i of features) {
    // if (i.featureKey !== 'vrt2') continue;
    // if (fs.existsSync('./temp/' + i.featureKey)) continue
    const buffer = fs.readFileSync(
        './temp/' +
            i.featureKey +
            '/' +
            i.featureKey +
            i.fontLink.replace(/.*\.(.*?)/g, '.$1'),
    );
    const b = await convert(new Uint8Array(buffer), 'ttf');
    const startTime = performance.now();
    console.log(i.featureKey);

    const stream = client.FontSplit(
        new api_interface.InputTemplate({
            out_dir: './temp/' + i.featureKey,
            input: b,
            css: new api_interface.InputTemplate.CssProperties({
                font_family: i.featureKey + '-demo',
                // comment: {
                //     base: false,
                //     name_table: false,
                //     unicodes: true,
                // },
            }),
        }),
        {},
    );
    let count = 0;
    await stream.forEach((e: api_interface.EventMessage) => {
        if (e.event === 1) {
            count++;
            fs.writeFile('./temp/' + i.featureKey + '/' + e.message, e.data);
        }
    });
    console.log(
        'end',
        i.featureKey,
        count,
        Math.round(b.length / 1024),
        Math.round(performance.now() - startTime),
    );
}
client.close();
