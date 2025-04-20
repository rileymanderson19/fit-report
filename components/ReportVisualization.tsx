'use client';

import { useMemo } from 'react';

interface ReportVisualizationProps {
  data: {
    bodyStats: {
      bodyStats: Array<{
        date: string;
        weight: number;
      }>;
    };
    healthData: {
      healthData: Array<{
        date: string;
        data: {
          steps: number;
        };
      }>;
    };
    nutritionData: {
      nutrition: Array<{
        date: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      }>;
    };
  };
}

interface DailyData {
  date: string;
  weight: number;
  steps: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
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
}

export function ReportVisualization({ data }: ReportVisualizationProps) {
  // Process all data into a single daily format
  const processedDailyData = useMemo(() => {
    const dailyData = new Map<string, DailyData>();
    
    // Process body stats
    data.bodyStats?.bodyStats?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: item.weight || 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0
        });
      } else {
        dailyData.get(date)!.weight = item.weight || 0;
      }
    });

    // Process health data
    data.healthData?.healthData?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: item.data?.steps || 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0
        });
      } else {
        dailyData.get(date)!.steps = item.data?.steps || 0;
      }
    });

    // Process nutrition data
    data.nutritionData?.nutrition?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: item.calories || 0,
          protein: item.proteinGrams || 0,
          carbs: item.carbsGrams || 0,
          fats: item.fatGrams || 0
        });
      } else {
        const entry = dailyData.get(date)!;
        entry.calories = item.calories || 0;
        entry.protein = item.proteinGrams || 0;
        entry.carbs = item.carbsGrams || 0;
        entry.fats = item.fatGrams || 0;
      }
    });

    return Array.from(dailyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Helper function to calculate averages only for days with data
  const calculateAverage = (data: DailyData[], metric: keyof DailyData): number => {
    const validData = data.filter(day => {
      const value = day[metric];
      return typeof value === 'number' && value > 0;
    });
    if (validData.length === 0) return 0;
    const sum = validData.reduce((acc, day) => acc + (day[metric] as number), 0);
    return sum / validData.length;
  };

  // Calculate if this is a single week or multiple weeks
  const timeSpanInfo = useMemo(() => {
    if (processedDailyData.length === 0) return { isSingleWeek: true, numberOfWeeks: 0 };
    
    const firstDate = new Date(processedDailyData[0].date);
    const lastDate = new Date(processedDailyData[processedDailyData.length - 1].date);
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isSingleWeek: daysDiff <= 7,
      numberOfWeeks: Math.ceil(daysDiff / 7)
    };
  }, [processedDailyData]);

  // Calculate weekly averages
  const weeklyAverages = useMemo(() => {
    if (processedDailyData.length === 0) return [];

    const weeks: WeeklyAverage[] = [];
    let currentWeekData: DailyData[] = [];
    let currentWeekStart = new Date(processedDailyData[0].date);

    processedDailyData.forEach((dayData) => {
      const currentDate = new Date(dayData.date);
      const daysDiff = Math.floor((currentDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 7) {
        // Calculate averages for the completed week
        if (currentWeekData.length > 0) {
          weeks.push({
            weekStart: currentWeekStart.toISOString().split('T')[0],
            weekEnd: new Date(currentWeekData[currentWeekData.length - 1].date).toISOString().split('T')[0],
            avgWeight: calculateAverage(currentWeekData, 'weight'),
            avgSteps: calculateAverage(currentWeekData, 'steps'),
            avgCalories: calculateAverage(currentWeekData, 'calories'),
            avgProtein: calculateAverage(currentWeekData, 'protein'),
            avgCarbs: calculateAverage(currentWeekData, 'carbs'),
            avgFats: calculateAverage(currentWeekData, 'fats'),
          });
        }
        currentWeekData = [dayData];
        currentWeekStart = currentDate;
      } else {
        currentWeekData.push(dayData);
      }
    });

    // Add the last week if it has any data
    if (currentWeekData.length > 0) {
      weeks.push({
        weekStart: currentWeekStart.toISOString().split('T')[0],
        weekEnd: new Date(currentWeekData[currentWeekData.length - 1].date).toISOString().split('T')[0],
        avgWeight: calculateAverage(currentWeekData, 'weight'),
        avgSteps: calculateAverage(currentWeekData, 'steps'),
        avgCalories: calculateAverage(currentWeekData, 'calories'),
        avgProtein: calculateAverage(currentWeekData, 'protein'),
        avgCarbs: calculateAverage(currentWeekData, 'carbs'),
        avgFats: calculateAverage(currentWeekData, 'fats'),
      });
    }

    return weeks;
  }, [processedDailyData]);

  // Calculate week-over-week changes
  const weeklyChanges = useMemo(() => {
    if (weeklyAverages.length <= 1) return [];

    return weeklyAverages.slice(1).map((week, index) => ({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      weight: {
        diff: week.avgWeight - weeklyAverages[index].avgWeight,
        percent: ((week.avgWeight - weeklyAverages[index].avgWeight) / weeklyAverages[index].avgWeight) * 100
      },
      steps: {
        diff: week.avgSteps - weeklyAverages[index].avgSteps,
        percent: ((week.avgSteps - weeklyAverages[index].avgSteps) / weeklyAverages[index].avgSteps) * 100
      },
      calories: {
        diff: week.avgCalories - weeklyAverages[index].avgCalories,
        percent: ((week.avgCalories - weeklyAverages[index].avgCalories) / weeklyAverages[index].avgCalories) * 100
      },
      protein: {
        diff: week.avgProtein - weeklyAverages[index].avgProtein,
        percent: ((week.avgProtein - weeklyAverages[index].avgProtein) / weeklyAverages[index].avgProtein) * 100
      },
      carbs: {
        diff: week.avgCarbs - weeklyAverages[index].avgCarbs,
        percent: ((week.avgCarbs - weeklyAverages[index].avgCarbs) / weeklyAverages[index].avgCarbs) * 100
      },
      fats: {
        diff: week.avgFats - weeklyAverages[index].avgFats,
        percent: ((week.avgFats - weeklyAverages[index].avgFats) / weeklyAverages[index].avgFats) * 100
      }
    }));
  }, [weeklyAverages]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  const formatChange = (change: { diff: number, percent: number }, decimals: number = 1) => {
    const sign = change.diff >= 0 ? '+' : '';
    const formattedDiff = formatNumber(change.diff, decimals);
    const formattedPercent = formatNumber(change.percent, 1);
    return `${sign}${formattedDiff} (${sign}${formattedPercent}%)`;
  };

  if (processedDailyData.length === 0) {
    return (
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>No data available for this period</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {timeSpanInfo.isSingleWeek ? (
        // Single Week View
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight (lbs)</th>
                <th>Steps</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Carbs (g)</th>
                <th>Fats (g)</th>
              </tr>
            </thead>
            <tbody>
              {processedDailyData.map((day) => (
                <tr key={day.date}>
                  <td>{formatDate(day.date)}</td>
                  <td>{formatNumber(day.weight)}</td>
                  <td>{formatNumber(day.steps, 0)}</td>
                  <td>{formatNumber(day.calories, 0)}</td>
                  <td>{formatNumber(day.protein)}</td>
                  <td>{formatNumber(day.carbs)}</td>
                  <td>{formatNumber(day.fats)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Multi-Week View
        <div className="space-y-8">
          {/* Weekly Averages */}
          <div className="overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Weekly Averages</h3>
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Weight (lbs)</th>
                  <th>Steps</th>
                  <th>Calories</th>
                  <th>Protein (g)</th>
                  <th>Carbs (g)</th>
                  <th>Fats (g)</th>
                </tr>
              </thead>
              <tbody>
                {weeklyAverages.map((week, index) => (
                  <tr key={week.weekStart}>
                    <td>{`${formatDate(week.weekStart)} - ${formatDate(week.weekEnd)}`}</td>
                    <td>{formatNumber(week.avgWeight)}</td>
                    <td>{formatNumber(week.avgSteps, 0)}</td>
                    <td>{formatNumber(week.avgCalories, 0)}</td>
                    <td>{formatNumber(week.avgProtein)}</td>
                    <td>{formatNumber(week.avgCarbs)}</td>
                    <td>{formatNumber(week.avgFats)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Week-over-Week Changes */}
          {weeklyChanges.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="text-xl font-semibold mb-4">Week-over-Week Changes</h3>
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Weight (lbs)</th>
                    <th>Steps</th>
                    <th>Calories</th>
                    <th>Protein (g)</th>
                    <th>Carbs (g)</th>
                    <th>Fats (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyChanges.map((change) => (
                    <tr key={change.weekStart}>
                      <td>{`${formatDate(change.weekStart)} - ${formatDate(change.weekEnd)}`}</td>
                      <td className={change.weight.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.weight)}
                      </td>
                      <td className={change.steps.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.steps, 0)}
                      </td>
                      <td className={change.calories.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.calories, 0)}
                      </td>
                      <td className={change.protein.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.protein)}
                      </td>
                      <td className={change.carbs.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.carbs)}
                      </td>
                      <td className={change.fats.diff >= 0 ? 'text-success' : 'text-error'}>
                        {formatChange(change.fats)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 