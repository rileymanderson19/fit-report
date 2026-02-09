'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { BrandConfig } from '@/hooks/useBrandConfig';
import { useReportAnalytics, DailyData, WeeklyAverage } from '@/hooks/useReportAnalytics';
import ShareWeightProgressChart from '@/components/shareable/ShareWeightProgressChart';
import ShareWeeklyHighlightsCard from '@/components/shareable/ShareWeeklyHighlightsCard';
import { TrendingDown, TrendingUp, Minus, Dumbbell, Target, Clock } from 'lucide-react';

interface Report {
  id: string;
  client_id: string;
  trainer_id: string;
  report_data: any;
  date_range_start: string;
  date_range_end: string;
  created_at: string;
  generated_link_url: string | null;
  link_expires_at: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trainerize_id: number;
  active: boolean;
}

interface PublicReportData {
  report: Report;
  client: Client;
  brand: BrandConfig | null;
  isExpired: boolean;
}

function processReportData(reportData: any): { dailyData: DailyData[], weeklyAverages: WeeklyAverage[] } {
  if (!reportData) return { dailyData: [], weeklyAverages: [] };

  const dailyMap = new Map<string, DailyData>();

  const ensureDay = (date: string): DailyData => {
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, weight: 0, steps: 0, calories: 0, protein: 0, carbs: 0, fats: 0, sleepHours: 0, workouts: [] });
    }
    return dailyMap.get(date)!;
  };

  reportData.nutritionData?.nutrition?.forEach((item: any) => {
    const date = new Date(item.date).toISOString().split('T')[0];
    const day = ensureDay(date);
    day.calories = item.calories || 0;
    day.protein = item.proteinGrams || 0;
    day.carbs = item.carbsGrams || 0;
    day.fats = item.fatGrams || 0;
  });

  reportData.healthData?.healthData?.forEach((item: any) => {
    const date = new Date(item.date).toISOString().split('T')[0];
    const day = ensureDay(date);
    day.steps = item.data?.steps || 0;
  });

  reportData.bodyStats?.bodyStats?.forEach((item: any) => {
    const date = new Date(item.date).toISOString().split('T')[0];
    const day = ensureDay(date);
    day.weight = item.weight || 0;
  });

  reportData.sleepData?.sleepData?.forEach((item: any) => {
    const date = new Date(item.date).toISOString().split('T')[0];
    const day = ensureDay(date);
    day.sleepHours = item.duration || 0;
  });

  reportData.workoutData?.workoutCalendar?.forEach((item: any) => {
    if (item.status === 'tracked') {
      const date = new Date(item.date).toISOString().split('T')[0];
      const day = ensureDay(date);
      day.workouts = [...(day.workouts || []), item];
    }
  });

  const dailyData = Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate weekly averages
  const weeklyAverages: WeeklyAverage[] = [];
  if (dailyData.length > 0) {
    let weekStart = new Date(dailyData[0].date);
    let weekData: DailyData[] = [];

    for (const day of dailyData) {
      const dayDate = new Date(day.date);
      const daysSinceStart = Math.floor((dayDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceStart >= 7) {
        if (weekData.length > 0) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          weeklyAverages.push({
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            avgWeight: weekData.filter(d => d.weight > 0).reduce((s, d) => s + d.weight, 0) / (weekData.filter(d => d.weight > 0).length || 1),
            avgSteps: weekData.reduce((s, d) => s + d.steps, 0) / weekData.length,
            avgCalories: weekData.reduce((s, d) => s + d.calories, 0) / weekData.length,
            avgProtein: weekData.reduce((s, d) => s + d.protein, 0) / weekData.length,
            avgCarbs: weekData.reduce((s, d) => s + d.carbs, 0) / weekData.length,
            avgFats: weekData.reduce((s, d) => s + d.fats, 0) / weekData.length,
            avgSleepHours: weekData.filter(d => d.sleepHours > 0).reduce((s, d) => s + d.sleepHours, 0) / (weekData.filter(d => d.sleepHours > 0).length || 1)
          });
        }
        weekStart = dayDate;
        weekData = [];
      }
      weekData.push(day);
    }

    if (weekData.length > 0) {
      const weekEnd = new Date(weekData[weekData.length - 1].date);
      weeklyAverages.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        avgWeight: weekData.filter(d => d.weight > 0).reduce((s, d) => s + d.weight, 0) / (weekData.filter(d => d.weight > 0).length || 1),
        avgSteps: weekData.reduce((s, d) => s + d.steps, 0) / weekData.length,
        avgCalories: weekData.reduce((s, d) => s + d.calories, 0) / weekData.length,
        avgProtein: weekData.reduce((s, d) => s + d.protein, 0) / weekData.length,
        avgCarbs: weekData.reduce((s, d) => s + d.carbs, 0) / weekData.length,
        avgFats: weekData.reduce((s, d) => s + d.fats, 0) / weekData.length,
        avgSleepHours: weekData.filter(d => d.sleepHours > 0).reduce((s, d) => s + d.sleepHours, 0) / (weekData.filter(d => d.sleepHours > 0).length || 1)
      });
    }
  }

  return { dailyData, weeklyAverages };
}

export default function PublicReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [data, setData] = useState<PublicReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicReport = async () => {
      try {
        const response = await fetch(`/api/reports/public/${reportId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch report');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) fetchPublicReport();
  }, [reportId]);

  const processedData = useMemo(() => {
    if (!data?.report?.report_data) return { dailyData: [], weeklyAverages: [] };
    return processReportData(data.report.report_data);
  }, [data]);

  const { consistencyAnalysis } = useReportAnalytics(
    processedData.dailyData,
    processedData.weeklyAverages
  );

  const weightData = useMemo(() => {
    if (!consistencyAnalysis) return { startWeight: 0, currentWeight: 0, weeklyChange: 0 };

    let weeklyChange = 0;
    const weightsWithData = processedData.dailyData.filter(d => d.weight > 0);
    if (weightsWithData.length >= 2) {
      const firstWeight = weightsWithData[0].weight;
      const lastWeight = weightsWithData[weightsWithData.length - 1].weight;
      const firstDate = new Date(weightsWithData[0].date);
      const lastDate = new Date(weightsWithData[weightsWithData.length - 1].date);
      const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const weeksBetween = daysBetween / 7;
      if (weeksBetween > 0) weeklyChange = (lastWeight - firstWeight) / weeksBetween;
    }

    return {
      startWeight: consistencyAnalysis.weight.start,
      currentWeight: consistencyAnalysis.weight.latest,
      weeklyChange
    };
  }, [consistencyAnalysis, processedData.dailyData]);

  const weeklyData = useMemo(() => {
    if (!consistencyAnalysis) return { workoutsCompleted: 0, workoutsScheduled: 0, avgDailySteps: 0, stepsGoal: 10000, avgCalories: 0, avgProtein: 0, avgCarbs: 0, avgFats: 0 };
    return {
      workoutsCompleted: consistencyAnalysis.workouts.totalWorkouts,
      workoutsScheduled: consistencyAnalysis.workouts.scheduledWorkouts,
      avgDailySteps: Math.round(consistencyAnalysis.steps.avg),
      stepsGoal: 10000,
      avgCalories: consistencyAnalysis.calories.avg,
      avgProtein: consistencyAnalysis.protein.avg,
      avgCarbs: processedData.dailyData.reduce((s, d) => s + d.carbs, 0) / (processedData.dailyData.length || 1),
      avgFats: processedData.dailyData.reduce((s, d) => s + d.fats, 0) / (processedData.dailyData.length || 1),
    };
  }, [consistencyAnalysis, processedData.dailyData]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to load report</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Report not found</p>
      </div>
    );
  }

  // Expired state
  if (data.isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-sm text-gray-500">This report link has expired and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  const { report, client, brand } = data;
  const clientName = `${client.first_name} ${client.last_name}`;
  const primaryColor = brand?.primary_color || '#8B5CF6';
  const accentColor = brand?.accent_color || '#7C3AED';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const totalChange = weightData.currentWeight - weightData.startWeight;
  const getTrendIcon = () => {
    if (totalChange < -0.5) return <TrendingDown className="w-5 h-5 text-green-500" />;
    if (totalChange > 0.5) return <TrendingUp className="w-5 h-5 text-orange-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            {brand?.logo_url && (
              <img src={brand.logo_url} alt="" className="h-10 object-contain" />
            )}
            {brand?.business_name && (
              <span className="text-sm font-medium text-gray-600">{brand.business_name}</span>
            )}
          </div>
          <div
            className="h-1 w-16 rounded-full mt-4"
            style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}
          />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">{clientName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Progress Report: {formatDate(report.date_range_start)} - {formatDate(report.date_range_end)}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Key Metrics Overview */}
        {consistencyAnalysis && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {weightData.currentWeight > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{weightData.currentWeight.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 mt-1">lbs current</div>
                  {totalChange !== 0 && (
                    <div className={`flex items-center justify-center gap-1 mt-1 text-xs font-medium ${totalChange <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {getTrendIcon()}
                      {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
                    </div>
                  )}
                </div>
              )}
              {consistencyAnalysis.workouts.totalWorkouts > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{consistencyAnalysis.workouts.totalWorkouts}</div>
                  <div className="text-xs text-gray-500 mt-1">workouts</div>
                </div>
              )}
              {consistencyAnalysis.calories.avg > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{Math.round(consistencyAnalysis.calories.avg).toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-1">cal/day avg</div>
                </div>
              )}
              {consistencyAnalysis.protein.avg > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{Math.round(consistencyAnalysis.protein.avg)}g</div>
                  <div className="text-xs text-gray-500 mt-1">protein/day</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weight Chart */}
        {processedData.dailyData.some(d => d.weight > 0) && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <ShareWeightProgressChart
              dailyData={processedData.dailyData.map(d => ({ date: d.date, weight: d.weight }))}
              weeklyAverages={processedData.weeklyAverages.map(w => ({ weekStart: w.weekStart, avgWeight: w.avgWeight }))}
              clientName={clientName}
              dateRangeStart={report.date_range_start}
              dateRangeEnd={report.date_range_end}
              hideFooter={true}
              brand={brand}
            />
          </div>
        )}

        {/* Weekly Highlights */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <ShareWeeklyHighlightsCard
            clientName={clientName}
            dateRangeStart={report.date_range_start}
            dateRangeEnd={report.date_range_end}
            weeklyData={weeklyData}
            weightChange={weightData.weeklyChange}
            hideFooter={true}
            brand={brand}
          />
        </div>

        {/* Consistency Score */}
        {consistencyAnalysis && consistencyAnalysis.overallScore > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5" style={{ color: primaryColor }} />
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Consistency Score</h2>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-gray-900">{Math.round(consistencyAnalysis.overallScore)}%</span>
              <span className="text-sm text-gray-500 pb-2">overall</span>
            </div>
            <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(consistencyAnalysis.overallScore, 100)}%`,
                  background: `linear-gradient(to right, ${primaryColor}, ${accentColor})`
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-4 py-8 text-center">
        {brand?.footer_text && (
          <p className="text-xs text-gray-400 whitespace-pre-line mb-2">{brand.footer_text}</p>
        )}
        {(brand?.show_fitreport_badge !== false) && (
          <p className="text-xs text-gray-300">Powered by FitReport</p>
        )}
      </footer>
    </div>
  );
}
