import { useContext } from 'solid-js';
import Features from '../../FeatureConfig.json';
import { StyleForFont } from '../components/createStyleForFont';
import { RouteContext } from '../simpleRoute';
const colorSet = ['#000000', '#00af6c'];
export const FeatureList = () => {
    const route = useContext(RouteContext);
    return (
        <section>
            <div>
                {Features.filter(
                    (i) =>
                        i.featureKey ===
                        route?.route().searchParams.get('feature'),
                ).map((i) => {
                    const folderHead = `./temp/${i.featureKey}/${i.featureKey}`;
                    const wasm = route?.route().searchParams.get('wasm');
                    const hb = route?.route().searchParams.get('hb');
                    return (
                        <details open class={i.featureKey + '_total'}>
                            <summary>{i.featureKey}</summary>
                            {[
                                i.featureKey,
                                hb && i.featureKey + '-hb',
                                wasm && i.featureKey + '-hb-wasm',
                                !hb && !wasm && i.featureKey + '-demo',
                            ]
                                .filter(Boolean)
                                .map((fontFamily) => {
                                    return (
                                        <div>
                                            <header style={{ color: 'gray' }}>
                                                {fontFamily}
                                            </header>
                                            <section
                                                class={fontFamily}
                                                style={{
                                                    'font-family': `"${fontFamily}"`,
                                                    width:
                                                        i.direction !== 'rtl' &&
                                                        'fit-content', // 竖排的时候，添加这个会导致 webkit 失去宽度
                                                    height: 'fit-content',
                                                }}
                                            >
                                                {(
                                                    i.featureValues ?? [
                                                        'off',
                                                        'on',
                                                    ]
                                                ).map((val, index) => {
                                                    return (
                                                        <p
                                                            class={[
                                                                'clear-font-style',
                                                                fontFamily +
                                                                    '-' +
                                                                    val,
                                                            ].join(' ')}
                                                            style={{
                                                                'font-size':
                                                                    (i.fontSize ??
                                                                        48) +
                                                                    'px',
                                                                color: colorSet[
                                                                    index
                                                                ],

                                                                height: i.height,
                                                                // width: '100%',
                                                                direction:
                                                                    i.direction ??
                                                                    'initial',
                                                                textOrientation:
                                                                    i[
                                                                        'text-orientation'
                                                                    ],
                                                                'writing-mode':
                                                                    i[
                                                                        'writing-mode'
                                                                    ],
                                                                'font-feature-settings':
                                                                    `"${i.featureKey}" ${val}` +
                                                                    ((i.withFeature &&
                                                                        ',' +
                                                                            i.withFeature
                                                                                .map(
                                                                                    (
                                                                                        f,
                                                                                    ) =>
                                                                                        `"${f}"`,
                                                                                )
                                                                                .join(
                                                                                    ',',
                                                                                )) ||
                                                                        ''),
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
