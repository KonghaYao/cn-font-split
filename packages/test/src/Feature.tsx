import Features from '../FeatureConfig.json';
const corsRoot = 'https://cors-cdn.deno.dev?url=';
const colorSet = ['#000000', '#00af6c'];
export const FeatureList = () => {
    return (
        <section style="font-size:32px">
            <header>Feature 测试</header>
            <ul>
                {Features.map((i) => {
                    return (
                        <li class={i.featureKey}>
                            {[i.outputKey, i.outputKey + '-demo'].map(
                                (fontFamily) => {
                                    return (
                                        <div
                                            class={fontFamily}
                                            style={`font-family:"${fontFamily}";width:fit-content`}
                                        >
                                            <ul>
                                                {(
                                                    i.featureValues ?? [
                                                        'off',
                                                        'on',
                                                    ]
                                                ).map((val, index) => {
                                                    return (
                                                        <li
                                                            style={`color:${colorSet[index]};font-feature-settings: "${i.featureKey}" ${val};`}
                                                        >
                                                            {i.splitText}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                }
                            )}

                            {/* 加载原始字体 */}
                            <style>
                                {` @font-face {font-family: '${
                                    i.outputKey
                                }';src: url(${corsRoot + i.fontLink});}`}
                            </style>
                            {/** 加载打包后字体 */}
                            <link
                                rel="stylesheet"
                                href={`./temp/${i.outputKey}/result.css`}
                            />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
