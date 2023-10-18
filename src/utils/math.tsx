export function linearRegressionLeastSquares(x_values: number[], y_values: number[]) {
    const x_sum = x_values.reduce((a, b) => a + b, 0);
    const y_sum = y_values.reduce((a, b) => a + b, 0);
    const x_squared_sum = x_values.reduce((a, b) => a + b * b, 0);
    const xy_sum = x_values.reduce((a, b, i) => a + b * y_values[i], 0);
    const n = x_values.length;
    const m = (n * xy_sum - x_sum * y_sum) / (n * x_squared_sum - x_sum * x_sum);
    const b = (y_sum - m * x_sum) / n;
    return { m, b };
}
