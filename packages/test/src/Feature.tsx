import Features from '../FeatureConfig.json';

export const FeatureList = () => {
    return (
        <section>
            <header>Feature 测试</header>
            <ul>
                {Features.map((i) => {
                    return (
                        <li
                            class={i.featureKey}
                            style={`font-feature-settings: "${i.featureKey}";`}
                        >
                            <div>{i.featureKey}</div>
                            <div
                                class={i.featureKey + ' test'}
                                style={`font-family:"${i.outputKey}"`}
                            >
                                {i.splitText}
                            </div>
                            <div
                                class={i.featureKey + ' demo'}
                                style={`font-family:"${i.outputKey + '-demo'}"`}
                            >
                                {i.splitText}
                            </div>
                            <style>
                                {` @font-face {
  font-family: '${i.outputKey}';
  src: url(${i.fontLink});
}`}
                            </style>
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
