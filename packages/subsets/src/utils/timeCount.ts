export const timeRecordFormat = (start: number, end: number) => {
    return (end - start).toFixed(0) + "ms";
};
