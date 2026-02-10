'use client';

import React, { useState, useCallback } from 'react';
import { X, Download, Copy, Check, BarChart3, Scale, Calendar, FileText, Share2, FileDown } from 'lucide-react';
import ShareProgressSummaryCard from './ShareProgressSummaryCard';
import ShareWeightProgressChart from './ShareWeightProgressChart';
import ShareWeeklyHighlightsCard from './ShareWeeklyHighlightsCard';
import SocialShareCard from './SocialShareCard';
import { useReportAnalytics, DailyData, WeeklyAverage } from '@/hooks/useReportAnalytics';
import { useBrandConfig } from '@/hooks/useBrandConfig';

interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: any;
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  goalWeight?: number;
}

type TabType = 'summary' | 'weight' | 'weekly' | 'social' | 'full';

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [unitPreference, setUnitPreference] = useState<'lbs' | 'kg'>('lbs');
  const [socialAspect, setSocialAspect] = useState<'square' | 'story'>('square');
  const { brand } = useBrandConfig();

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
      day.carbs = item.carbsGrams || 0;
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

    // Calculate weekly change from actual first/last weight measurements
    // This avoids issues where weeklyAverages may have entries with avgWeight = 0
    // (weeks that have nutrition/steps data but no weight measurements)
    let weeklyChange = 0;
    const weightsWithData = processedData.dailyData.filter(d => d.weight > 0);
    if (weightsWithData.length >= 2) {
      const firstWeight = weightsWithData[0].weight;
      const lastWeight = weightsWithData[weightsWithData.length - 1].weight;
      const firstDate = new Date(weightsWithData[0].date);
      const lastDate = new Date(weightsWithData[weightsWithData.length - 1].date);
      const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const weeksBetween = daysBetween / 7;

      if (weeksBetween > 0) {
        weeklyChange = (lastWeight - firstWeight) / weeksBetween;
      }
    }

    const trend: 'up' | 'down' | 'stable' = weeklyChange < -0.1 ? 'down' :
      weeklyChange > 0.1 ? 'up' : 'stable';

    return {
      startWeight: consistencyAnalysis.weight.start,
      currentWeight: consistencyAnalysis.weight.latest,
      lowestWeight: consistencyAnalysis.weight.min,
      trend,
      weeklyChange
    };
  }, [consistencyAnalysis, processedData.dailyData]);

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
        activeTab === 'weekly' ? 'share-weekly-highlights' :
        activeTab === 'social' ? 'share-social-card' : 'share-full-report';

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const canvas = await import('html-to-image');
      const dataUrl = await canvas.toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: activeTab === 'social' ? undefined : '#ffffff'
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
        activeTab === 'weekly' ? 'share-weekly-highlights' :
        activeTab === 'social' ? 'share-social-card' : 'share-full-report';

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Element not found');

      const canvas = await import('html-to-image');
      const blob = await canvas.toBlob(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: activeTab === 'social' ? undefined : '#ffffff'
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

  // PDF export function - captures the full report as a PDF
  const handlePdfExport = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      // Temporarily switch to full report tab to render it
      const prevTab = activeTab;
      if (activeTab !== 'full') {
        setActiveTab('full');
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const element = document.getElementById('share-full-report');
      if (!element) throw new Error('Full report element not found');

      const htmlToImage = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      // Create PDF from the image
      const { default: jsPDF } = await import('jspdf');

      // Get element dimensions
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;

      // Create landscape PDF sized to the content
      const pdfWidth = 297; // A4 landscape width in mm
      const scale = pdfWidth / elementWidth;
      const pdfHeight = elementHeight * scale;

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${clientName.replace(/\s+/g, '-')}-report-${new Date().toISOString().split('T')[0]}.pdf`);

      // Restore previous tab
      if (prevTab !== 'full') {
        setActiveTab(prevTab);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExportingPdf(false);
    }
  }, [activeTab, clientName]);

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
    { id: 'social', label: 'Social', icon: <Share2 className="w-4 h-4" /> },
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
            activeTab === 'full' ? 'max-w-5xl' : activeTab === 'social' && socialAspect === 'story' ? 'max-w-3xl' : 'max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600/10 to-blue-700/10">
            <h2 className="text-lg font-bold text-gray-900">Share Progress</h2>
            <div className="flex items-center gap-3">
              {/* Unit Toggle */}
              <div className="flex items-center gap-0.5 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => setUnitPreference('lbs')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    unitPreference === 'lbs'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  lbs
                </button>
                <button
                  onClick={() => setUnitPreference('kg')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    unitPreference === 'kg'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  kg
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 bg-gray-200/50 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
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
                  unitPreference={unitPreference}
                  brand={brand}
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
                  unitPreference={unitPreference}
                  brand={brand}
                />
              )}
              {activeTab === 'weekly' && (
                <ShareWeeklyHighlightsCard
                  clientName={clientName}
                  dateRangeStart={dateRangeStart}
                  dateRangeEnd={dateRangeEnd}
                  weeklyData={weeklyData}
                  weightChange={weightData.weeklyChange}
                  unitPreference={unitPreference}
                  brand={brand}
                />
              )}
              {activeTab === 'social' && (
                <div>
                  {/* Aspect ratio toggle */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs text-gray-500">Format:</span>
                    <div className="flex items-center gap-0.5 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                      <button
                        onClick={() => setSocialAspect('square')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          socialAspect === 'square'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        Square (1:1)
                      </button>
                      <button
                        onClick={() => setSocialAspect('story')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          socialAspect === 'story'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        Story (9:16)
                      </button>
                    </div>
                  </div>
                  <SocialShareCard
                    clientName={clientName}
                    dateRangeStart={dateRangeStart}
                    dateRangeEnd={dateRangeEnd}
                    weightChange={weightData.weeklyChange}
                    currentWeight={weightData.currentWeight}
                    workoutsCompleted={consistencyAnalysis?.workouts.totalWorkouts || 0}
                    avgCalories={consistencyAnalysis?.calories.avg}
                    avgProtein={consistencyAnalysis?.protein.avg}
                    avgDailySteps={consistencyAnalysis ? Math.round(consistencyAnalysis.steps.avg) : undefined}
                    consistencyScore={consistencyAnalysis?.overallScore}
                    aspectRatio={socialAspect}
                    unitPreference={unitPreference}
                    brand={brand}
                  />
                </div>
              )}
              {activeTab === 'full' && (
                <div
                  id="share-full-report"
                  className="bg-white rounded-2xl shadow-lg overflow-hidden p-8"
                  style={{ width: '1100px' }}
                >
                  {/* Header */}
                  <div className="mb-6">
                    <div
                      className="h-1 w-16 rounded-full mb-4"
                      style={{ background: `linear-gradient(to right, ${brand.primary_color}, ${brand.accent_color})` }}
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        {brand.logo_url && (
                          <img src={brand.logo_url} alt="" className="h-8 object-contain mb-2" />
                        )}
                        {brand.business_name && (
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{brand.business_name}</p>
                        )}
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
                        unitPreference={unitPreference}
                        brand={brand}
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
                        unitPreference={unitPreference}
                        brand={brand}
                      />
                    </div>
                  </div>

                  {/* Branding Footer */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    {brand.footer_text && (
                      <p className="text-xs text-gray-500 text-center whitespace-pre-line mb-1">{brand.footer_text}</p>
                    )}
                    {brand.show_fitreport_badge && (
                      <div className="flex items-center justify-center">
                        <span className="text-xs text-gray-400">Powered by FitReport</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-4 border-t border-gray-200 bg-gray-200/30">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-600/80 text-white font-medium transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Image
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-gray-200 hover:border-blue-600/50 text-gray-900 font-medium transition-colors"
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
            <button
              onClick={handlePdfExport}
              disabled={isExportingPdf}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-gray-200 hover:border-blue-600/50 text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              {isExportingPdf ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
