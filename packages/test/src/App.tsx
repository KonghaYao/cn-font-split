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
        <SimpleRouter
            routes={{
                index: Lazy(() => import('./view/Feature'), 'FeatureList'),
                '/article': Lazy(() => import('./view/Article'), 'Article'),
            }}
        ></SimpleRouter>
    );
};
