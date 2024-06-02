export function findOutliers(
    origin_data: number[][],
    data: number[],
    threshold = 3,
) {
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const std = Math.sqrt(
        data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
            (data.length - 1),
    );
    const outliers: number[][] = [];
    const bigger: number[][] = [];
    for (let index = 0; index < data.length; index++) {
        const value = data[index];
        const zScore = (value - mean) / std;
        if (zScore < -threshold) {
            outliers.push(origin_data[index]);
        } else {
            bigger.push(origin_data[index]);
        }
    }

    return [outliers, bigger, mean] as const;
}
