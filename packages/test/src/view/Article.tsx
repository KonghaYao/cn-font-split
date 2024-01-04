import { reflect, resource } from '@cn-ui/reactive';
import linkURL from '../style/baseFont.css?url';
import { StyleForFont } from '../components/createStyleForFont';
import { Match, Switch, createMemo, useContext } from 'solid-js';
import { RouteContext } from '../simpleRoute';
import '../style/baseFn.css';
export const Article = () => {
    const route = useContext(RouteContext);
    const showingType = createMemo(
        () => route?.route().searchParams.get('type'),
    );
    return (
        <Switch>
            <Match when={showingType() === 'vf'}>
                <VFTest></VFTest>
            </Match>
            <Match when={showingType() === 'multi-platform'}>
                <SimpleText></SimpleText>
            </Match>
            <Match when={showingType() === 'noto-color-emoji'}>
                <NotoColorEmoji></NotoColorEmoji>
            </Match>
        </Switch>
    );
};

const NotoColorEmoji = () => {
    const data = resource<EmojiGroup[]>(() =>
        fetch(
            'https://jsdelivr.deno.dev/gh/googlefonts/emoji-metadata@main/emoji_15_0_ordering.json',
        ).then((res) => res.json()),
    );
    const route = useContext(RouteContext);
    const groupName = createMemo(
        () => route?.route().searchParams.get('group'),
    );
    const info = reflect(() => {
        const item = data()?.find((i) => i.group === groupName());
        if (item) return [item];
        return data();
    });
    return (
        <div class="flex gap-2">
            <StyleForFont
                fontFamily={'NotoColorEmoji'}
                url={'./temp/font/NotoColorEmoji.ttf'}
            ></StyleForFont>
            <link rel="stylesheet" href={`./temp/NotoColorEmoji/result.css`} />
            <div class="noto-color-emoji-base flex-1">
                <Emoji
                    data={info()}
                    fontFamily="NotoColorEmoji"
                    suffix="base"
                ></Emoji>
            </div>
            <div class="noto-color-emoji-demo flex-1">
                <Emoji
                    data={info()}
                    fontFamily="NotoColorEmoji-demo"
                    suffix="demo"
                ></Emoji>
            </div>
        </div>
    );
};

type EmojiGroup = {
    group: string;
    emoji: {
        base: number[];
        alternates: number[][];
        emoticons: string[];
        shortcodes: string[];
    }[];
};
const Emoji = (props: {
    data: EmojiGroup[];
    fontFamily: string;
    suffix: string;
}) => (
    <>
        {(props.data ?? []).map((i) => {
            return (
                <section>
                    <h3> {i.group}</h3>
                    <ul
                        id={i.group.replace(/\s/g, '-') + '-' + props.suffix}
                        style={{
                            'font-family': props.fontFamily,
                        }}
                    >
                        {i.emoji.map((emoji) => {
                            return (
                                <span>
                                    {emoji.base
                                        .map((ii) => String.fromCodePoint(ii))
                                        .join('')}
                                    {emoji.alternates.map((emoji) =>
                                        emoji
                                            .map((ii) =>
                                                String.fromCodePoint(ii),
                                            )
                                            .join(''),
                                    )}
                                </span>
                            );
                        })}
                    </ul>
                </section>
            );
        })}
    </>
);

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
                            测试代码, 这是一段关于 Variable Font 的测试文本
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
                            测试代码, 这是一段关于 Variable Font 的测试文本
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
