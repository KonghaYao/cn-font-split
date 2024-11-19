import { Assets } from '../../adapter/assets';
export const createTestHTML = () => {
    return Assets.loadFileAsync('template.html');
};
