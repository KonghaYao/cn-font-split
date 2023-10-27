import Features from '../FeatureConfig.json';
const corsRoot = 'https://cors-cdn.deno.dev?url=';
const colorSet = ['#000000', '#00af6c'];
export const FeatureList = () => {
    return (
        <section style="font-size:32px">
            <header>Feature 测试</header>
            <div>
                {Features.map((i) => {
                    return (
                        <details open class={i.featureKey + '_total'}>
                            <summary>{i.featureKey}</summary>
                            {[i.featureKey, i.featureKey + '-demo'].map(
                                (fontFamily) => {
                                    return (
                                        <div>
                                            <header style={{ color: 'gray' }}>
                                                {fontFamily}
                                            </header>
                                            <section
                                                class={fontFamily}
                                                style={`font-family:"${fontFamily}";width:fit-content;`}
                                            >
                                                {(
                                                    i.featureValues ?? [
                                                        'off',
                                                        'on',
                                                    ]
                                                ).map((val, index) => {
                                                    return (
                                                        <p
                                                            style={{
                                                                color: colorSet[
                                                                    index
                                                                ],
                                                                direction:
                                                                    i.direction ??
                                                                    'initial',
                                                                'font-feature-settings': `"${i.featureKey}" ${val}`,
                                                            }}
                                                            lang={i.lang}
                                                        >
                                                            {i.splitText}
                                                        </p>
                                                    );
                                                })}
                                            </section>
                                        </div>
                                    );
                                }
                            )}

                            {/* 加载原始字体 */}
                            <style>
                                {` @font-face {font-family: '${
                                    i.featureKey
                                }';src: url(${corsRoot + i.fontLink});}`}
                            </style>
                            {/** 加载打包后字体 */}
                            <link
                                rel="stylesheet"
                                href={`./temp/${i.featureKey}/result.css`}
                            />
                        </details>
                    );
                })}
            </div>
        </section>
    );
};
