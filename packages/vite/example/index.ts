// import '../src/font.d'
import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets';
document.body.innerHTML = JSON.stringify(css, null, 4);
document.body.style.fontFamily = `"${css.family}"`
export const a = 1;
