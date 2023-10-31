import { resource } from '@cn-ui/reactive';
import linkURL from '../style/baseFont.css?url';
import { StyleForFont } from '../components/createStyleForFont';

const VFTest = () => {
    const fontWeight = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    return (
        <section
            style={{
                'font-size': '48px',
            }}
        >
            <section class="vf-base">
                {fontWeight.map((i) => {
                    return (
                        <div
                            style={{
                                'font-family': 'SourceHanSerifSC-VF-base',
                                'font-variation-settings': '"wght" ' + i,
                            }}
                        >
                            这是一个可变字体
                        </div>
                    );
                })}
            </section>
            <section class="vf-demo">
                {fontWeight.map((i) => {
                    return (
                        <div
                            style={{
                                'font-family': 'SourceHanSerifSC-VF-demo',
                                'font-variation-settings': '"wght" ' + i,
                            }}
                        >
                            这是一个可变字体
                        </div>
                    );
                })}
            </section>

            <StyleForFont
                url="./temp/font/SourceHanSerifSC-VF.otf"
                fontFamily="SourceHanSerifSC-VF-base"
            ></StyleForFont>
            <link
                rel="stylesheet"
                href="./temp/SourceHanSerifSC-VF/result.css"
            />
        </section>
    );
};

export const Article = () => {
    return (
        <>
            <VFTest></VFTest>
            <SimpleText></SimpleText>
        </>
    );
};
export const SimpleText = () => {
    const testText =
        'cn-font-split 是中文网字计划 所使用的字体分包工具，通过高性能的各种技术将庞大的字体包拆分为适合网络分发的版本。经过四个版本的字体研究与代码迭代，这项技术在我们的网站中得到了充分的应用，实现了中文字体在 Web 领域的加载速度与效率的双飞跃。';
    const models = [
        {
            source: './node/',
        },
        {
            source: './deno/',
        },
    ];
    return (
        <section style="font-size: 24px">
            <FontRenderRow
                index={-1}
                source={''}
                testText={testText}
                link={linkURL}
                familyName="Smiley Sans Oblique"
            ></FontRenderRow>
            {models.map((i, index) => {
                return (
                    <FontRenderRow
                        index={index}
                        source={i.source}
                        testText={testText}
                    ></FontRenderRow>
                );
            })}
        </section>
    );
};

const FontRenderRow = (props: {
    source: string;
    index: number;
    link?: string;
    familyName?: string;
    testText: string;
}) => {
    const familyName =
        props.familyName ?? 'i' + crypto.randomUUID().replace(/\-/g, '');
    const text = resource(
        () => {
            return fetch(props.source + 'result.css')
                .then((res) => res.text())
                .then((res) => {
                    return res
                        .replace(/Smiley\sSans\sOblique/g, familyName)
                        .replace(
                            /\.\//g,
                            new URL(props.source, location.href).toString(),
                        );
                })
                .then((res) => {
                    const blob = new Blob([res]);
                    return URL.createObjectURL(blob);
                });
        },
        { immediately: false },
    );
    if (props.link) {
        text(props.link);
    } else {
        text.refetch();
    }
    return (
        <div class="example-font">
            <span style={{ 'font-family': familyName }}>{props.testText}</span>
            <link rel="stylesheet" href={text()} />
        </div>
    );
};
