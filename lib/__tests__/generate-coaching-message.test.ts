/* eslint-disable no-undef */
import {
  buildMetricsSummary,
  type MetricsInput,
  CoachingNotesSchema,
} from "../generate-coaching-message";

describe("buildMetricsSummary", () => {
  const fullMetrics: MetricsInput = {
    latestWeight: 180.5,
    weightChange: -2.3,
    avgCalories: 2100,
    avgProtein: 155,
    avgDailySteps: 9500,
    avgSleep: 7.2,
    totalWorkouts: 4,
    scheduledWorkouts: 5,
    workoutDays: 4,
  };

  it("includes all metrics when all are present", () => {
    const summary = buildMetricsSummary(fullMetrics);
    expect(summary).toContain("180.5 lbs");
    expect(summary).toContain("-2.3 lbs");
    expect(summary).toContain("4 completed out of 5 scheduled");
    expect(summary).toContain("2100");
    expect(summary).toContain("155g");
    expect(summary).toContain("9,500");
    expect(summary).toContain("7.2 hrs");
  });

  it("returns 'No tracking data available' when all metrics are null/zero", () => {
    const emptyMetrics: MetricsInput = {
      latestWeight: null,
      weightChange: null,
      avgCalories: null,
      avgProtein: null,
      avgDailySteps: null,
      avgSleep: null,
      totalWorkouts: 0,
      scheduledWorkouts: 0,
      workoutDays: 0,
    };
    const summary = buildMetricsSummary(emptyMetrics);
    expect(summary).toContain("None logged");
  });

  it("handles partial metrics", () => {
    const partial: MetricsInput = {
      latestWeight: 175.0,
      weightChange: null,
      avgCalories: null,
      avgProtein: null,
      avgDailySteps: null,
      avgSleep: null,
      totalWorkouts: 3,
      scheduledWorkouts: 0,
      workoutDays: 3,
    };
    const summary = buildMetricsSummary(partial);
    expect(summary).toContain("175.0 lbs");
    expect(summary).toContain("3 completed (3 training days)");
    expect(summary).not.toContain("calories");
    expect(summary).not.toContain("protein");
  });

  it("shows positive weight change with + prefix", () => {
    const gaining: MetricsInput = {
      ...fullMetrics,
      weightChange: 1.5,
    };
    const summary = buildMetricsSummary(gaining);
    expect(summary).toContain("+1.5 lbs");
  });
});

describe("CoachingNotesSchema", () => {
  it("validates valid coaching notes", () => {
    const valid = {
      summary: "Client is on track",
      keyInsights: ["Good workout consistency"],
      actionItems: ["Increase protein"],
      checkInMessage: "Great week!",
    };
    expect(() => CoachingNotesSchema.parse(valid)).not.toThrow();
  });

  it("rejects missing fields", () => {
    const invalid = {
      summary: "Client is on track",
    };
    expect(() => CoachingNotesSchema.parse(invalid)).toThrow();
  });
});
