/**
 * Utility functions for weight-related calculations
 * Used by ShareProgressModal and ShareWeightProgressChart components
 */

export interface WeightDataPoint {
  date: string;
  weight: number;
}

export interface AvgWeightChangeResult {
  avgChangePerWeek: number;
  totalChange: number;
  weeksBetween: number;
  firstWeight: number;
  lastWeight: number;
  firstDate: string;
  lastDate: string;
}

/**
 * Calculate the average weight change per week from a list of weight measurements.
 *
 * This function:
 * 1. Filters to only entries with weight > 0
 * 2. Uses the first and last weight measurements
 * 3. Calculates actual calendar time between them
 * 4. Returns the change per week
 *
 * @param weightData - Array of weight data points with date and weight
 * @returns AvgWeightChangeResult with all calculation details, or null if insufficient data
 */
export function calculateAvgWeightChangePerWeek(
  weightData: WeightDataPoint[]
): AvgWeightChangeResult | null {
  // Filter to only entries with actual weight data
  const dataWithWeight = weightData.filter(d => d.weight > 0);

  // Need at least 2 data points to calculate change
  if (dataWithWeight.length < 2) {
    return null;
  }

  const firstWeight = dataWithWeight[0].weight;
  const lastWeight = dataWithWeight[dataWithWeight.length - 1].weight;
  const firstDate = dataWithWeight[0].date;
  const lastDate = dataWithWeight[dataWithWeight.length - 1].date;

  // Calculate time span
  const firstDateTime = new Date(firstDate).getTime();
  const lastDateTime = new Date(lastDate).getTime();
  const daysBetween = (lastDateTime - firstDateTime) / (1000 * 60 * 60 * 24);
  const weeksBetween = daysBetween / 7;

  // Handle edge case where all measurements are on the same day
  if (weeksBetween <= 0) {
    return {
      avgChangePerWeek: 0,
      totalChange: lastWeight - firstWeight,
      weeksBetween: 0,
      firstWeight,
      lastWeight,
      firstDate,
      lastDate
    };
  }

  const totalChange = lastWeight - firstWeight;
  const avgChangePerWeek = totalChange / weeksBetween;

  return {
    avgChangePerWeek,
    totalChange,
    weeksBetween,
    firstWeight,
    lastWeight,
    firstDate,
    lastDate
  };
}

/**
 * Convert weight from lbs to kg
 */
export function convertLbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Convert weight based on unit preference
 */
export function convertWeight(
  weight: number,
  unitPreference: 'lbs' | 'kg'
): number {
  return unitPreference === 'kg' ? convertLbsToKg(weight) : weight;
}
