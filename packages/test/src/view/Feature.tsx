import { useContext } from 'solid-js';
import Features from '../../FeatureConfig.json';
import { StyleForFont } from '../components/createStyleForFont';
import { RouteContext } from '../simpleRoute';
import { AbsoluteLayout } from '../components/AbsoluteLayout';
const colorSet = [
    ['#00af6c', '#00af6c'],
    ['#2f06c2', '#2f01d2'],
];
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
                    const isTest = route?.route().searchParams.get('test');
                    const renderArea = [
                        i.featureKey,
                        hb && i.featureKey + '-hb',
                        wasm && i.featureKey + '-hb-wasm',
                        !hb && !wasm && i.featureKey + '-demo',
                    ].filter(Boolean);
                    return (
                        <details open class={i.featureKey + '_total'}>
                            <summary>{i.featureKey}</summary>
                            {renderArea.map((fontFamily, level) => {
                                return (
                                    <AbsoluteLayout
                                        render={() =>
                                            (
                                                i.featureValues ?? ['off', 'on']
                                            ).map((val, index) => {
                                                return (
                                                    <div
                                                        class={[
                                                            'clear-font-style',
                                                            fontFamily +
                                                                '-' +
                                                                val,
                                                        ].join(' ')}
                                                        style={{
                                                            'font-family': `"${fontFamily}"`,
                                                            padding: '10px',
                                                            'font-size':
                                                                (i.fontSize ??
                                                                    48) + 'px',
                                                            color:
                                                                !isTest &&
                                                                colorSet[level][
                                                                    index
                                                                ],

                                                            height: i.height,
                                                            'line-height':
                                                                level === 1 &&
                                                                i.lineHeight,
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
                                                    </div>
                                                );
                                            })
                                        }
                                    ></AbsoluteLayout>
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
