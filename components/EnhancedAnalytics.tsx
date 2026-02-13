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
  last7ReportData?: any;
}

export function EnhancedAnalytics({ dailyData, weeklyAverages, clientName, last7ReportData }: EnhancedAnalyticsProps) {
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
    const totalWeeks = weeklyAverages.length; // Use actual number of complete weeks
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    const totalWorkouts = dailyData.reduce((sum, day) => sum + (day.workouts?.length || 0), 0);
    const workoutsPerWeek = totalWorkouts / totalWeeks;
    
    // Calculate actual workout frequency and use that as the baseline
    // If someone is consistently doing X workouts per week, that's their schedule
    const actualWorkoutsPerWeek = totalWorkouts / totalWeeks;
    const expectedTotalWorkouts = Math.round(actualWorkoutsPerWeek * totalWeeks);
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
    let weightStats = { avg: 0, latest: 0, min: 0, consistency: 0, weeklyTrend: 0 };
    
    if (weightValues.length > 0) {
      // Calculate basic stats excluding max
      const avg = weightValues.reduce((sum, val) => sum + val, 0) / weightValues.length;
      const min = Math.min(...weightValues);
      const consistency = calculateConsistency(weightValues);
      
      // Find the latest weight entry by date
      const sortedWeightEntries = dailyData
        .filter(d => d.weight > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latestWeight = sortedWeightEntries.length > 0 
        ? sortedWeightEntries[sortedWeightEntries.length - 1].weight 
        : 0;
      
      // Calculate weekly trend if we have multiple weeks
      let weeklyTrend = 0;
      if (weeklyAverages.length >= 2) {
        const firstWeekWeight = weeklyAverages[0].avgWeight;
        const lastWeekWeight = weeklyAverages[weeklyAverages.length - 1].avgWeight;
        const totalWeeksForWeight = weeklyAverages.length - 1;
        weeklyTrend = (lastWeekWeight - firstWeekWeight) / totalWeeksForWeight;
      }
      
      weightStats = {
        avg,
        latest: latestWeight,
        min,
        consistency,
        weeklyTrend
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
  const _trendAnalysis = React.useMemo(() => {
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
  const _improvementAreas = React.useMemo(() => {
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
      // Only average days where sleep was actually recorded
      const sleepDays = dailyData.filter(day => day.sleepHours > 0);
      const avgSleep = sleepDays.length > 0 
        ? sleepDays.reduce((sum, day) => sum + day.sleepHours, 0) / sleepDays.length 
        : 0;
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
    // Parse the date string in local timezone to match data processing
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Process last 7 days data for calendar view
  const last7DaysCalendar = React.useMemo(() => {
    if (!last7ReportData) return null;

    // Generate last 7 days ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    // Build data map from last7ReportData
    const dataMap = new Map<string, any>();
    
    // Process nutrition
    last7ReportData.nutritionData?.nutrition?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dataMap.has(date)) dataMap.set(date, {});
      dataMap.get(date).calories = item.calories || 0;
      dataMap.get(date).protein = item.proteinGrams || 0;
    });

    // Process steps
    last7ReportData.healthData?.healthData?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dataMap.has(date)) dataMap.set(date, {});
      dataMap.get(date).steps = item.data?.steps || 0;
    });

    // Process weight (weigh-ins)
    last7ReportData.bodyStats?.bodyStats?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dataMap.has(date)) dataMap.set(date, {});
      dataMap.get(date).weight = item.weight || 0;
    });

    // Process workout calendar
    const workoutMap = new Map<string, any>();
    last7ReportData.workoutData?.workoutCalendar?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!workoutMap.has(date)) {
        workoutMap.set(date, { scheduled: 0, tracked: 0 });
      }
      const dayWorkouts = workoutMap.get(date);
      if (item.status === 'tracked') {
        dayWorkouts.tracked++;
      } else if (item.status === 'scheduled') {
        dayWorkouts.scheduled++;
      }
    });

    return days.map(dateStr => {
      const data = dataMap.get(dateStr) || {};
      const workouts = workoutMap.get(dateStr) || { scheduled: 0, tracked: 0 };
      
      // Parse date for display
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      return {
        date: dateStr,
        dayName: dayNames[date.getDay()],
        dayNum: date.getDate(),
        calories: data.calories || 0,
        protein: data.protein || 0,
        steps: data.steps || 0,
        weight: data.weight || 0,
        workoutStatus: 
          workouts.tracked > 0 ? 'completed' :
          workouts.scheduled > 0 ? 'not-completed' :
          'none'
      };
    });
  }, [last7ReportData]);

  if (!consistencyAnalysis) return null;

  // Check if we have any data to display
  const hasAnyData = Object.values(dataAvailability).some(Boolean);
  
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Enhanced Analytics for {clientName}</h2>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6 text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">
              Start tracking your fitness metrics to see detailed analytics and insights.
            </p>
            <div className="text-sm text-gray-500">
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
        <h2 className="text-2xl font-bold mb-2">{clientName}</h2>
      </div>

      {/* Consistency Dashboard */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
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
                  max: `${stats.latest.toFixed(1)} latest`,
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
                <div key={item.key} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="p-4">
                    {/* Header */}
                    <div className="mb-3">
                      <h4 className="font-semibold text-lg">{item.label}</h4>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                    
                    {/* Main Value */}
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatted.main}
                      </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {item.key === 'workouts' ? 'Missed:' : 
                           item.key === 'weight' ? 'Trend:' : 'Average:'}
                        </span>
                        <span className="font-medium">{formatted.avg}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {item.key === 'workouts' ? 'Scheduled:' : 
                           item.key === 'weight' ? 'Latest:' : 'High:'}
                        </span>
                        <span className="font-medium">{formatted.max}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
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

      {/* Last 7 Days Calendar */}
      {last7DaysCalendar && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold">Last 7 Days</h3>
              <p className="text-sm text-gray-600 mt-1">
                Rolling 7-day snapshot of daily performance
              </p>
            </div>
            
            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {last7DaysCalendar.map((day: any) => {
                const hasAnyData = day.calories > 0 || day.steps > 0 || day.weight > 0 || day.workoutStatus !== 'none';
                
                return (
                  <div 
                    key={day.date}
                    className={`bg-white rounded-lg p-2 md:p-3 border transition-shadow ${
                      hasAnyData
                        ? 'border-gray-200 hover:shadow-md'
                        : 'border-gray-100 opacity-75'
                    }`}
                  >
                    {/* Date Header */}
                    <div className="text-center mb-3 pb-2 border-b border-gray-200">
                      <div className="text-xs font-medium text-gray-500">{day.dayName}</div>
                      <div className="text-lg font-bold text-blue-600">{day.dayNum}</div>
                    </div>

                    {/* Nutrition */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Nutrition</div>
                      {day.calories > 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-xs">
                            <span className="font-medium">{Math.round(day.calories)}</span>
                            <span className="text-gray-500 ml-0.5">cal</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">{Math.round(day.protein)}</span>
                            <span className="text-gray-500 ml-0.5">g protein</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">—</div>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Steps</div>
                      {day.steps > 0 ? (
                        <div className="text-xs font-medium">{day.steps.toLocaleString()}</div>
                      ) : (
                        <div className="text-xs text-gray-400">—</div>
                      )}
                    </div>

                    {/* Workout Status */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-600 mb-1">Workout</div>
                      {day.workoutStatus === 'completed' && (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-green-600">Done</span>
                        </div>
                      )}
                      {day.workoutStatus === 'not-completed' && (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-yellow-600">Missed</span>
                        </div>
                      )}
                      {day.workoutStatus === 'none' && (
                        <div className="text-xs text-gray-400">—</div>
                      )}
                    </div>

                    {/* Weigh-in */}
                    <div>
                      <div className="text-xs font-semibold text-gray-600 mb-1">Weigh-in</div>
                      {day.weight > 0 ? (
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-blue-600">{day.weight.toFixed(1)} lbs</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">—</div>
                      )}
                    </div>

                    {/* No data indicator */}
                    {!hasAnyData && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-xs text-gray-300">No data</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}



      {/* Weekly Progress Summary */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Weekly Progress Summary</h3>
          <div className="space-y-4">
            {weeklyAverages.map((week) => {
              // Parse dates consistently in local timezone
              const [startYear, startMonth, startDay] = week.weekStart.split('-').map(Number);
              const weekStart = new Date(startYear, startMonth - 1, startDay);
              const [endYear, endMonth, endDay] = week.weekEnd.split('-').map(Number);
              const weekEnd = new Date(endYear, endMonth - 1, endDay);
              
              const workoutsThisWeek = dailyData
                .filter(day => {
                  const [dayYear, dayMonth, dayDay] = day.date.split('-').map(Number);
                  const date = new Date(dayYear, dayMonth - 1, dayDay);
                  return date >= weekStart && date <= weekEnd && day.workouts && day.workouts.length > 0;
                })
                .reduce((total, day) => total + (day.workouts?.length || 0), 0);

              return (
                <div 
                  key={week.weekStart} 
                  className="bg-white border-2 border-gray-200 rounded-xl"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-lg">
                        {`${formatDate(week.weekStart)} - ${formatDate(week.weekEnd)}`}
                      </h4>
                    </div>
                    <div className={`grid gap-4 ${
                      [dataAvailability.weight, dataAvailability.steps, dataAvailability.sleep, dataAvailability.protein, dataAvailability.calories, dataAvailability.workouts]
                        .filter(Boolean).length <= 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-6'
                    }`}>
                      {dataAvailability.weight && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Weight</div>
                          <div className="text-sm font-bold text-gray-900">{week.avgWeight.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">lbs</div>
                        </div>
                      )}
                      {dataAvailability.calories && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Calories</div>
                          <div className="text-sm font-bold text-gray-900">{Math.round(week.avgCalories).toLocaleString()}</div>
                          <div className="text-xs text-gray-400">daily avg</div>
                        </div>
                      )}
                      {dataAvailability.protein && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Protein</div>
                          <div className="text-sm font-bold text-gray-900">{Math.round(week.avgProtein)}</div>
                          <div className="text-xs text-gray-400">grams</div>
                        </div>
                      )}
                      {dataAvailability.steps && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Steps</div>
                          <div className="text-sm font-bold text-gray-900">{Math.round(week.avgSteps).toLocaleString()}</div>
                          <div className="text-xs text-gray-400">daily avg</div>
                        </div>
                      )}
                      {dataAvailability.workouts && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Training</div>
                          <div className="text-sm font-bold text-gray-900">{workoutsThisWeek}</div>
                          <div className="text-xs text-gray-400">workouts</div>
                        </div>
                      )}
                      {dataAvailability.sleep && (
                        <div className="p-2">
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Sleep</div>
                          <div className="text-sm font-bold text-gray-900">{week.avgSleepHours.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">hours</div>
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