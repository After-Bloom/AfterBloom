// Weight-for-age reference lines (kg) by completed month, 0 to 12 months. APPROXIMATE values in the shape of the WHO Child Growth
// Standards (3rd, 50th and 97th percentile). Verify against the official WHO tables before launch.
// The chart only shows the trend. It never says "malnourished" or gives any verdict: that is a doctor's judgement.
export type Sex = "boy" | "girl";
export const WEIGHT_REF: Record<Sex, { p3: number[]; p50: number[]; p97: number[] }> = {
  boy: {
    p3: [2.5, 3.4, 4.4, 5.1, 5.6, 6.1, 6.4, 6.7, 7.0, 7.2, 7.5, 7.7, 7.8],
    p50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6],
    p97: [4.3, 5.8, 7.1, 8.0, 8.7, 9.3, 9.8, 10.3, 10.7, 11.0, 11.4, 11.7, 12.0],
  },
  girl: {
    p3: [2.4, 3.2, 4.0, 4.6, 5.1, 5.5, 5.8, 6.1, 6.3, 6.6, 6.8, 7.0, 7.1],
    p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9],
    p97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8, 9.3, 9.8, 10.2, 10.5, 10.9, 11.2, 11.5],
  },
};
export const ageMonths = (birth: string, on: string) => Math.max(0, (new Date(on).getTime() - new Date(birth).getTime()) / (30.4375 * 86400000));
