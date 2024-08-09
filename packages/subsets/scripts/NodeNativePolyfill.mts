export function NodeNativePolyfill(nodeReplacer: Record<string, string>) {
    const isNodeModule = (key: string) => key.startsWith('node:');

    const loadNodeModule = (key: string) => {
        key = key.replace('node:', '');
        if (key in nodeReplacer) {
            return `
import A from "${nodeReplacer[key]}";
export default A;
export * from "${nodeReplacer[key]}"`;
        }
        return `export default '';
export const promisify = '';`;
    };
    return {
        load(id: string) {
            if (isNodeModule(id)) {
                return loadNodeModule(id);
            }
        },
    };
}
