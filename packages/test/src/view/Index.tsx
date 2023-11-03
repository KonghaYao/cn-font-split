import Features from '../../FeatureConfig.json';
export const Index = () => {
    return (
        <section>
            <details open>
                <summary style="display:flex">
                    <h2>Opentype Feature</h2>
                </summary>
                <p style="display:flex;gap:1rem;flex-wrap:wrap">
                    {Features.map((feature) => {
                        return (
                            <a href={'#/feature?feature=' + feature.featureKey}>
                                {feature.featureKey}
                            </a>
                        );
                    })}
                </p>
            </details>
            <details open>
                <summary style="display:flex">
                    <h2>文章特性测试</h2>
                </summary>
                <p style="display:flex;gap:1rem;flex-wrap:wrap">
                    {[
                        {
                            key: 'vf',
                            label: '可变字重',
                        },
                        {
                            key: 'multi-platform',
                            label: '多平台打包结果测试',
                        },
                    ].map((i) => {
                        return (
                            <a href={'#/article?type=' + i.key}>{i.label}</a>
                        );
                    })}
                </p>
            </details>
        </section>
    );
};
