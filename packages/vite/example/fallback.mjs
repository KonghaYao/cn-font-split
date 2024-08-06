import { css, fontFamilyFallback } from '../../demo/public/SmileySans-Oblique.ttf';
document.body.style.fontFamily = fontFamilyFallback;
document.getElementById('text').style.fontFamily = `"${css.family}"`;
