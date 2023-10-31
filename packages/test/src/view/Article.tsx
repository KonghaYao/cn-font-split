import { resource } from '@cn-ui/reactive';
import linkURL from '../style/baseFont.css?url';

export const Article = () => {
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
