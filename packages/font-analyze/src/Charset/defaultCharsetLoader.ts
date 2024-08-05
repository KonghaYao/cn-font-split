import { CharsetLoader } from './CharsetLoader.js';
export const defaultCharsetLoader: CharsetLoader = async (path) => {
    const { default: D } = await import('../data/' + path);
    return D;
};
