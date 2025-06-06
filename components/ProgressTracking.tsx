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

interface ProgressTrackingProps {
  dailyData: DailyData[];
  weeklyAverages: WeeklyAverage[];
}

// Default fitness goals - these could be customizable per client in the future
const DEFAULT_GOALS = {
  steps: 10000,
  sleep: 7.5,
  workouts: 4, // per week
  protein: 1.2, // grams per kg body weight (estimated)
  calories: 2000 // base target
};

export function ProgressTracking({ dailyData, weeklyAverages }: ProgressTrackingProps) {
  // Calculate goal achievements
  const goalAchievements = React.useMemo(() => {
    if (dailyData.length === 0) return [];

    const achievements = [];

    // Steps goal achievement
    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
    const stepsGoalPercent = (avgSteps / DEFAULT_GOALS.steps) * 100;
    achievements.push({
      name: 'Daily Steps',
      current: Math.round(avgSteps).toLocaleString(),
      target: DEFAULT_GOALS.steps.toLocaleString(),
      percentage: stepsGoalPercent,
      unit: 'steps',
      status: stepsGoalPercent >= 100 ? 'achieved' : stepsGoalPercent >= 80 ? 'close' : 'needs-work'
    });

    // Sleep goal achievement
    const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
    const sleepGoalPercent = (avgSleep / DEFAULT_GOALS.sleep) * 100;
    achievements.push({
      name: 'Sleep Duration',
      current: avgSleep.toFixed(1),
      target: DEFAULT_GOALS.sleep.toString(),
      percentage: sleepGoalPercent,
      unit: 'hours',
      status: sleepGoalPercent >= 95 && sleepGoalPercent <= 120 ? 'achieved' : sleepGoalPercent >= 85 ? 'close' : 'needs-work'
    });

    // Workout frequency
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    const workoutFreq = workoutDays / (dailyData.length / 7); // per week
    const workoutGoalPercent = (workoutFreq / DEFAULT_GOALS.workouts) * 100;
    achievements.push({
      name: 'Workout Frequency',
      current: workoutFreq.toFixed(1),
      target: DEFAULT_GOALS.workouts.toString(),
      percentage: workoutGoalPercent,
      unit: 'per week',
      status: workoutGoalPercent >= 100 ? 'achieved' : workoutGoalPercent >= 75 ? 'close' : 'needs-work'
    });

    // Protein goal (estimate based on average person ~70kg)
    const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
    const proteinTarget = 84; // 70kg * 1.2g/kg
    const proteinGoalPercent = (avgProtein / proteinTarget) * 100;
    achievements.push({
      name: 'Protein Intake',
      current: avgProtein.toFixed(0),
      target: proteinTarget.toString(),
      percentage: proteinGoalPercent,
      unit: 'g/day',
      status: proteinGoalPercent >= 90 ? 'achieved' : proteinGoalPercent >= 70 ? 'close' : 'needs-work'
    });

    return achievements;
  }, [dailyData]);

  // Calculate trends (week-over-week improvement)
  const trends = React.useMemo(() => {
    if (weeklyAverages.length < 2) return [];

    const latest = weeklyAverages[weeklyAverages.length - 1];
    const previous = weeklyAverages[weeklyAverages.length - 2];

    return [
      {
        metric: 'Steps',
        change: latest.avgSteps - previous.avgSteps,
        percentage: ((latest.avgSteps - previous.avgSteps) / previous.avgSteps) * 100,
        unit: 'steps',
        improving: latest.avgSteps > previous.avgSteps
      },
      {
        metric: 'Sleep',
        change: latest.avgSleepHours - previous.avgSleepHours,
        percentage: ((latest.avgSleepHours - previous.avgSleepHours) / previous.avgSleepHours) * 100,
        unit: 'hours',
        improving: Math.abs(latest.avgSleepHours - 7.5) < Math.abs(previous.avgSleepHours - 7.5)
      },
      {
        metric: 'Weight',
        change: latest.avgWeight - previous.avgWeight,
        percentage: ((latest.avgWeight - previous.avgWeight) / previous.avgWeight) * 100,
        unit: 'lbs',
        improving: latest.avgWeight < previous.avgWeight // assuming weight loss is goal
      },
      {
        metric: 'Protein',
        change: latest.avgProtein - previous.avgProtein,
        percentage: ((latest.avgProtein - previous.avgProtein) / previous.avgProtein) * 100,
        unit: 'g',
        improving: latest.avgProtein > previous.avgProtein
      }
    ];
  }, [weeklyAverages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'text-success';
      case 'close': return 'text-warning';
      case 'needs-work': return 'text-error';
      default: return 'text-base-content';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-success/20';
      case 'close': return 'bg-warning/20';
      case 'needs-work': return 'bg-error/20';
      default: return 'bg-base-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Goal Achievement Dashboard */}
      <div className="card bg-base-200/50 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-xl flex items-center gap-2">
            🎯 Goal Achievement Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {goalAchievements.map((goal, index) => (
              <div key={index} className={`card ${getStatusBg(goal.status)} shadow-sm`}>
                <div className="card-body p-4">
                  <div className="text-sm font-medium text-base-content/80">{goal.name}</div>
                  <div className="flex items-baseline gap-2 my-2">
                    <span className="text-2xl font-bold">{goal.current}</span>
                    <span className="text-sm text-base-content/60">/ {goal.target} {goal.unit}</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-base-300 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        goal.status === 'achieved' ? 'bg-success' :
                        goal.status === 'close' ? 'bg-warning' : 'bg-error'
                      }`}
                      style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className={`text-sm font-medium ${getStatusColor(goal.status)}`}>
                    {goal.percentage.toFixed(0)}% of goal
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      {trends.length > 0 && (
        <div className="card bg-base-200/50 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-xl flex items-center gap-2">
              📈 Week-over-Week Trends
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {trends.map((trend, index) => (
                <div key={index} className="stat bg-base-100 rounded-lg shadow-sm">
                  <div className="stat-title text-sm">{trend.metric}</div>
                  <div className={`stat-value text-lg flex items-center gap-2 ${
                    trend.improving ? 'text-success' : 'text-error'
                  }`}>
                    {trend.improving ? '↗️' : '↘️'}
                    {Math.abs(trend.change).toFixed(1)}
                  </div>
                  <div className="stat-desc">
                    {trend.change >= 0 ? '+' : ''}{trend.percentage.toFixed(1)}% from last week
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Highlights */}
      <div className="card bg-base-200/50 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-xl flex items-center gap-2">
            ⭐ Performance Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Best Day */}
            <div className="card bg-success/10 border border-success/20">
              <div className="card-body p-4">
                <h4 className="font-semibold text-success">🏆 Best Performance Day</h4>
                {(() => {
                  const bestDay = dailyData.reduce((best, day) => {
                    const score = (day.steps / 10000) + (day.sleepHours / 8) + ((day.workouts?.length || 0) * 0.5);
                    const bestScore = (best.steps / 10000) + (best.sleepHours / 8) + ((best.workouts?.length || 0) * 0.5);
                    return score > bestScore ? day : best;
                  }, dailyData[0]);
                  
                  const bestDate = new Date(bestDay.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  
                  return (
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{bestDate}</div>
                      <div>{bestDay.steps.toLocaleString()} steps</div>
                      <div>{bestDay.sleepHours.toFixed(1)} hours sleep</div>
                      {bestDay.workouts && bestDay.workouts.length > 0 && (
                        <div>{bestDay.workouts.length} workout{bestDay.workouts.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Consistency Score */}
            <div className="card bg-info/10 border border-info/20">
              <div className="card-body p-4">
                <h4 className="font-semibold text-info">📊 Consistency Score</h4>
                {(() => {
                  // Calculate consistency based on how many days met basic targets
                  const consistentDays = dailyData.filter(day => 
                    day.steps >= 7000 && day.sleepHours >= 6.5
                  ).length;
                  const consistencyPercent = (consistentDays / dailyData.length) * 100;
                  
                  return (
                    <div className="text-sm space-y-1">
                      <div className="text-2xl font-bold">{consistencyPercent.toFixed(0)}%</div>
                      <div>{consistentDays} out of {dailyData.length} days</div>
                      <div className="text-xs text-base-content/60">
                        Met basic activity + sleep goals
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="card bg-warning/10 border border-warning/20">
              <div className="card-body p-4">
                <h4 className="font-semibold text-warning">💡 Focus Areas</h4>
                <div className="text-sm space-y-1">
                  {(() => {
                    const improvements = [];
                    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
                    const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
                    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
                    
                    if (avgSteps < 8000) improvements.push('Increase daily activity');
                    if (avgSleep < 7) improvements.push('Improve sleep duration');
                    if (workoutDays / dailyData.length < 0.4) improvements.push('More consistent training');
                    
                    return improvements.length > 0 ? improvements.map((item, i) => (
                      <div key={i}>• {item}</div>
                    )) : <div>All areas performing well! 🎉</div>;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 