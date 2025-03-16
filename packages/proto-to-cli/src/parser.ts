import fs from 'fs-extra';
type CommonParser<T> = (value: string, previous: T) => T;
export const toInt: CommonParser<number> = (value, dummyPrevious) => {
    // parseInt 参数为字符串和进制数
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        throw new Error(dummyPrevious + 'Not a number.');
    }
    return parsedValue;
};
export const toFloat: CommonParser<number> = (value, dummyPrevious) => {
    // parseInt 参数为字符串和进制数
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) {
        throw new Error(dummyPrevious + 'Not a number.');
    }
    return parsedValue;
};
export const toFile: CommonParser<Uint8Array> = (value, dummyPrevious) => {
    return new Uint8Array(fs.readFileSync(value).buffer);
};
export const toBoolean: CommonParser<boolean> = (value, dummyPrevious) => {
    if (typeof value === 'string') {
        if (value.toLocaleLowerCase() === 'true') {
            return true;
        }
        if (value.toLocaleLowerCase() === 'false') {
            return false;
        }
        return true;
    }
    return value;
};

export const HandleRepeated =
    <T>(fn: CommonParser<T>): CommonParser<T[]> =>
    (value, dummyPrevious) => {
        return value
            .split(',')
            .map((v) => v.trim())
            .map((i) => fn(i, dummyPrevious[0]));
    };
