import './App.css';
import { SimpleRouter } from './simpleRoute';
import { Component, lazy } from 'solid-js';
export function Lazy<T extends Component<any>, Key extends string = 'default'>(
    fn: () => Promise<{ [k in Key]: T }>,
    key: Key = 'default' as Key,
): T & { preload: () => Promise<{ default: T }> } {
    return lazy(() =>
        fn().then((res) => {
            return { default: res[key] };
        }),
    );
}
export default () => {
    return (
        <section class="clear-font-features">
            <a href="/">
                <h1>这是 cn-font-type 的测试系统</h1>
            </a>
            <SimpleRouter
                routes={{
                    index: Lazy(() => import('./view/Index'), 'Index'),
                    '/feature': Lazy(
                        () => import('./view/Feature'),
                        'FeatureList',
                    ),
                    '/article': Lazy(() => import('./view/Article'), 'Article'),
                }}
            ></SimpleRouter>
        </section>
    );
};
