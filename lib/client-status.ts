/**
 * Client status computation for the dashboard.
 * Processes stored report_data to derive status, summary, and key metrics per client.
 */

export type ClientStatus = 'on_track' | 'watch' | 'needs_attention' | 'no_data';

export interface ClientMetrics {
  latestWeight: number | null;
  weightChange: number | null;
  avgCalories: number | null;
  avgProtein: number | null;
  avgDailySteps: number | null;
  avgSleep: number | null;
  totalWorkouts: number;
  workoutDays: number;
}

export interface ClientStatusResult {
  status: ClientStatus;
  summary: string;
  metrics: ClientMetrics;
  lastReportDate: string | null;
  reportDateRange: { start: string; end: string } | null;
}

/**
 * Extract key metrics from raw report_data JSONB.
 */
function extractMetrics(reportData: any): ClientMetrics {
  const metrics: ClientMetrics = {
    latestWeight: null,
    weightChange: null,
    avgCalories: null,
    avgProtein: null,
    avgDailySteps: null,
    avgSleep: null,
    totalWorkouts: 0,
    workoutDays: 0,
  };

  // Weight from bodyStats
  const bodyStats = reportData?.bodyStats?.bodyStats;
  if (Array.isArray(bodyStats) && bodyStats.length > 0) {
    const sorted = [...bodyStats]
      .filter((s: any) => s.weight > 0)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length > 0) {
      metrics.latestWeight = sorted[sorted.length - 1].weight;
      if (sorted.length >= 2) {
        metrics.weightChange = sorted[sorted.length - 1].weight - sorted[0].weight;
      }
    }
  }

  // Nutrition averages
  const nutrition = reportData?.nutritionData?.nutrition;
  if (Array.isArray(nutrition) && nutrition.length > 0) {
    const withCalories = nutrition.filter((n: any) => n.calories > 0);
    if (withCalories.length > 0) {
      metrics.avgCalories = withCalories.reduce((sum: number, n: any) => sum + n.calories, 0) / withCalories.length;
    }
    const withProtein = nutrition.filter((n: any) => n.proteinGrams > 0);
    if (withProtein.length > 0) {
      metrics.avgProtein = withProtein.reduce((sum: number, n: any) => sum + n.proteinGrams, 0) / withProtein.length;
    }
  }

  // Steps from healthData
  const healthData = reportData?.healthData?.healthData;
  if (Array.isArray(healthData) && healthData.length > 0) {
    const withSteps = healthData.filter((h: any) => h.data?.steps > 0);
    if (withSteps.length > 0) {
      metrics.avgDailySteps = withSteps.reduce((sum: number, h: any) => sum + h.data.steps, 0) / withSteps.length;
    }
  }

  // Sleep
  const sleepData = reportData?.sleepData?.sleepData;
  if (Array.isArray(sleepData) && sleepData.length > 0) {
    const withSleep = sleepData.filter((s: any) => s.duration > 0);
    if (withSleep.length > 0) {
      metrics.avgSleep = withSleep.reduce((sum: number, s: any) => sum + s.duration, 0) / withSleep.length;
    }
  }

  // Workouts
  const workoutCalendar = reportData?.workoutData?.workoutCalendar;
  if (Array.isArray(workoutCalendar)) {
    const tracked = workoutCalendar.filter((w: any) => w.status === 'tracked');
    metrics.totalWorkouts = tracked.length;
    const uniqueDays = new Set(tracked.map((w: any) => new Date(w.date).toISOString().split('T')[0]));
    metrics.workoutDays = uniqueDays.size;
  }

  return metrics;
}

/**
 * Compute client status from their goal and extracted metrics.
 */
export function computeClientStatus(
  goal: 'fat_loss' | 'maintenance' | 'muscle_gain' | null,
  report: { report_data: any; date_range_start: string; date_range_end: string; created_at: string } | null
): ClientStatusResult {
  if (!report || !report.report_data) {
    return {
      status: 'no_data',
      summary: 'No report data available',
      metrics: {
        latestWeight: null, weightChange: null, avgCalories: null,
        avgProtein: null, avgDailySteps: null, avgSleep: null,
        totalWorkouts: 0, workoutDays: 0,
      },
      lastReportDate: null,
      reportDateRange: null,
    };
  }

  const metrics = extractMetrics(report.report_data);
  const concerns: string[] = [];
  const wins: string[] = [];

  // Check if there's actually any data
  const hasAnyData = metrics.latestWeight !== null || metrics.totalWorkouts > 0 ||
    metrics.avgCalories !== null || metrics.avgProtein !== null;

  if (!hasAnyData) {
    return {
      status: 'no_data',
      summary: 'No tracking data in latest report',
      metrics,
      lastReportDate: report.created_at,
      reportDateRange: { start: report.date_range_start, end: report.date_range_end },
    };
  }

  // Weight trend analysis based on goal
  if (metrics.weightChange !== null) {
    if (goal === 'fat_loss') {
      if (metrics.weightChange <= -0.5) {
        wins.push(`${Math.abs(metrics.weightChange).toFixed(1)} lbs lost`);
      } else if (metrics.weightChange > 1) {
        concerns.push(`Weight up ${metrics.weightChange.toFixed(1)} lbs`);
      } else if (metrics.weightChange > 0) {
        concerns.push('Weight slightly up');
      }
    } else if (goal === 'muscle_gain') {
      if (metrics.weightChange >= 0.3) {
        wins.push(`${metrics.weightChange.toFixed(1)} lbs gained`);
      } else if (metrics.weightChange < -1) {
        concerns.push(`Weight down ${Math.abs(metrics.weightChange).toFixed(1)} lbs`);
      }
    } else {
      // maintenance or no goal — flag large swings
      if (Math.abs(metrics.weightChange) > 2) {
        concerns.push(`Weight ${metrics.weightChange > 0 ? 'up' : 'down'} ${Math.abs(metrics.weightChange).toFixed(1)} lbs`);
      }
    }
  }

  // Workout check
  if (metrics.totalWorkouts >= 3) {
    wins.push(`${metrics.totalWorkouts} workouts`);
  } else if (metrics.totalWorkouts === 0) {
    concerns.push('No workouts logged');
  } else {
    concerns.push(`Only ${metrics.totalWorkouts} workout${metrics.totalWorkouts === 1 ? '' : 's'}`);
  }

  // Protein check (general threshold)
  if (metrics.avgProtein !== null) {
    if (metrics.avgProtein >= 100) {
      wins.push(`${Math.round(metrics.avgProtein)}g avg protein`);
    } else if (metrics.avgProtein < 80) {
      concerns.push(`Low protein (${Math.round(metrics.avgProtein)}g avg)`);
    }
  }

  // Sleep check
  if (metrics.avgSleep !== null && metrics.avgSleep < 6) {
    concerns.push(`Low sleep (${metrics.avgSleep.toFixed(1)} hrs avg)`);
  }

  // Determine status
  let status: ClientStatus;
  if (concerns.length === 0) {
    status = 'on_track';
  } else if (concerns.length <= 1) {
    status = 'watch';
  } else {
    status = 'needs_attention';
  }

  // Build summary line
  let summary: string;
  if (status === 'on_track') {
    summary = wins.length > 0 ? wins.join(' · ') : 'All metrics on track';
  } else if (status === 'needs_attention') {
    summary = concerns.join(' · ');
  } else {
    // watch: mix of wins and concerns
    const parts = [...concerns];
    if (wins.length > 0) parts.push(wins[0]);
    summary = parts.join(' · ');
  }

  return {
    status,
    summary,
    metrics,
    lastReportDate: report.created_at,
    reportDateRange: { start: report.date_range_start, end: report.date_range_end },
  };
}
