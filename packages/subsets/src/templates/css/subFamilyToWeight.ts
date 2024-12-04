const doubleFontWeightName = new Map([
    ['extra light', 200],
    ['ultra light', 200],
    ['extra bold', 800],
    ['ultra bold', 800],
    ['semi bold', 600],
    ['demi bold', 600],
]);
const singleFontWeightName = new Map([
    ['thin', 100],
    ['hairline', 100],
    ['light', 300],
    ['normal', 400],
    ['regular', 400],
    ['medium', 500],
    ['bold', 700],
    ['heavy', 900],
    ['black', 900],
]);

export const subFamilyToWeight = (str: string) => {
    str = str.toLowerCase();
    const name = [...doubleFontWeightName.keys()].find((i) => str.includes(i));
    if (name) return doubleFontWeightName.get(name);
    const singleName = [...singleFontWeightName.keys()].find((i) =>
        str.includes(i),
    );
    if (singleName) return singleFontWeightName.get(singleName);
    return 400;
};
