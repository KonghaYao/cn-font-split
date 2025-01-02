#!/usr/bin/env node
import { Command } from 'commander';
import { getCliParams } from './gen/proto.js';
import { runInitScript } from './init.js';

getCliParams(process.argv, (program, run) => {
    run.action(async (data) => {
        let fontSplit;
        if (process.versions.bun) {
            fontSplit = (await import('./bun/index.js')).fontSplit;
        } else {
            fontSplit = (await import('./node/index.js')).fontSplit;
        }
        await fontSplit(data);
    });
    program
        .usage(
            '\ncn-font-split -i <字体地址> -o <文件夹地址>\ncn-font-split run -h # 查看更详细信息',
        )
        .description('')
        .addCommand(
            new Command('i')
                .description('安装指定源 wasm32-wasip1@版本号')
                // .option('-f, --force', '强制下载源')
                .action(async () => {
                    await runInitScript();
                }),
        )
        .addCommand(
            new Command('ls')
                .description('列出本地和远程信息')
                .action(async () => {
                    await runInitScript();
                }),
        );
});
