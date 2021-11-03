import codePoints from "code-points";
const getHexValue = (num) => {
    return num.toString(16).toUpperCase();
};

// 从输入字符串中抽取出 字符的 unicode 代码数组
export default (str) => {
    return codePoints(str, {
        unique: true,
    }).map((i) => `U+${getHexValue(i)}`);
};
