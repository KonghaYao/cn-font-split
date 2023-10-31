import Features from '../../FeatureConfig.json';
import { StyleForFont } from '../components/createStyleForFont';
const colorSet = ['#000000', '#00af6c'];
export const FeatureList = () => {
    return (
        <section>
            <header>Feature 测试</header>
            <div>
                {Features.map((i) => {
                    const folderHead = `./temp/${i.featureKey}/${i.featureKey}`;
                    return (
                        <details open class={i.featureKey + '_total'}>
                            <summary>{i.featureKey}</summary>
                            {[
                                i.featureKey,
                                // i.featureKey + '-hb',
                                // i.featureKey + '-hb-wasm',
                                i.featureKey + '-demo',
                            ].map((fontFamily) => {
                                return (
                                    <div>
                                        <header style={{ color: 'gray' }}>
                                            {fontFamily}
                                        </header>
                                        <section
                                            class={fontFamily}
                                            style={`font-family:"${fontFamily}";`}
                                        >
                                            {(
                                                i.featureValues ?? ['off', 'on']
                                            ).map((val, index) => {
                                                return (
                                                    <div
                                                        style={{
                                                            'font-size':
                                                                (i.fontSize ??
                                                                    48) + 'px',
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
                                                    </div>
                                                );
                                            })}
                                        </section>
                                    </div>
                                );
                            })}

                            {/* 加载原始字体 */}
                            <StyleForFont
                                fontFamily={i.featureKey}
                                url={
                                    folderHead +
                                    i.fontLink.replace(/.*\.(.*?)/g, '.$1')
                                }
                            ></StyleForFont>
                            {/* 加载hb切割对照 */}

                            <StyleForFont
                                fontFamily={i.featureKey + '-hb'}
                                url={folderHead + '-hb.ttf'}
                            ></StyleForFont>
                            {/* 加载hb wasm切割对照 */}
                            <StyleForFont
                                fontFamily={i.featureKey + '-hb-wasm'}
                                url={folderHead + '-hb-wasm.ttf'}
                            ></StyleForFont>
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
