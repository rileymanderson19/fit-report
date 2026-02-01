/**
 * Comprehensive test cases for weight change calculations
 *
 * These tests cover all edge cases and scenarios for the average weight
 * change per week calculation used in the Share Progress feature.
 *
 * To run: npm test (after setting up Jest)
 */

import {
  calculateAvgWeightChangePerWeek,
  convertWeight,
  convertLbsToKg,
  WeightDataPoint
} from '../weightCalculations';

describe('calculateAvgWeightChangePerWeek', () => {
  // ============================================================
  // BASIC FUNCTIONALITY TESTS
  // ============================================================

  describe('Basic Functionality', () => {
    it('should calculate weight loss over 2 weeks correctly', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-08', weight: 178 },
        { date: '2024-01-15', weight: 176 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(-4); // 176 - 180 = -4 lbs
      expect(result!.weeksBetween).toBe(2); // 14 days / 7 = 2 weeks
      expect(result!.avgChangePerWeek).toBe(-2); // -4 lbs / 2 weeks = -2 lbs/wk
    });

    it('should calculate weight gain over 2 weeks correctly', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 176 },
        { date: '2024-01-15', weight: 178 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(2); // 178 - 176 = +2 lbs
      expect(result!.weeksBetween).toBe(2); // 14 days / 7 = 2 weeks
      expect(result!.avgChangePerWeek).toBe(1); // +2 lbs / 2 weeks = +1 lbs/wk
    });

    it('should calculate no change correctly (stable weight)', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-08', weight: 180 },
        { date: '2024-01-15', weight: 180 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(0);
      expect(result!.avgChangePerWeek).toBe(0);
    });

    it('should handle longer time periods (4 weeks)', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-29', weight: 175 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(-5); // 175 - 180 = -5 lbs
      expect(result!.weeksBetween).toBe(4); // 28 days / 7 = 4 weeks
      expect(result!.avgChangePerWeek).toBe(-1.25); // -5 lbs / 4 weeks = -1.25 lbs/wk
    });

    it('should handle short time periods (less than 1 week)', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-04', weight: 179 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(-1);
      expect(result!.weeksBetween).toBeCloseTo(3 / 7); // 3 days / 7 ≈ 0.43 weeks
      expect(result!.avgChangePerWeek).toBeCloseTo(-1 / (3 / 7)); // ≈ -2.33 lbs/wk
    });
  });

  // ============================================================
  // EDGE CASES - INSUFFICIENT DATA
  // ============================================================

  describe('Insufficient Data', () => {
    it('should return null for empty array', () => {
      const result = calculateAvgWeightChangePerWeek([]);
      expect(result).toBeNull();
    });

    it('should return null for single data point', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);
      expect(result).toBeNull();
    });

    it('should return null if all weights are 0', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 0 },
        { date: '2024-01-08', weight: 0 },
        { date: '2024-01-15', weight: 0 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);
      expect(result).toBeNull();
    });

    it('should return null if only one entry has weight > 0', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 0 },
        { date: '2024-01-08', weight: 180 },
        { date: '2024-01-15', weight: 0 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // EDGE CASES - SPARSE DATA (THE BUG SCENARIO)
  // ============================================================

  describe('Sparse Data (Mixed with zero weights)', () => {
    it('should correctly filter out entries with weight = 0', () => {
      // This is the exact bug scenario:
      // Data has nutrition/steps entries without weight measurements
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-02', weight: 0 },  // No weight this day
        { date: '2024-01-03', weight: 0 },  // No weight this day
        { date: '2024-01-04', weight: 0 },  // No weight this day
        { date: '2024-01-05', weight: 0 },  // No weight this day
        { date: '2024-01-06', weight: 0 },  // No weight this day
        { date: '2024-01-07', weight: 0 },  // No weight this day
        { date: '2024-01-08', weight: 178 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.firstWeight).toBe(180);
      expect(result!.lastWeight).toBe(178);
      expect(result!.totalChange).toBe(-2);
      expect(result!.weeksBetween).toBe(1);
      expect(result!.avgChangePerWeek).toBe(-2);
    });

    it('should handle weight only at start and end of period', () => {
      // Weight measured on Jan 18 and Jan 30 only
      // Other days have steps/nutrition but no weight
      const data: WeightDataPoint[] = [
        { date: '2024-01-17', weight: 176.8 },
        { date: '2024-01-18', weight: 0 },
        { date: '2024-01-19', weight: 0 },
        { date: '2024-01-20', weight: 0 },
        { date: '2024-01-21', weight: 0 },
        { date: '2024-01-22', weight: 0 },
        { date: '2024-01-23', weight: 0 },
        { date: '2024-01-24', weight: 0 },
        { date: '2024-01-25', weight: 0 },
        { date: '2024-01-26', weight: 0 },
        { date: '2024-01-27', weight: 0 },
        { date: '2024-01-28', weight: 0 },
        { date: '2024-01-29', weight: 0 },
        { date: '2024-01-30', weight: 177.4 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.firstWeight).toBe(176.8);
      expect(result!.lastWeight).toBe(177.4);
      expect(result!.totalChange).toBeCloseTo(0.6);
      // 13 days / 7 = 1.857 weeks
      expect(result!.weeksBetween).toBeCloseTo(13 / 7);
      // 0.6 / 1.857 ≈ 0.32 lbs/wk
      expect(result!.avgChangePerWeek).toBeCloseTo(0.6 / (13 / 7));
    });

    it('should NOT produce -88.48 lbs/wk bug (the original issue)', () => {
      // Steve Hornick data from the bug report
      // Start: 176.8 lbs, Current: 177.4 lbs
      // Date range: Jan 18 - Jan 31 (about 2 weeks)
      // Expected: ~+0.3 lbs/wk
      // Bug was showing: -88.48 lbs/wk
      const data: WeightDataPoint[] = [
        { date: '2024-01-17', weight: 176.8 },
        { date: '2024-01-19', weight: 176.9 },
        { date: '2024-01-21', weight: 177.0 },
        { date: '2024-01-24', weight: 177.2 },
        { date: '2024-01-26', weight: 177.1 },
        { date: '2024-01-30', weight: 177.4 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // Should be small positive change, NOT -88.48
      expect(result!.avgChangePerWeek).toBeGreaterThan(-1);
      expect(result!.avgChangePerWeek).toBeLessThan(1);
      expect(Math.abs(result!.avgChangePerWeek)).toBeLessThan(5);
    });
  });

  // ============================================================
  // EDGE CASES - SAME DAY MEASUREMENTS
  // ============================================================

  describe('Same Day Measurements', () => {
    it('should return 0 avgChangePerWeek when all on same day', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-01', weight: 179 },
        { date: '2024-01-01', weight: 181 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // First is 180, last is 181
      expect(result!.totalChange).toBe(1);
      expect(result!.weeksBetween).toBe(0);
      expect(result!.avgChangePerWeek).toBe(0); // Can't divide by 0, return 0
    });
  });

  // ============================================================
  // REAL-WORLD SCENARIOS
  // ============================================================

  describe('Real-World Scenarios', () => {
    it('should handle Ben Kaup scenario: -5 lbs over 4 weeks', () => {
      // Ben Kaup: Start 272.8, Current 267.8, Jan 2 - Jan 31
      const data: WeightDataPoint[] = [
        { date: '2024-01-02', weight: 272.8 },
        { date: '2024-01-06', weight: 271.5 },
        { date: '2024-01-10', weight: 270.2 },
        { date: '2024-01-14', weight: 269.5 },
        { date: '2024-01-18', weight: 268.8 },
        { date: '2024-01-22', weight: 268.2 },
        { date: '2024-01-26', weight: 267.5 },
        { date: '2024-01-31', weight: 267.8 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.firstWeight).toBe(272.8);
      expect(result!.lastWeight).toBe(267.8);
      expect(result!.totalChange).toBe(-5);
      // 29 days / 7 ≈ 4.14 weeks
      expect(result!.weeksBetween).toBeCloseTo(29 / 7);
      // -5 / 4.14 ≈ -1.21 lbs/wk
      expect(result!.avgChangePerWeek).toBeCloseTo(-5 / (29 / 7), 1);
    });

    it('should handle fluctuating weight with overall loss', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-03', weight: 181 }, // Up
        { date: '2024-01-05', weight: 179 }, // Down
        { date: '2024-01-07', weight: 180 }, // Up
        { date: '2024-01-09', weight: 178 }, // Down
        { date: '2024-01-11', weight: 179 }, // Up
        { date: '2024-01-13', weight: 177 }, // Down
        { date: '2024-01-15', weight: 176 }, // Final
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // Uses first (180) and last (176) only
      expect(result!.totalChange).toBe(-4);
      expect(result!.avgChangePerWeek).toBe(-2); // -4 / 2 weeks
    });

    it('should handle small changes that were causing sign errors', () => {
      // Small positive change that was showing as large negative
      const data: WeightDataPoint[] = [
        { date: '2024-01-18', weight: 176.8 },
        { date: '2024-01-31', weight: 177.4 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBeCloseTo(0.6);
      expect(result!.avgChangePerWeek).toBeGreaterThan(0); // Must be positive!
      // 13 days ≈ 1.86 weeks
      // 0.6 / 1.86 ≈ 0.32 lbs/wk
      expect(result!.avgChangePerWeek).toBeCloseTo(0.32, 1);
    });
  });

  // ============================================================
  // DATE PARSING TESTS
  // ============================================================

  describe('Date Parsing', () => {
    it('should handle ISO date strings (YYYY-MM-DD)', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-08', weight: 178 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.weeksBetween).toBe(1);
    });

    it('should handle dates at year boundary', () => {
      const data: WeightDataPoint[] = [
        { date: '2023-12-25', weight: 182 },
        { date: '2024-01-08', weight: 180 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(-2);
      expect(result!.weeksBetween).toBe(2); // 14 days
    });

    it('should handle leap year correctly', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-02-20', weight: 180 },
        { date: '2024-03-05', weight: 178 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // 2024 is a leap year: Feb 20 -> Feb 29 = 9 days, + Mar 1-5 = 5 days = 14 days
      expect(result!.weeksBetween).toBe(2);
    });
  });

  // ============================================================
  // UNIT CONVERSION TESTS
  // ============================================================

  describe('Unit Conversion', () => {
    it('should convert lbs to kg correctly', () => {
      expect(convertLbsToKg(1)).toBeCloseTo(0.453592);
      expect(convertLbsToKg(100)).toBeCloseTo(45.3592);
      expect(convertLbsToKg(180)).toBeCloseTo(81.6466);
    });

    it('should return lbs when unit preference is lbs', () => {
      expect(convertWeight(180, 'lbs')).toBe(180);
      expect(convertWeight(100, 'lbs')).toBe(100);
    });

    it('should convert to kg when unit preference is kg', () => {
      expect(convertWeight(180, 'kg')).toBeCloseTo(81.6466);
      expect(convertWeight(100, 'kg')).toBeCloseTo(45.3592);
    });

    it('should handle converting weight change per week', () => {
      // -2 lbs/wk should become approximately -0.91 kg/wk
      const changeInLbs = -2;
      const changeInKg = convertWeight(changeInLbs, 'kg');
      expect(changeInKg).toBeCloseTo(-0.907, 2);
    });
  });

  // ============================================================
  // BOUNDARY VALUE TESTS
  // ============================================================

  describe('Boundary Values', () => {
    it('should handle very large weights', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 500 },
        { date: '2024-01-08', weight: 495 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.avgChangePerWeek).toBe(-5);
    });

    it('should handle very small weights', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 50 },
        { date: '2024-01-08', weight: 49 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.avgChangePerWeek).toBe(-1);
    });

    it('should handle very small changes', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        { date: '2024-01-08', weight: 180.1 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBeCloseTo(0.1);
      expect(result!.avgChangePerWeek).toBeCloseTo(0.1);
    });

    it('should handle very long time periods', () => {
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 200 },
        { date: '2024-12-31', weight: 150 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      expect(result!.totalChange).toBe(-50);
      // 365 days / 7 ≈ 52.14 weeks
      expect(result!.avgChangePerWeek).toBeCloseTo(-50 / (365 / 7), 1);
    });
  });

  // ============================================================
  // REGRESSION TESTS (SPECIFIC BUG SCENARIOS)
  // ============================================================

  describe('Regression Tests', () => {
    it('REGRESSION: should not produce -67.62 lbs/wk (first bug report)', () => {
      // Ben Kaup original bug: showing -67.62 lbs/wk
      // when it should be ~-1.25 lbs/wk
      const data: WeightDataPoint[] = [
        { date: '2024-01-04', weight: 272.8 },
        { date: '2024-01-07', weight: 271.0 },
        { date: '2024-01-11', weight: 270.5 },
        { date: '2024-01-13', weight: 269.0 },
        { date: '2024-01-19', weight: 268.5 },
        { date: '2024-01-22', weight: 268.0 },
        { date: '2024-01-26', weight: 267.0 },
        { date: '2024-01-28', weight: 267.8 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // Total change should be around -5 lbs
      expect(result!.totalChange).toBe(-5);
      // Avg should be around -1.25 lbs/wk, NOT -67.62
      expect(Math.abs(result!.avgChangePerWeek)).toBeLessThan(5);
      expect(result!.avgChangePerWeek).toBeGreaterThan(-5);
    });

    it('REGRESSION: should not produce -88.48 lbs/wk (second bug report)', () => {
      // Steve Hornick bug: showing -88.48 lbs/wk
      // when it should be ~+0.3 lbs/wk
      const data: WeightDataPoint[] = [
        { date: '2024-01-17', weight: 176.8 },
        { date: '2024-01-19', weight: 177.0 },
        { date: '2024-01-21', weight: 176.9 },
        { date: '2024-01-24', weight: 178.0 },
        { date: '2024-01-26', weight: 177.0 },
        { date: '2024-01-30', weight: 177.4 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // Total change should be around +0.6 lbs
      expect(result!.totalChange).toBeCloseTo(0.6);
      // Avg should be around +0.3 lbs/wk, NOT -88.48
      expect(Math.abs(result!.avgChangePerWeek)).toBeLessThan(5);
      // Should be POSITIVE (gained weight)
      expect(result!.avgChangePerWeek).toBeGreaterThan(0);
    });

    it('REGRESSION: should handle weeks with no weight data', () => {
      // The bug was caused by weeklyAverages having entries with avgWeight = 0
      // This simulates that scenario
      const data: WeightDataPoint[] = [
        { date: '2024-01-01', weight: 180 },
        // Week 2 has no weight data (just nutrition/steps)
        { date: '2024-01-08', weight: 0 },
        { date: '2024-01-09', weight: 0 },
        { date: '2024-01-10', weight: 0 },
        { date: '2024-01-11', weight: 0 },
        { date: '2024-01-12', weight: 0 },
        { date: '2024-01-13', weight: 0 },
        { date: '2024-01-14', weight: 0 },
        // Week 3 has weight data
        { date: '2024-01-15', weight: 178 },
      ];

      const result = calculateAvgWeightChangePerWeek(data);

      expect(result).not.toBeNull();
      // Should use Jan 1 (180) and Jan 15 (178) only
      expect(result!.firstWeight).toBe(180);
      expect(result!.lastWeight).toBe(178);
      expect(result!.totalChange).toBe(-2);
      expect(result!.weeksBetween).toBe(2);
      expect(result!.avgChangePerWeek).toBe(-1);
    });
  });
});
