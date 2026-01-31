'use client';

import React, { useState, useCallback } from 'react';
import { X, Download, Copy, Check, BarChart3, Scale, Calendar, FileText } from 'lucide-react';
import ShareProgressSummaryCard from './ShareProgressSummaryCard';
import ShareWeightProgressChart from './ShareWeightProgressChart';
import ShareWeeklyHighlightsCard from './ShareWeeklyHighlightsCard';
import { useReportAnalytics, DailyData, WeeklyAverage } from '@/hooks/useReportAnalytics';

interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any;
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  goalWeight?: number;
}

type TabType = 'summary' | 'weight' | 'weekly' | 'full';

export default function ShareProgressModal({
  isOpen,
  onClose,
  reportData,
  clientName,
  dateRangeStart,
  dateRangeEnd,
  goalWeight
}: ShareProgressModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Process report data into daily data format
  const processedData = React.useMemo(() => {
    if (!reportData) return { dailyData: [], weeklyAverages: [] };

    const dailyMap = new Map<string, DailyData>();

    // Process nutrition data
    reportData.nutritionData?.nutrition?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      }
      const day = dailyMap.get(date)!;
      day.calories = item.calories || 0;
      day.protein = item.proteinGrams || 0;
      day.carbs = item.carbGrams || 0;
      day.fats = item.fatGrams || 0;
    });

    // Process health data (steps)
    reportData.healthData?.healthData?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      }
      const day = dailyMap.get(date)!;
      day.steps = item.data?.steps || 0;
    });

    // Process body stats (weight)
    reportData.bodyStats?.bodyStats?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      }
      const day = dailyMap.get(date)!;
      day.weight = item.weight || 0;
    });

    // Process sleep data
    reportData.sleepData?.sleepData?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      }
      const day = dailyMap.get(date)!;
      day.sleepHours = item.duration || 0;
    });

    // Process workout data
    reportData.workoutData?.workoutCalendar?.forEach((item: any) => {
      if (item.status === 'tracked') {
        const date = new Date(item.date).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            weight: 0,
            steps: 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            sleepHours: 0,
            workouts: []
          });
        }
        const day = dailyMap.get(date)!;
        day.workouts = [...(day.workouts || []), item];
      }
    });

    // Convert to sorted array
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
        const daysSinceStart = Math.floor(
          (dayDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceStart >= 7) {
          // Calculate averages for this week
          if (weekData.length > 0) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weeklyAverages.push({
              weekStart: weekStart.toISOString().split('T')[0],
              weekEnd: weekEnd.toISOString().split('T')[0],
              avgWeight: weekData.filter(d => d.weight > 0).reduce((s, d) => s + d.weight, 0) /
                (weekData.filter(d => d.weight > 0).length || 1),
              avgSteps: weekData.reduce((s, d) => s + d.steps, 0) / weekData.length,
              avgCalories: weekData.reduce((s, d) => s + d.calories, 0) / weekData.length,
              avgProtein: weekData.reduce((s, d) => s + d.protein, 0) / weekData.length,
              avgCarbs: weekData.reduce((s, d) => s + d.carbs, 0) / weekData.length,
              avgFats: weekData.reduce((s, d) => s + d.fats, 0) / weekData.length,
              avgSleepHours: weekData.filter(d => d.sleepHours > 0).reduce((s, d) => s + d.sleepHours, 0) /
                (weekData.filter(d => d.sleepHours > 0).length || 1)
            });
          }
          weekStart = dayDate;
          weekData = [];
        }
        weekData.push(day);
      }

      // Handle last partial week
      if (weekData.length > 0) {
        const weekEnd = new Date(weekData[weekData.length - 1].date);
        weeklyAverages.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          avgWeight: weekData.filter(d => d.weight > 0).reduce((s, d) => s + d.weight, 0) /
            (weekData.filter(d => d.weight > 0).length || 1),
          avgSteps: weekData.reduce((s, d) => s + d.steps, 0) / weekData.length,
          avgCalories: weekData.reduce((s, d) => s + d.calories, 0) / weekData.length,
          avgProtein: weekData.reduce((s, d) => s + d.protein, 0) / weekData.length,
          avgCarbs: weekData.reduce((s, d) => s + d.carbs, 0) / weekData.length,
          avgFats: weekData.reduce((s, d) => s + d.fats, 0) / weekData.length,
          avgSleepHours: weekData.filter(d => d.sleepHours > 0).reduce((s, d) => s + d.sleepHours, 0) /
            (weekData.filter(d => d.sleepHours > 0).length || 1)
        });
      }
    }

    return { dailyData, weeklyAverages };
  }, [reportData]);

  // Use the analytics hook
  const { consistencyAnalysis, bestDay, dataAvailability } = useReportAnalytics(
    processedData.dailyData,
    processedData.weeklyAverages
  );

  // Prepare data for components
  const weightData = React.useMemo(() => {
    if (!consistencyAnalysis) {
      return {
        startWeight: 0,
        currentWeight: 0,
        lowestWeight: 0,
        trend: 'stable' as const,
        weeklyChange: 0
      };
    }

    // Use weekly average trend (smooths out daily noise)
    // This matches the Weekly Progress Summary calculation
    const weeklyChange = consistencyAnalysis.weight.weeklyTrend;

    const trend: 'up' | 'down' | 'stable' = weeklyChange < -0.1 ? 'down' :
      weeklyChange > 0.1 ? 'up' : 'stable';

    return {
      startWeight: consistencyAnalysis.weight.start,
      currentWeight: consistencyAnalysis.weight.latest,
      lowestWeight: consistencyAnalysis.weight.min,
      trend,
      weeklyChange
    };
  }, [consistencyAnalysis]);

  const weeklyData = React.useMemo(() => {
    if (!consistencyAnalysis) {
      return {
        workoutsCompleted: 0,
        workoutsScheduled: 0,
        avgDailySteps: 0,
        stepsGoal: 10000,
        avgCalories: 0,
        avgProtein: 0
      };
    }

    return {
      workoutsCompleted: consistencyAnalysis.workouts.totalWorkouts,
      workoutsScheduled: consistencyAnalysis.workouts.scheduledWorkouts,
      avgDailySteps: Math.round(consistencyAnalysis.steps.avg),
      stepsGoal: 10000,
      avgCalories: consistencyAnalysis.calories.avg,
      avgProtein: consistencyAnalysis.protein.avg
    };
  }, [consistencyAnalysis]);

  // Download function
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const elementId = activeTab === 'summary' ? 'share-progress-summary' :
        activeTab === 'weight' ? 'share-weight-chart' :
        activeTab === 'weekly' ? 'share-weekly-highlights' : 'share-full-report';

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const canvas = await import('html-to-image');
      const dataUrl = await canvas.toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `${clientName.replace(/\s+/g, '-')}-${activeTab}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [activeTab, clientName]);

  // Copy to clipboard function
  const handleCopy = useCallback(async () => {
    try {
      const elementId = activeTab === 'summary' ? 'share-progress-summary' :
        activeTab === 'weight' ? 'share-weight-chart' :
        activeTab === 'weekly' ? 'share-weekly-highlights' : 'share-full-report';

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const canvas = await import('html-to-image');
      const blob = await canvas.toBlob(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [activeTab]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'weight', label: 'Weight', icon: <Scale className="w-4 h-4" /> },
    { id: 'weekly', label: 'Weekly', icon: <Calendar className="w-4 h-4" /> },
    { id: 'full', label: 'Full Report', icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-bg-secondary rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto ${
            activeTab === 'full' ? 'max-w-5xl' : 'max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-accent-purple/10 to-accent-violet/10">
            <h2 className="text-lg font-bold text-white">Share Progress</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 bg-base-300/50 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent-purple text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="flex justify-center">
              {activeTab === 'summary' && (
                <ShareProgressSummaryCard
                  clientName={clientName}
                  dateRangeStart={dateRangeStart}
                  dateRangeEnd={dateRangeEnd}
                  weightData={weightData}
                  workoutsCompleted={consistencyAnalysis?.workouts.totalWorkouts || 0}
                  consistencyScore={consistencyAnalysis?.overallScore || 0}
                />
              )}
              {activeTab === 'weight' && (
                <ShareWeightProgressChart
                  dailyData={processedData.dailyData.map(d => ({ date: d.date, weight: d.weight }))}
                  weeklyAverages={processedData.weeklyAverages.map(w => ({
                    weekStart: w.weekStart,
                    avgWeight: w.avgWeight
                  }))}
                  goalWeight={goalWeight}
                  clientName={clientName}
                  dateRangeStart={dateRangeStart}
                  dateRangeEnd={dateRangeEnd}
                />
              )}
              {activeTab === 'weekly' && (
                <ShareWeeklyHighlightsCard
                  clientName={clientName}
                  dateRangeStart={dateRangeStart}
                  dateRangeEnd={dateRangeEnd}
                  weeklyData={weeklyData}
                  weightChange={weightData.weeklyChange}
                />
              )}
              {activeTab === 'full' && (
                <div
                  id="share-full-report"
                  className="bg-white rounded-2xl shadow-lg overflow-hidden p-8"
                  style={{ width: '1100px' }}
                >
                  {/* Header */}
                  <div className="mb-6">
                    <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mb-4" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{clientName}</h2>
                        <p className="text-sm text-gray-500">
                          Progress Report: {new Date(dateRangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(dateRangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-side layout */}
                  <div className="flex gap-6 items-start">
                    {/* Left column: Weekly Highlights */}
                    <div style={{ width: '400px', flexShrink: 0 }}>
                      <ShareWeeklyHighlightsCard
                        clientName={clientName}
                        dateRangeStart={dateRangeStart}
                        dateRangeEnd={dateRangeEnd}
                        weeklyData={weeklyData}
                        weightChange={weightData.weeklyChange}
                        isScreenshotMode={true}
                        hideFooter={true}
                        hideHeader={true}
                      />
                    </div>

                    {/* Right column: Weight Chart */}
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <ShareWeightProgressChart
                        dailyData={processedData.dailyData.map(d => ({ date: d.date, weight: d.weight }))}
                        weeklyAverages={processedData.weeklyAverages.map(w => ({
                          weekStart: w.weekStart,
                          avgWeight: w.avgWeight
                        }))}
                        goalWeight={goalWeight}
                        clientName={clientName}
                        dateRangeStart={dateRangeStart}
                        dateRangeEnd={dateRangeEnd}
                        isScreenshotMode={true}
                        hideFooter={true}
                        hideHeader={true}
                        hideWeightChange={true}
                      />
                    </div>
                  </div>

                  {/* Branding Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400">Powered by FitReport</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t border-white/10 bg-base-300/30">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent-purple hover:bg-accent-purple/80 text-white font-medium transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Image
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg glass border border-white/20 hover:border-accent-purple/50 text-white font-medium transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
