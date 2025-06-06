import React from 'react';

interface DailyData {
  date: string;
  weight: number;
  steps: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sleepHours: number;
  workouts?: any[];
}

interface WeeklyAverage {
  weekStart: string;
  weekEnd: string;
  avgWeight: number;
  avgSteps: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgSleepHours: number;
}

interface EnhancedAnalyticsProps {
  dailyData: DailyData[];
  weeklyAverages: WeeklyAverage[];
  clientName: string;
}

export function EnhancedAnalytics({ dailyData, weeklyAverages, clientName }: EnhancedAnalyticsProps) {
  // Check data availability for each metric
  const dataAvailability = React.useMemo(() => {
    const hasSteps = dailyData.some(day => day.steps > 0);
    const hasSleep = dailyData.some(day => day.sleepHours > 0);
    const hasProtein = dailyData.some(day => day.protein > 0);
    const hasCalories = dailyData.some(day => day.calories > 0);
    const hasWeight = dailyData.some(day => day.weight > 0);
    const hasWorkouts = dailyData.some(day => day.workouts && day.workouts.length > 0);
    
    return {
      steps: hasSteps,
      sleep: hasSleep,
      protein: hasProtein,
      calories: hasCalories,
      weight: hasWeight,
      workouts: hasWorkouts
    };
  }, [dailyData]);

  // Calculate consistency metrics
  const consistencyAnalysis = React.useMemo(() => {
    if (dailyData.length === 0) return null;

    const calculateConsistency = (values: number[]): number => {
      if (values.length <= 1) return 100;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      return Math.max(0, (1 - coefficientOfVariation) * 100);
    };

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { avg: 0, max: 0, min: 0, consistency: 0 };
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const consistency = calculateConsistency(values);
      return { avg, max, min, consistency };
    };

    // Workout analysis - focus on workouts per week and missed workouts
    const totalWeeks = dailyData.length / 7;
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    const totalWorkouts = dailyData.reduce((sum, day) => sum + (day.workouts?.length || 0), 0);
    const workoutsPerWeek = totalWorkouts / totalWeeks;
    
    // Assume target of 4 workouts per week for missed calculation
    const targetWorkoutsPerWeek = 4;
    const expectedTotalWorkouts = totalWeeks * targetWorkoutsPerWeek;
    const missedWorkouts = Math.max(0, expectedTotalWorkouts - totalWorkouts);
    
    const workoutStats = {
      workoutsPerWeek: workoutsPerWeek,
      missedWorkouts: missedWorkouts,
      totalWorkouts: totalWorkouts,
      scheduledWorkouts: expectedTotalWorkouts,
      consistency: (workoutDays / dailyData.length) * 100 // Keep for consistency bar
    };

    // Sleep analysis - keep as is
    const sleepValues = dailyData.map(d => d.sleepHours).filter(s => s > 0);
    const sleepStats = calculateStats(sleepValues);

    // Activity analysis  
    const stepValues = dailyData.map(d => d.steps).filter(s => s > 0);
    const stepStats = calculateStats(stepValues);

    // Calories analysis - average, high, low for the period
    const calorieValues = dailyData.map(d => d.calories).filter(c => c > 0);
    const calorieStats = calculateStats(calorieValues);

    // Protein analysis - average, high, low for the period
    const proteinValues = dailyData.map(d => d.protein).filter(p => p > 0);
    const proteinStats = calculateStats(proteinValues);

    // Weight analysis - average weekly weight loss trend
    const weightValues = dailyData.map(d => d.weight).filter(w => w > 0);
    let weightStats = { avg: 0, max: 0, min: 0, consistency: 0, weeklyTrend: 0 };
    
    if (weightValues.length > 0 && weeklyAverages.length >= 2) {
      const firstWeekWeight = weeklyAverages[0].avgWeight;
      const lastWeekWeight = weeklyAverages[weeklyAverages.length - 1].avgWeight;
      const totalWeeksForWeight = weeklyAverages.length - 1;
      const weeklyTrend = (lastWeekWeight - firstWeekWeight) / totalWeeksForWeight;
      
      weightStats = {
        ...calculateStats(weightValues),
        weeklyTrend: weeklyTrend
      };
    }

    // Calculate overall score only from available metrics
    const availableMetrics = [];
    if (dataAvailability.workouts) availableMetrics.push(workoutStats.consistency);
    if (dataAvailability.sleep) availableMetrics.push(sleepStats.consistency);
    if (dataAvailability.steps) availableMetrics.push(stepStats.consistency);
    if (dataAvailability.protein) availableMetrics.push(proteinStats.consistency);
    if (dataAvailability.calories) availableMetrics.push(calorieStats.consistency);

    const overallScore = availableMetrics.length > 0 ? 
      availableMetrics.reduce((sum, val) => sum + val, 0) / availableMetrics.length : 0;

    return {
      workouts: workoutStats,
      sleep: sleepStats,
      steps: stepStats,
      protein: proteinStats,
      calories: calorieStats,
      weight: weightStats,
      overallScore
    };
  }, [dailyData, dataAvailability]);

  // Calculate trends
  const trendAnalysis = React.useMemo(() => {
    if (weeklyAverages.length < 2) return null;

    const latest = weeklyAverages[weeklyAverages.length - 1];
    const previous = weeklyAverages[weeklyAverages.length - 2];

    const calculateTrend = (current: number, prev: number) => {
      if (current === 0 && prev === 0) return null; // No data for this metric
      const change = ((current - prev) / prev) * 100;
      return {
        change,
        direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
        magnitude: Math.abs(change)
      };
    };

    const trends: { [key: string]: any } = {};
    
    // Only include trends for metrics with data
    if (dataAvailability.weight) {
      trends.weight = calculateTrend(latest.avgWeight, previous.avgWeight);
    }
    if (dataAvailability.steps) {
      trends.steps = calculateTrend(latest.avgSteps, previous.avgSteps);
    }
    if (dataAvailability.sleep) {
      trends.sleep = calculateTrend(latest.avgSleepHours, previous.avgSleepHours);
    }
    if (dataAvailability.protein) {
      trends.protein = calculateTrend(latest.avgProtein, previous.avgProtein);
    }

    return Object.keys(trends).length > 0 ? trends : null;
  }, [weeklyAverages, dataAvailability]);

  // Identify key improvement areas
  const improvementAreas = React.useMemo(() => {
    if (!dailyData.length) return [];

    const areas = [];
    
    // Only calculate averages for metrics with data
    if (dataAvailability.steps) {
      const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
      if (avgSteps < 7000) {
        areas.push({
          area: 'Daily Activity',
          priority: avgSteps < 5000 ? 'high' : 'medium',
          current: `${Math.round(avgSteps).toLocaleString()} steps/day`,
          target: '8,000-10,000 steps/day',
          recommendation: 'Add 2-3 short walks throughout the day'
        });
      }
    }

    if (dataAvailability.sleep) {
      const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
      if (avgSleep < 7) {
        areas.push({
          area: 'Sleep Duration',
          priority: avgSleep < 6 ? 'high' : 'medium',
          current: `${avgSleep.toFixed(1)} hours/night`,
          target: '7-9 hours/night',
          recommendation: 'Establish consistent bedtime routine'
        });
      }
    }

    if (dataAvailability.workouts) {
      const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
      if (workoutDays / dailyData.length < 0.4) {
        areas.push({
          area: 'Training Frequency',
          priority: workoutDays / dailyData.length < 0.2 ? 'high' : 'medium',
          current: `${workoutDays} days/${dailyData.length} days`,
          target: '3-4 days/week',
          recommendation: 'Schedule specific training days'
        });
      }
    }

    if (dataAvailability.protein) {
      const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
      if (avgProtein < 80) { // Adjusted threshold for more realistic protein goals
        areas.push({
          area: 'Protein Intake',
          priority: 'medium',
          current: `${avgProtein.toFixed(0)}g/day`,
          target: '80-120g/day',
          recommendation: 'Add protein source to each meal'
        });
      }
    }

    // Sort by priority
    return areas.sort((a, b) => {
      const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [dailyData, dataAvailability]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!consistencyAnalysis) return null;

  // Check if we have any data to display
  const hasAnyData = Object.values(dataAvailability).some(Boolean);
  
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Enhanced Analytics for {clientName}</h2>
          <p className="text-base-content/70">Consistency • Trends • Areas for Improvement</p>
        </div>
        
        <div className="card bg-base-200/50 shadow-lg">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
            <p className="text-base-content/70 mb-4">
              Start tracking your fitness metrics to see detailed analytics and insights.
            </p>
            <div className="text-sm text-base-content/60">
              Available metrics: Weight • Steps • Sleep • Protein • Workouts
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Enhanced Analytics for {clientName}</h2>
        <p className="text-base-content/70">
          {Object.values(dataAvailability).filter(Boolean).length === Object.keys(dataAvailability).length 
            ? 'Consistency • Trends • Areas for Improvement'
            : `Analytics for ${Object.entries(dataAvailability).filter(([_, hasData]) => hasData).map(([metric, _]) => 
                metric.charAt(0).toUpperCase() + metric.slice(1)).join(' • ')}`
          }
        </p>
      </div>

      {/* Consistency Dashboard */}
      <div className="card bg-base-200/50 shadow-lg">
        <div className="card-body">
          <div className="mb-6">
            <h3 className="text-xl font-bold">Consistency Analysis</h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { 
                key: 'weight', 
                label: 'Weight', 
                desc: 'Weekly weight trend', 
                condition: dataAvailability.weight,
                unit: 'lbs',
                format: (stats: any) => ({
                  main: `${stats.avg.toFixed(1)} lbs`,
                  avg: `${stats.weeklyTrend >= 0 ? '+' : ''}${stats.weeklyTrend.toFixed(1)} lbs/week`,
                  max: `${stats.max.toFixed(1)} highest`,
                  min: `${stats.min.toFixed(1)} lowest`
                })
              },
              { 
                key: 'sleep', 
                label: 'Sleep', 
                desc: 'Sleep duration', 
                condition: dataAvailability.sleep,
                unit: 'hrs',
                format: (stats: any) => ({
                  main: `${stats.avg.toFixed(1)} hrs`,
                  avg: `${stats.avg.toFixed(1)} hrs average`,
                  max: `${stats.max.toFixed(1)} hrs high`,
                  min: `${stats.min.toFixed(1)} hrs low`
                })
              },
              { 
                key: 'workouts', 
                label: 'Training', 
                desc: 'Weekly workout frequency', 
                condition: dataAvailability.workouts,
                unit: 'workouts',
                format: (stats: any) => ({
                  main: `${stats.workoutsPerWeek.toFixed(1)}/week`,
                  avg: `${Math.round(stats.missedWorkouts)} missed`,
                  max: `${Math.round(stats.scheduledWorkouts)} scheduled`,
                  min: `${stats.totalWorkouts} completed`
                })
              },
              { 
                key: 'calories', 
                label: 'Calories', 
                desc: 'Daily intake', 
                condition: dataAvailability.calories,
                unit: 'cals',
                format: (stats: any) => ({
                  main: `${Math.round(stats.avg)} cals`,
                  avg: `${Math.round(stats.avg)} average`,
                  max: `${Math.round(stats.max)} high`,
                  min: `${Math.round(stats.min)} low`
                })
              },
              { 
                key: 'protein', 
                label: 'Protein', 
                desc: 'Daily intake', 
                condition: dataAvailability.protein,
                unit: 'g',
                format: (stats: any) => ({
                  main: `${Math.round(stats.avg)}g`,
                  avg: `${Math.round(stats.avg)} average`,
                  max: `${Math.round(stats.max)} high`,
                  min: `${Math.round(stats.min)} low`
                })
              },
              { 
                key: 'steps', 
                label: 'Activity', 
                desc: 'Daily steps', 
                condition: dataAvailability.steps,
                unit: 'steps',
                format: (stats: any) => ({
                  main: `${Math.round(stats.avg).toLocaleString()}`,
                  avg: `${Math.round(stats.avg).toLocaleString()} avg`,
                  max: `${Math.round(stats.max).toLocaleString()} high`,
                  min: `${Math.round(stats.min).toLocaleString()} low`
                })
              }
            ].filter(item => item.condition).map((item) => {
              const stats = consistencyAnalysis[item.key as keyof typeof consistencyAnalysis];
              const formatted = item.format(stats);
              
              return (
                <div key={item.key} className="card bg-base-100 shadow-lg border border-base-300">
                  <div className="card-body p-4">
                    {/* Header */}
                    <div className="mb-3">
                      <h4 className="font-semibold text-lg">{item.label}</h4>
                      <div className="text-xs text-base-content/60">{item.desc}</div>
                    </div>
                    
                    {/* Main Value */}
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-base-content">
                        {formatted.main}
                      </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-base-content/70">
                          {item.key === 'workouts' ? 'Missed:' : 
                           item.key === 'weight' ? 'Trend:' : 'Average:'}
                        </span>
                        <span className="font-medium">{formatted.avg}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/70">
                          {item.key === 'workouts' ? 'Scheduled:' : 
                           item.key === 'weight' ? 'Highest:' : 'High:'}
                        </span>
                        <span className="font-medium">{formatted.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/70">
                          {item.key === 'workouts' ? 'Completed:' : 
                           item.key === 'weight' ? 'Lowest:' : 'Low:'}
                        </span>
                        <span className="font-medium">{formatted.min}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Weekly Progress Summary */}
      <div className="card bg-base-200/50 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-xl mb-6">Weekly Progress Summary</h3>
          <div className="space-y-4">
            {weeklyAverages.map((week, idx) => {
              const weekStart = new Date(week.weekStart);
              const weekEnd = new Date(week.weekEnd);
              const workoutsThisWeek = dailyData
                .filter(day => {
                  const date = new Date(day.date);
                  return date >= weekStart && date <= weekEnd && day.workouts && day.workouts.length > 0;
                })
                .reduce((total, day) => total + (day.workouts?.length || 0), 0);

              const isLatestWeek = idx === weeklyAverages.length - 1;

              return (
                <div 
                  key={week.weekStart} 
                  className={`card border-2 transition-all ${
                    isLatestWeek 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-base-300 bg-base-100'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-lg">
                        {`${formatDate(week.weekStart)} - ${formatDate(week.weekEnd)}`}
                      </h4>
                      {isLatestWeek && (
                        <div className="badge badge-primary">Latest Week</div>
                      )}
                    </div>
                    <div className={`grid gap-4 ${
                      [dataAvailability.weight, dataAvailability.steps, dataAvailability.sleep, dataAvailability.protein, dataAvailability.workouts]
                        .filter(Boolean).length <= 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-5'
                    }`}>
                      {dataAvailability.weight && (
                        <div className="stat p-2">
                          <div className="stat-title text-xs">Weight</div>
                          <div className="stat-value text-sm">{week.avgWeight.toFixed(1)}</div>
                          <div className="stat-desc text-xs">lbs</div>
                        </div>
                      )}
                      {dataAvailability.steps && (
                        <div className="stat p-2">
                          <div className="stat-title text-xs">Steps</div>
                          <div className="stat-value text-sm">{Math.round(week.avgSteps).toLocaleString()}</div>
                          <div className="stat-desc text-xs">daily avg</div>
                        </div>
                      )}
                      {dataAvailability.sleep && (
                        <div className="stat p-2">
                          <div className="stat-title text-xs">Sleep</div>
                          <div className="stat-value text-sm">{week.avgSleepHours.toFixed(1)}</div>
                          <div className="stat-desc text-xs">hours</div>
                        </div>
                      )}
                      {dataAvailability.protein && (
                        <div className="stat p-2">
                          <div className="stat-title text-xs">Protein</div>
                          <div className="stat-value text-sm">{Math.round(week.avgProtein)}</div>
                          <div className="stat-desc text-xs">grams</div>
                        </div>
                      )}
                      {dataAvailability.workouts && (
                        <div className="stat p-2">
                          <div className="stat-title text-xs">Training</div>
                          <div className="stat-value text-sm">{workoutsThisWeek}</div>
                          <div className="stat-desc text-xs">workouts</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 