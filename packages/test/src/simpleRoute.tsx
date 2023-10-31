import { Atom, atom, reflect } from '@cn-ui/reactive';
import { Component, createContext, createMemo, onCleanup } from 'solid-js';
import { Dynamic } from 'solid-js/web';
const useHashWatch = () => {
    const hash = atom(window.location.hash);
    function handleHashChange() {
        hash(window.location.hash);
    }
    window.addEventListener('hashchange', handleHashChange);
    onCleanup(() => {
        window.removeEventListener('hashchange', handleHashChange);
    });
    return { hash };
};

export const RouteContext = createContext<{ route: Atom<URL> }>();

export const SimpleRouter = (prop: {
    initRoute?: string;
    routes: Record<string, Component>;
}) => {
    const { hash } = useHashWatch();
    const route = reflect(() => new URL(hash().slice(1), location.toString()));
    const comp = createMemo(() => {
        const matchedRoute = prop.routes[route().pathname];
        if (!matchedRoute) {
            console.warn('路由匹配失败：', route());
            return prop.routes[prop.initRoute ?? 'index'];
        }
        return matchedRoute;
    });
    return (
        <RouteContext.Provider value={{ route }}>
            <Dynamic component={comp()}></Dynamic>
        </RouteContext.Provider>
    );
};
