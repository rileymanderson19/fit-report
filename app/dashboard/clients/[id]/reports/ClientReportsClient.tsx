'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/libs/supabase/client';

// Lazy-load ReportVisualization for Snapshots tab
const ReportVisualization = dynamic(
  () => import('@/components/ReportVisualization').then(mod => ({ default: mod.ReportVisualization })),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-accent-purple"></span>
      </div>
    ),
    ssr: false
  }
);
import { SevenDayReference } from '@/components/SevenDayReference';
import { DateRangePicker } from '@/components/DateRangePicker';
import ClientSearchBar from '@/components/ClientSearchBar';
import SendReportModal from '@/components/SendReportModal';
import GenerateLinkModal from '@/components/GenerateLinkModal';
import { ShareProgressModal, ShareWeeklyHighlightsCard, ShareWeightProgressChart } from '@/components/shareable';
import { useReportAnalytics, DailyData, WeeklyAverage } from '@/hooks/useReportAnalytics';
import { toast } from 'sonner';


interface Report {
  id: string;
  client_id: string;
  trainer_id: string;
  report_data: any;
  date_range_start: string;
  date_range_end: string;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trainerize_id: number;
  active: boolean;
}

interface ProgressPhoto {
  id: string;
  url: string;
  takenAt: string;
  pose?: string;
  isManualBaseline?: boolean;
}

interface PoseComparison {
  pose: string;
  baselinePhoto: ProgressPhoto | null;
  latestPhoto: ProgressPhoto | null;
}

interface ProgressPhotoSummary {
  firstPhoto: ProgressPhoto | null;
  latestPhoto: ProgressPhoto | null;
  poseComparisons: Record<string, PoseComparison>;
}

interface ClientReportsClientProps {
  clientId: string;
  initialClient?: Client | null;
  initialReports?: Report[];
  initialError?: string | null;
  initialLiveReportData?: any;
  initialLiveReportMetadata?: any;
}

// Trend calculation helper
interface TrendData {
  firstHalfAvg: number;
  secondHalfAvg: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
}

function calculateTrend(
  data: Array<{ date: string; value: number }>,
  startDate: Date,
  endDate: Date
): TrendData | null {
  if (!data || data.length === 0) return null;

  const midpoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  const firstHalf = data.filter(d => {
    const date = new Date(d.date);
    return date >= startDate && date < midpoint && d.value > 0;
  });
  const secondHalf = data.filter(d => {
    const date = new Date(d.date);
    return date >= midpoint && date <= endDate && d.value > 0;
  });

  if (firstHalf.length === 0 && secondHalf.length === 0) return null;

  // If only one half has data, show that as the average with no trend
  if (firstHalf.length === 0 || secondHalf.length === 0) {
    const allValid = data.filter(d => d.value > 0);
    if (allValid.length === 0) return null;
    const avg = allValid.reduce((s, d) => s + d.value, 0) / allValid.length;
    return {
      firstHalfAvg: avg,
      secondHalfAvg: avg,
      percentChange: 0,
      direction: 'stable'
    };
  }

  const firstAvg = firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length;
  const change = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  return {
    firstHalfAvg: firstAvg,
    secondHalfAvg: secondAvg,
    percentChange: change,
    direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable'
  };
}

export default function ClientReportsClient({
  clientId,
  initialClient = null,
  initialReports = [],
  initialError = null,
  initialLiveReportData = null,
  initialLiveReportMetadata = null
}: ClientReportsClientProps) {
  const supabase = createClient();
  const mountTimeRef = React.useRef<number>(performance.now());

  // Tab state
  const [activeTab, setActiveTab] = useState<'live' | 'snapshots'>('live');

  // Snapshot reports state
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(
    initialReports.length > 0 ? initialReports[0] : null
  );

  // Live report state
  const [liveReportData, setLiveReportData] = useState<any>(initialLiveReportData);
  const [liveReportMetadata, setLiveReportMetadata] = useState<any>(initialLiveReportMetadata);
  const [isGeneratingLive, setIsGeneratingLive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [minReps, setMinReps] = useState<number>(6);
  const [maxReps, setMaxReps] = useState<number>(10);
  const [reportTemplate, setReportTemplate] = useState<'daily' | 'enhanced'>('enhanced');

  // Client navigation state
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [nextClient, setNextClient] = useState<Client | null>(null);
  const [prevClient, setPrevClient] = useState<Client | null>(null);

  // Shared state
  const [client, setClient] = useState<Client | null>(initialClient);
  const [isLoading, setIsLoading] = useState(!initialClient);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Progress photos state
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [photoSummary, setPhotoSummary] = useState<ProgressPhotoSummary>({ firstPhoto: null, latestPhoto: null, poseComparisons: {} });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isSettingBaseline, setIsSettingBaseline] = useState(false);
  const [isSyncingAllPhotos, setIsSyncingAllPhotos] = useState(false);

  // Full Report copy state
  const [isFullReportCopied, setIsFullReportCopied] = useState(false);

  // Process report data for Full Report card
  const processedData = React.useMemo(() => {
    if (!liveReportData) return { dailyData: [], weeklyAverages: [] };

    const dailyMap = new Map<string, DailyData>();

    // Process nutrition data
    liveReportData.nutritionData?.nutrition?.forEach((item: any) => {
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
    liveReportData.healthData?.healthData?.forEach((item: any) => {
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
    liveReportData.bodyStats?.bodyStats?.forEach((item: any) => {
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
    liveReportData.sleepData?.sleepData?.forEach((item: any) => {
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
    liveReportData.workoutData?.workoutCalendar?.forEach((item: any) => {
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
  }, [liveReportData]);

  // Use the analytics hook for Full Report
  const { consistencyAnalysis } = useReportAnalytics(
    processedData.dailyData,
    processedData.weeklyAverages
  );

  // Prepare data for Full Report components
  const fullReportWeightData = React.useMemo(() => {
    if (!consistencyAnalysis) {
      return {
        startWeight: 0,
        currentWeight: 0,
        lowestWeight: 0,
        trend: 'stable' as const,
        weeklyChange: 0
      };
    }

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

  const fullReportWeeklyData = React.useMemo(() => {
    // Calculate average carbs and fats from weekly averages
    const weeklyAvgs = processedData.weeklyAverages;
    const avgCarbs = weeklyAvgs.length > 0
      ? weeklyAvgs.reduce((sum, w) => sum + w.avgCarbs, 0) / weeklyAvgs.length
      : 0;
    const avgFats = weeklyAvgs.length > 0
      ? weeklyAvgs.reduce((sum, w) => sum + w.avgFats, 0) / weeklyAvgs.length
      : 0;

    if (!consistencyAnalysis) {
      return {
        workoutsCompleted: 0,
        workoutsScheduled: 0,
        avgDailySteps: 0,
        stepsGoal: 10000,
        avgCalories: 0,
        avgProtein: 0,
        avgCarbs,
        avgFats
      };
    }

    return {
      workoutsCompleted: consistencyAnalysis.workouts.totalWorkouts,
      workoutsScheduled: consistencyAnalysis.workouts.scheduledWorkouts,
      avgDailySteps: Math.round(consistencyAnalysis.steps.avg),
      stepsGoal: 10000,
      avgCalories: consistencyAnalysis.calories.avg,
      avgProtein: consistencyAnalysis.protein.avg,
      avgCarbs,
      avgFats
    };
  }, [consistencyAnalysis, processedData.weeklyAverages]);

  // Set default date range: last 14 days ending yesterday
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const fourteenDaysAgo = new Date(yesterday);
    fourteenDaysAgo.setDate(yesterday.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    setStartDate(fourteenDaysAgo);
    setEndDate(yesterday);

    // Hydrate from localStorage if no initial data and localStorage is available
    if (!initialLiveReportData && typeof window !== 'undefined' && window.localStorage) {
      try {
        const localStorageKey = `liveReport_${clientId}_${fourteenDaysAgo.toISOString()}_${yesterday.toISOString()}_enhanced_6-10`;
        const cached = localStorage.getItem(localStorageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 24 hours old
          const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
          if (cacheAge < 24 * 60 * 60 * 1000) {
            setLiveReportData(parsed.data);
            setLiveReportMetadata({
              ...parsed.metadata,
              cached: true,
              fromLocalStorage: true
            });
            console.log('[LOCAL CACHE] Hydrated from localStorage');
          } else {
            localStorage.removeItem(localStorageKey);
          }
        }
      } catch (error) {
        console.error('[LOCAL CACHE] Error loading from localStorage:', error);
      }
    }
  }, [clientId, initialLiveReportData]);

  useEffect(() => {
    // Only fetch if we don't have initial data (e.g., for legacy routes or client-side navigation)
    if (!initialClient) {
      const fetchClientAndReports = async () => {
        const fetchStart = performance.now();
        try {
          // Fetch client details
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

          if (clientError) throw clientError;
          setClient(clientData);

          // Fetch reports for this client
          const { data: reportsData, error: reportsError } = await supabase
            .from('reports')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

          if (reportsError) throw reportsError;
          setReports(reportsData || []);

          // Set the first report as selected if available
          if (reportsData && reportsData.length > 0) {
            setSelectedReport(reportsData[0]);
          }

          const fetchTime = performance.now() - fetchStart;
          const totalTime = performance.now() - mountTimeRef.current;
          console.log('[PERF CLIENT] Client & reports loaded (client-side):', {
            fetchTime: `${fetchTime.toFixed(2)}ms`,
            totalFromMount: `${totalTime.toFixed(2)}ms`
          });
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to fetch client reports');
        } finally {
          setIsLoading(false);
        }
      };

      fetchClientAndReports();
    } else {
      // We have server-loaded data
      const totalTime = performance.now() - mountTimeRef.current;
      console.log('[PERF CLIENT] Using server-loaded data, ready at:', {
        totalFromMount: `${totalTime.toFixed(2)}ms`,
        hasCachedReport: !!initialLiveReportData
      });

      // Show toast if we have a cached report preloaded
      if (initialLiveReportData) {
        const generatedAt = new Date(initialLiveReportMetadata?.generatedAt);
        const hoursAgo = Math.round((Date.now() - generatedAt.getTime()) / (1000 * 60 * 60));
        toast.success(`Loaded cached report from ${hoursAgo}h ago`, { duration: 3000 });

        // Background refresh check after a short delay
        setTimeout(() => {
          checkForNewerCache();
        }, 2000);
      }
    }
  }, [supabase, clientId, initialClient, initialLiveReportData, initialLiveReportMetadata]);

  // Auto-generate live report on load (but only if no cached data from server)
  // With our caching optimizations, this will be fast:
  // - 80-90% hit precomputed cache (sub-second)
  // - Cold generation benefits from Trainerize response caching
  // - Page shell already rendered, so UX is still instant
  useEffect(() => {
    if (startDate && endDate && client && activeTab === 'live' && !liveReportData) {
      generateLiveReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, client, activeTab]);

  const handleDeleteReport = async (report: Report) => {
    setReportToDelete(report);
    (document.getElementById('delete-modal') as HTMLDialogElement)?.showModal();
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    setIsDeleting(reportToDelete.id);
    try {
      const response = await fetch(`/api/reports/delete?id=${reportToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete report');
      }

      // Remove the report from the state
      setReports(reports.filter(r => r.id !== reportToDelete.id));
      
      // If the deleted report was selected, select the first available report
      if (selectedReport?.id === reportToDelete.id) {
        const remainingReports = reports.filter(r => r.id !== reportToDelete.id);
        setSelectedReport(remainingReports.length > 0 ? remainingReports[0] : null);
      }

      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete report');
    } finally {
      setIsDeleting(null);
      setReportToDelete(null);
      (document.getElementById('delete-modal') as HTMLDialogElement)?.close();
    }
  };

  const cancelDelete = () => {
    setReportToDelete(null);
    (document.getElementById('delete-modal') as HTMLDialogElement)?.close();
  };

  const handleDeleteWorkout = async (workoutId: number) => {
    if (!selectedReport) return;
    
    try {
      // Create a deep copy of the report data
      const newReportData = JSON.parse(JSON.stringify(selectedReport.report_data));
      
      // Remove the workout from workoutData
      newReportData.workoutData.workouts = newReportData.workoutData.workouts.filter(
        (w: any) => w.id !== workoutId
      );

      // Update the report in Supabase
      const { error } = await supabase
        .from('reports')
        .update({ report_data: newReportData })
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Update local state
      setSelectedReport({
        ...selectedReport,
        report_data: newReportData
      });

      // Update reports list
      setReports(reports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, report_data: newReportData }
          : report
      ));

      toast.success('Workout deleted successfully');
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Failed to delete workout');
    }
  };

  const handleDeleteExercise = async (workoutId: number, exerciseName: string) => {
    if (!selectedReport) return;
    
    try {
      // Create a deep copy of the report data
      const newReportData = JSON.parse(JSON.stringify(selectedReport.report_data));
      
      // Find the workout and remove the exercise
      newReportData.workoutData.workouts = newReportData.workoutData.workouts.map((workout: any) => {
        if (workout.id === workoutId) {
          return {
            ...workout,
            exercises: workout.exercises.filter((e: any) => e.name !== exerciseName)
          };
        }
        return workout;
      });

      // Update the report in Supabase
      const { error } = await supabase
        .from('reports')
        .update({ report_data: newReportData })
        .eq('id', selectedReport.id);

      if (error) throw error;

      // Update local state
      setSelectedReport({
        ...selectedReport,
        report_data: newReportData
      });

      // Update reports list
      setReports(reports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, report_data: newReportData }
          : report
      ));

      toast.success('Exercise deleted successfully');
    } catch (error) {
      console.error('Error deleting exercise:', error);
      toast.error('Failed to delete exercise');
    }
  };

  const captureAndSendReport = async () => {
    if (!selectedReport || !client) return;
    
    setIsCapturing(true);
    try {
      // Import mobile optimization utilities
      const { captureReportWithMobileOptimization } = await import('@/utils/mobileImageCapture');
      
      // Generate filename
      const filename = `${client.first_name}_${client.last_name}_report_${new Date().toISOString().split('T')[0]}.png`;
      
      // Use mobile-optimized capture
      await captureReportWithMobileOptimization('report-container', filename);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error capturing report:', error);
      toast.error('Failed to capture report');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeleteAllReports = () => {
    (document.getElementById('delete-all-modal') as HTMLDialogElement)?.showModal();
  };

  const confirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch(`/api/reports/delete-all?clientId=${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete reports');
      }

      // Clear all reports from state
      setReports([]);
      setSelectedReport(null);
      toast.success('All reports deleted successfully');
    } catch (error) {
      console.error('Error deleting reports:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete reports');
    } finally {
      setIsDeletingAll(false);
      (document.getElementById('delete-all-modal') as HTMLDialogElement)?.close();
    }
  };

  const cancelDeleteAll = () => {
    (document.getElementById('delete-all-modal') as HTMLDialogElement)?.close();
  };

  const handleGenerateLink = () => {
    if (!selectedReport || !client) {
      toast.error('Please select a report first');
      return;
    }
    setIsLinkModalOpen(true);
  };

  const checkForNewerCache = async () => {
    if (!startDate || !endDate || !client || !liveReportData) {
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString()
          },
          template: reportTemplate,
          repRange: {
            min: minReps,
            max: maxReps
          },
          mode: 'cache-only' // Only check cache, don't generate
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reportData) {
          // Check if this cache is newer than what we have
          const currentGeneratedAt = liveReportMetadata?.generatedAt ? new Date(liveReportMetadata.generatedAt).getTime() : 0;
          const newGeneratedAt = data.metadata?.generatedAt ? new Date(data.metadata.generatedAt).getTime() : 0;

          if (newGeneratedAt > currentGeneratedAt) {
            setLiveReportData(data.reportData);
            setLiveReportMetadata(data.metadata);
            toast.success('Report updated with latest data', { duration: 2000 });
          }
        }
      }
      // Ignore 202 responses (no cache available)
    } catch (error) {
      console.error('[BACKGROUND REFRESH] Error checking for newer cache:', error);
      // Silent failure for background refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateLiveReport = async () => {
    if (!startDate || !endDate || !client) {
      toast.error('Please select a date range');
      return;
    }

    const reportGenStart = performance.now();
    setIsGeneratingLive(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString()
          },
          template: reportTemplate,
          repRange: {
            min: minReps,
            max: maxReps
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      const data = await response.json();
      setLiveReportData(data.reportData);
      setLiveReportMetadata(data.metadata);

      // Store in localStorage for fast hydration on next visit
      if (typeof window !== 'undefined' && window.localStorage && data.reportData) {
        try {
          const localStorageKey = `liveReport_${clientId}_${startDate.toISOString()}_${endDate.toISOString()}_${reportTemplate}_${minReps}-${maxReps}`;
          localStorage.setItem(localStorageKey, JSON.stringify({
            data: data.reportData,
            metadata: data.metadata,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('[LOCAL CACHE] Error storing to localStorage:', error);
        }
      }

      const reportGenTime = performance.now() - reportGenStart;
      const totalTime = performance.now() - mountTimeRef.current;
      console.log('[PERF CLIENT] Live report generated:', {
        reportGenTime: `${reportGenTime.toFixed(2)}ms`,
        totalFromMount: `${totalTime.toFixed(2)}ms`,
        cached: data.cached
      });

      if (data.cached) {
        toast.success('Loaded cached report');
      } else {
        toast.success('Report generated successfully');
      }
    } catch (error) {
      console.error('Error generating live report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGeneratingLive(false);
    }
  };

  const saveSnapshot = async () => {
    if (!liveReportData || !client) {
      toast.error('No live report to save');
      return;
    }

    setIsSavingSnapshot(true);
    try {
      const response = await fetch('/api/reports/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          reportData: liveReportData,
          dateRange: {
            from: startDate!.toISOString(),
            to: endDate!.toISOString()
          },
          repRange: {
            min: minReps,
            max: maxReps
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save snapshot');
      }

      const data = await response.json();

      // Refresh the snapshots list
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (!reportsError && reportsData) {
        setReports(reportsData);
      }

      toast.success('Snapshot saved successfully');
    } catch (error) {
      console.error('Error saving snapshot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save snapshot');
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  // Fetch progress photos when live tab + date range active
  useEffect(() => {
    if (activeTab !== 'live' || !client || !startDate || !endDate || !client.trainerize_id) return;

    const fetchPhotos = async () => {
      setIsLoadingPhotos(true);
      setPhotosError(null);
      try {
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const response = await fetch('/api/trainerize/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            trainerizeUserId: client.trainerize_id,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Failed to load photos' }));
          throw new Error(errData.error || 'Failed to load photos');
        }

        const data = await response.json();
        setProgressPhotos(data.photos || []);
        setPhotoSummary({
          firstPhoto: data.firstPhoto || null,
          latestPhoto: data.latestPhoto || null,
          poseComparisons: data.poseComparisons || {},
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load photos';
        setPhotosError(message);
        console.error('[photos] Error fetching progress photos:', error);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    fetchPhotos();
  }, [activeTab, client, startDate, endDate, clientId]);

  // Baseline photo handlers
  const handleSetBaseline = async (photo: ProgressPhoto) => {
    if (!client || isSettingBaseline) return;
    setIsSettingBaseline(true);
    try {
      const response = await fetch('/api/trainerize/photos/baseline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          pose: photo.pose || 'unknown',
          photoId: photo.id,
          photoUrl: photo.url,
          photoTakenAt: photo.takenAt,
        }),
      });
      if (!response.ok) throw new Error('Failed to set baseline');
      const data = await response.json();
      // Update the specific pose comparison in state
      if (data.poseComparison) {
        setPhotoSummary(prev => ({
          ...prev,
          poseComparisons: {
            ...prev.poseComparisons,
            [photo.pose || 'unknown']: data.poseComparison,
          },
        }));
      }
      toast.success(`Baseline set for ${photo.pose || 'unknown'} pose`);
    } catch (error) {
      toast.error('Failed to set baseline photo');
      console.error('[baseline] Error setting baseline:', error);
    } finally {
      setIsSettingBaseline(false);
    }
  };

  const handleClearBaseline = async (pose: string) => {
    if (!client || isSettingBaseline) return;
    setIsSettingBaseline(true);
    try {
      const response = await fetch('/api/trainerize/photos/baseline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          pose,
          photoId: null,
          photoUrl: null,
          photoTakenAt: null,
        }),
      });
      if (!response.ok) throw new Error('Failed to clear baseline');
      const data = await response.json();
      // Update the specific pose comparison in state
      if (data.poseComparison) {
        setPhotoSummary(prev => ({
          ...prev,
          poseComparisons: {
            ...prev.poseComparisons,
            [pose]: data.poseComparison,
          },
        }));
      }
      toast.success(`Baseline cleared for ${pose} pose`);
    } catch (error) {
      toast.error('Failed to clear baseline');
      console.error('[baseline] Error clearing baseline:', error);
    } finally {
      setIsSettingBaseline(false);
    }
  };

  // Sync all photos handler - fetches complete photo history
  const handleSyncAllPhotos = async () => {
    if (!client || isSyncingAllPhotos || !client.trainerize_id) return;
    setIsSyncingAllPhotos(true);
    try {
      const response = await fetch('/api/trainerize/photos/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          trainerizeUserId: client.trainerize_id,
        }),
      });
      if (!response.ok) throw new Error('Failed to sync photos');
      const data = await response.json();
      // Update pose comparisons with synced data
      if (data.poseComparisons) {
        setPhotoSummary(prev => ({
          ...prev,
          poseComparisons: data.poseComparisons,
        }));
      }
      const earliestYear = data.earliestDate ? new Date(data.earliestDate).getFullYear() : null;
      toast.success(
        earliestYear
          ? `Synced ${data.totalPhotos} photos (first from ${earliestYear})`
          : `Synced ${data.totalPhotos} photos`
      );
    } catch (error) {
      toast.error('Failed to sync all photos');
      console.error('[sync-all] Error syncing photos:', error);
    } finally {
      setIsSyncingAllPhotos(false);
    }
  };

  // Copy Full Report to clipboard
  const handleCopyFullReport = async () => {
    try {
      const element = document.getElementById('full-report-card');
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
        setIsFullReportCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setIsFullReportCopied(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Fetch all clients for navigation
  useEffect(() => {
    const fetchAllClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('active', true)
          .order('first_name', { ascending: true });

        if (error) throw error;

        const clients = data || [];
        setAllClients(clients);

        // Find current client index
        const currentIndex = clients.findIndex(c => c.id === clientId);
        if (currentIndex !== -1) {
          // Set next client (wrap around to first if at end)
          const nextIndex = (currentIndex + 1) % clients.length;
          setNextClient(clients[nextIndex]);

          // Set previous client (wrap around to last if at beginning)
          const prevIndex = currentIndex === 0 ? clients.length - 1 : currentIndex - 1;
          setPrevClient(clients[prevIndex]);
        }
      } catch (error) {
        console.error('Error fetching all clients:', error);
      }
    };

    fetchAllClients();
  }, [supabase, clientId]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg text-accent-purple"></span>
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="p-8">
        <div className="glass border border-red-500/30 bg-red-500/10 p-4 rounded-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-gray-300">{initialError}</span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="glass border border-red-500/30 bg-red-500/10 p-4 rounded-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-gray-300">Client not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Client Search Bar */}
      <div className="mb-6">
        <ClientSearchBar
          currentClientId={clientId}
          placeholder="Search clients to quickly navigate..."
          className="max-w-lg"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b border-white/10">
          <button
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'live'
                ? 'text-accent-purple border-b-2 border-accent-purple'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('live')}
          >
            Live Report
          </button>
          <button
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'snapshots'
                ? 'text-accent-purple border-b-2 border-accent-purple'
                : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('snapshots')}
          >
            Snapshots {reports.length > 0 && `(${reports.length})`}
          </button>
        </div>
      </div>

      {/* Live Report Tab */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* Report Configuration */}
          <div className="card-elevated border-2 border-white/10">
            <div className="card-body p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-purple" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                    </svg>
                    Report Configuration
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">Customize your report settings</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Date Range - Full Width */}
                <div className="glass border border-white/10 p-4 rounded-lg">
                  <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-purple" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Date Range
                  </label>
                  <DateRangePicker
                    from={startDate || undefined}
                    to={endDate || undefined}
                    onSelect={(range) => {
                      setStartDate(range.from || null);
                      setEndDate(range.to || null);
                    }}
                    showPresets={true}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Template Selection */}
                  <div className="glass border border-white/10 p-4 rounded-lg">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-purple" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      Report Template
                    </label>
                    <select
                      className="bg-bg-secondary border border-white/20 text-white w-full px-4 py-3 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all"
                      value={reportTemplate}
                      onChange={(e) => setReportTemplate(e.target.value as 'daily' | 'enhanced')}
                    >
                      <option value="enhanced">Progress Report (AI Insights)</option>
                      <option value="daily">Daily Data (Detailed Breakdown)</option>
                    </select>
                  </div>

                  {/* Progressive Overload Range */}
                  <div className="glass border border-white/10 p-4 rounded-lg">
                    <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-purple" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                      </svg>
                      Rep Range ({minReps} - {maxReps})
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Min</label>
                        <input
                          type="number"
                          className="bg-bg-secondary border border-white/20 text-white w-full px-3 py-2 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all"
                          value={minReps}
                          onChange={(e) => setMinReps(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Max</label>
                        <input
                          type="number"
                          className="bg-bg-secondary border border-white/20 text-white w-full px-3 py-2 rounded-lg focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all"
                          value={maxReps}
                          onChange={(e) => setMaxReps(Math.max(minReps + 1, parseInt(e.target.value) || minReps + 1))}
                          min={minReps + 1}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                <button
                  className="btn-gradient px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 flex-1 hover:scale-105 transition-transform"
                  onClick={generateLiveReport}
                  disabled={isGeneratingLive || !startDate || !endDate}
                >
                  {isGeneratingLive ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span>Generate Report</span>
                    </>
                  )}
                </button>

                {liveReportData && (
                  <>
                    <button
                      className="glass border border-accent-purple/50 hover:border-accent-purple text-white px-8 py-3 rounded-lg font-medium hover:scale-105 transition-all"
                      onClick={saveSnapshot}
                      disabled={isSavingSnapshot}
                    >
                      {isSavingSnapshot ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          <span className="ml-2">Saving...</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                          </svg>
                          Save Snapshot
                        </span>
                      )}
                    </button>
                    <button
                      className="glass border border-green-500/50 hover:border-green-500 text-white px-8 py-3 rounded-lg font-medium hover:scale-105 transition-all"
                      onClick={() => setIsShareModalOpen(true)}
                    >
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                        Share Progress
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Client Navigation */}
          {allClients.length > 1 && (
            <div className="flex gap-3">
              {prevClient && (
                <a
                  href={`/dashboard/clients/${prevClient.id}/reports`}
                  className="glass border border-white/10 hover:border-accent-purple/50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 flex-1 hover:scale-105 transition-all group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-400">Previous</span>
                    <span className="text-sm">{prevClient.first_name} {prevClient.last_name}</span>
                  </div>
                </a>
              )}
              {nextClient && (
                <a
                  href={`/dashboard/clients/${nextClient.id}/reports`}
                  className="glass border border-white/10 hover:border-accent-purple/50 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 flex-1 hover:scale-105 transition-all group ml-auto"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400">Next</span>
                    <span className="text-sm">{nextClient.first_name} {nextClient.last_name}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Status message when no data */}
          {!liveReportData && !isGeneratingLive && (
            <div className="glass border border-white/10 rounded-lg p-6 text-center">
              <p className="text-gray-400">
                Click &quot;Generate Report&quot; to load data for this period
              </p>
            </div>
          )}

          {/* Full Report Card Section */}
          {liveReportData && startDate && endDate && client && (
            <div className="card-elevated">
              <div className="card-body p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Full Report</h2>
                  <button
                    onClick={handleCopyFullReport}
                    className="glass border border-white/20 hover:border-accent-purple/50 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                  >
                    {isFullReportCopied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
                <div
                  id="full-report-card"
                  className="bg-white rounded-2xl shadow-lg overflow-hidden p-8"
                >
                  {/* Header */}
                  <div className="mb-6">
                    <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mb-4" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h3>
                        <p className="text-sm text-gray-500">
                          Progress Report: {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-side layout */}
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left column: Weekly Highlights */}
                    <div className="w-full lg:w-[400px] flex-shrink-0">
                      <ShareWeeklyHighlightsCard
                        clientName={`${client.first_name} ${client.last_name}`}
                        dateRangeStart={startDate.toISOString()}
                        dateRangeEnd={endDate.toISOString()}
                        weeklyData={fullReportWeeklyData}
                        weightChange={fullReportWeightData.weeklyChange}
                        isScreenshotMode={true}
                        hideFooter={true}
                        hideHeader={true}
                        unitPreference="lbs"
                      />
                    </div>

                    {/* Right column: Weight Chart */}
                    <div className="flex-1 min-w-0 w-full">
                      <ShareWeightProgressChart
                        dailyData={processedData.dailyData.map(d => ({ date: d.date, weight: d.weight }))}
                        weeklyAverages={processedData.weeklyAverages.map(w => ({
                          weekStart: w.weekStart,
                          avgWeight: w.avgWeight
                        }))}
                        clientName={`${client.first_name} ${client.last_name}`}
                        dateRangeStart={startDate.toISOString()}
                        dateRangeEnd={endDate.toISOString()}
                        isScreenshotMode={true}
                        hideFooter={true}
                        hideHeader={true}
                        hideWeightChange={true}
                        unitPreference="lbs"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Progress Photos Section */}
          <div className="card-elevated">
            <div className="card-body p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Progress Photos</h2>
                  <p className="text-sm text-gray-400 mt-1">Visual changes for this report period and all-time snapshots</p>
                </div>
                {client?.trainerize_id && (
                  <button
                    className="glass border border-white/20 hover:border-accent-purple/50 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                    onClick={handleSyncAllPhotos}
                    disabled={isSyncingAllPhotos}
                    title="Fetch all photos from Trainerize to find the true first photo"
                  >
                    {isSyncingAllPhotos ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>Sync All Photos</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {isLoadingPhotos ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg text-accent-purple"></span>
                </div>
              ) : photosError ? (
                <div className="glass border border-yellow-500/30 bg-yellow-500/10 p-4 rounded-lg flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 text-yellow-500 mt-0.5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  <span className="text-gray-300 text-sm">{photosError}</span>
                </div>
              ) : Object.keys(photoSummary.poseComparisons).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No progress photos available yet for this client.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(photoSummary.poseComparisons)
                    .filter(([, comp]) => comp.baselinePhoto || comp.latestPhoto)
                    .sort(([a], [b]) => {
                      const order = ['front', 'side', 'back', 'unknown'];
                      return order.indexOf(a) - order.indexOf(b);
                    })
                    .map(([pose, comparison]) => (
                      <div key={pose} className="glass border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-accent-purple uppercase tracking-wide">
                            {pose === 'unknown' ? 'Other' : pose}
                          </span>
                          {comparison.baselinePhoto?.isManualBaseline && (
                            <button
                              className="text-[10px] text-gray-500 hover:text-red-400 underline"
                              onClick={() => handleClearBaseline(pose)}
                              disabled={isSettingBaseline}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {comparison.baselinePhoto && (
                            <div>
                              <button
                                className="w-full aspect-[3/4] overflow-hidden cursor-pointer bg-black/40 rounded-lg"
                                onClick={() => setSelectedPhotoUrl(comparison.baselinePhoto!.url)}
                              >
                                <img
                                  src={comparison.baselinePhoto.url}
                                  alt={`${pose} baseline`}
                                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                                />
                              </button>
                              <p className="text-[10px] text-gray-400 text-center mt-1">
                                {new Date(comparison.baselinePhoto.takenAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {comparison.latestPhoto && (
                            <div>
                              <button
                                className="w-full aspect-[3/4] overflow-hidden cursor-pointer bg-black/40 rounded-lg"
                                onClick={() => setSelectedPhotoUrl(comparison.latestPhoto!.url)}
                              >
                                <img
                                  src={comparison.latestPhoto.url}
                                  alt={`${pose} latest`}
                                  className="w-full h-full object-contain hover:scale-105 transition-transform"
                                />
                              </button>
                              <p className="text-[10px] text-green-400 text-center mt-1">
                                {new Date(comparison.latestPhoto.takenAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Photo Lightbox */}
          {selectedPhotoUrl && (
            <dialog className="modal modal-open" onClick={() => setSelectedPhotoUrl(null)}>
              <div className="modal-box max-w-4xl bg-bg-secondary p-2" onClick={(e) => e.stopPropagation()}>
                <button
                  className="absolute top-3 right-3 z-10 glass border border-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center hover:border-accent-purple transition-all"
                  onClick={() => setSelectedPhotoUrl(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <img
                  src={selectedPhotoUrl}
                  alt="Progress photo full size"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <form method="dialog" className="modal-backdrop">
                <button onClick={() => setSelectedPhotoUrl(null)}>close</button>
              </form>
            </dialog>
          )}

          {/* Period Trends Section */}
          {liveReportData && startDate && endDate && (
            <div className="card-elevated">
              <div className="card-body p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Period Trends
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({startDate.toLocaleDateString()} - {endDate.toLocaleDateString()})
                  </span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Weight Trend */}
                  {(() => {
                    const weights = (liveReportData?.bodyStats?.bodyStats || []).map((w: any) => ({
                      date: w.date,
                      value: w.weight || 0
                    }));
                    const trend = calculateTrend(weights, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // For weight, down is often good (fat loss)
                    const colorClass = trend?.direction === 'stable' ? 'text-gray-400' :
                      trend?.direction === 'down' ? 'text-green-400' : 'text-orange-400';
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Weight</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {trend.firstHalfAvg.toFixed(1)}→{trend.secondHalfAvg.toFixed(1)} lb
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Calories Trend */}
                  {(() => {
                    const nutrition = (liveReportData?.nutritionData?.nutrition || []).map((n: any) => ({
                      date: n.date,
                      value: n.calories || 0
                    }));
                    const trend = calculateTrend(nutrition, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // Calories are context-dependent, show neutral
                    const colorClass = 'text-gray-400';
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Calories</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {Math.round(trend.firstHalfAvg).toLocaleString()}→{Math.round(trend.secondHalfAvg).toLocaleString()}
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Protein Trend */}
                  {(() => {
                    const nutrition = (liveReportData?.nutritionData?.nutrition || []).map((n: any) => ({
                      date: n.date,
                      value: n.proteinGrams || 0
                    }));
                    const trend = calculateTrend(nutrition, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // For protein, up is good
                    const colorClass = trend?.direction === 'stable' ? 'text-gray-400' :
                      trend?.direction === 'up' ? 'text-green-400' : 'text-orange-400';
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Protein</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {Math.round(trend.firstHalfAvg)}→{Math.round(trend.secondHalfAvg)}g
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Carbs Trend */}
                  {(() => {
                    const nutrition = (liveReportData?.nutritionData?.nutrition || []).map((n: any) => ({
                      date: n.date,
                      value: n.carbsGrams || 0
                    }));
                    const trend = calculateTrend(nutrition, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // Carbs are context-dependent, show neutral
                    const colorClass = 'text-gray-400';
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Carbs</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {Math.round(trend.firstHalfAvg)}→{Math.round(trend.secondHalfAvg)}g
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Fats Trend */}
                  {(() => {
                    const nutrition = (liveReportData?.nutritionData?.nutrition || []).map((n: any) => ({
                      date: n.date,
                      value: n.fatGrams || 0
                    }));
                    const trend = calculateTrend(nutrition, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // Fats are context-dependent, show neutral
                    const colorClass = 'text-gray-400';
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Fats</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {Math.round(trend.firstHalfAvg)}→{Math.round(trend.secondHalfAvg)}g
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Steps Trend */}
                  {(() => {
                    const health = (liveReportData?.healthData?.healthData || []).map((h: any) => ({
                      date: h.date,
                      value: h.data?.steps || 0
                    }));
                    const trend = calculateTrend(health, startDate, endDate);
                    const arrow = trend?.direction === 'up' ? '↑' : trend?.direction === 'down' ? '↓' : '→';
                    // For steps, up is good
                    const colorClass = trend?.direction === 'stable' ? 'text-gray-400' :
                      trend?.direction === 'up' ? 'text-green-400' : 'text-orange-400';
                    const formatSteps = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : Math.round(n).toString();
                    return (
                      <div className="glass border border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Steps</p>
                        {trend ? (
                          <>
                            <p className="text-lg font-bold text-white">
                              {formatSteps(trend.firstHalfAvg)}→{formatSteps(trend.secondHalfAvg)}
                            </p>
                            <p className={`text-sm font-medium ${colorClass}`}>
                              {arrow} {Math.abs(trend.percentChange).toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <p className="text-lg font-bold text-white">—</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Recent Workouts Section - Grouped by workout type */}
          {liveReportData?.workoutData?.workouts?.length > 0 && (
            <div className="card-elevated">
              <div className="card-body p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Workouts</h2>
                {(() => {
                  // Group workouts by name and take last 2 sessions of each
                  const workoutsByType = new Map<string, any[]>();
                  for (const workout of liveReportData.workoutData.workouts) {
                    const name = workout.workoutName || workout.title || workout.name || 'Workout';
                    if (!workoutsByType.has(name)) {
                      workoutsByType.set(name, []);
                    }
                    workoutsByType.get(name)!.push(workout);
                  }

                  // Sort each group by date (newest first) and take last 2
                  const groupedWorkouts = Array.from(workoutsByType.entries()).map(([name, sessions]) => ({
                    name,
                    sessions: sessions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 2)
                  }));

                  return (
                    <div className="space-y-6">
                      {groupedWorkouts.map(({ name, sessions }) => (
                        <div key={name} className="glass border border-white/10 rounded-lg overflow-hidden">
                          <div className="p-4 border-b border-white/10 bg-white/5">
                            <h3 className="text-lg font-semibold text-white">{name}</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase">
                                  <th className="py-2 px-4 text-left font-medium">Exercise</th>
                                  {sessions.map((session, sIdx) => (
                                    <th key={sIdx} className="py-2 px-4 text-right font-medium whitespace-nowrap">
                                      {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // Get all unique exercises across sessions
                                  const allExercises = new Map<string, any[]>();
                                  sessions.forEach((session, sessionIdx) => {
                                    (session.exercises || []).forEach((ex: any) => {
                                      const exName = ex.name || ex.exerciseName;
                                      if (!allExercises.has(exName)) {
                                        allExercises.set(exName, new Array(sessions.length).fill(null));
                                      }
                                      allExercises.get(exName)![sessionIdx] = ex;
                                    });
                                  });

                                  return Array.from(allExercises.entries()).map(([exName, exercisesBySessions]) => (
                                    <tr key={exName} className="border-b border-white/5">
                                      <td className="py-3 px-4 text-gray-300 font-medium">{exName}</td>
                                      {exercisesBySessions.map((exercise, sIdx) => (
                                        <td key={sIdx} className="py-3 px-4 text-right">
                                          {exercise ? (
                                            exercise.stats && exercise.stats.length > 0 ? (
                                              <div className="space-y-1">
                                                {exercise.stats.map((stat: any, statIdx: number) => (
                                                  <div key={statIdx} className="text-gray-300 whitespace-nowrap text-sm">
                                                    {stat.reps && <span>{stat.reps}</span>}
                                                    {stat.weight && <span> × {stat.weight} lbs</span>}
                                                    {stat.time && !stat.reps && <span>{stat.time}s</span>}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : exercise.sets && exercise.sets.length > 0 ? (
                                              <div className="space-y-1">
                                                {exercise.sets.map((set: any, setIdx: number) => (
                                                  <div key={setIdx} className="text-gray-300 whitespace-nowrap text-sm">
                                                    {set.reps && <span>{set.reps}</span>}
                                                    {set.weight && <span> × {set.weight} lbs</span>}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-gray-500">—</span>
                                            )
                                          ) : (
                                            <span className="text-gray-600">—</span>
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snapshots Tab */}
      {activeTab === 'snapshots' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Reports List Sidebar */}
          <div className="w-full lg:w-1/4 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Saved Reports</h2>
              {reports.length > 0 && (
                <button
                  onClick={handleDeleteAllReports}
                  className="glass border border-red-500/50 hover:border-red-500 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-all"
                  disabled={isDeletingAll}
                >
                  {isDeletingAll ? (
                    <span className="loading loading-spinner loading-xs text-white" />
                  ) : (
                    'Delete All'
                  )}
                </button>
              )}
            </div>

            <div className="grid gap-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`group relative flex flex-col p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                    selectedReport?.id === report.id
                      ? 'bg-accent-purple/10 border-2 border-accent-purple shadow-lg'
                      : 'bg-bg-secondary hover:bg-white/5 border border-white/10'
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-gray-400 mt-1">
                        Created: {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className={`glass border border-red-500/50 hover:border-red-500 text-red-400 px-2 py-1 rounded text-xs transition-all opacity-0 group-hover:opacity-100`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report);
                      }}
                      disabled={isDeleting === report.id}
                    >
                      {isDeleting === report.id ? (
                        <span className="loading loading-spinner loading-xs text-white" />
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Visualization */}
          <div className="w-full lg:w-3/4">
            <div className="card-elevated">
              <div className="card-body p-6">
                {selectedReport ? (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-2xl font-bold text-white">
                          Report for {client?.first_name} {client?.last_name}
                        </h2>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          className="btn-gradient px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 flex-1 sm:flex-initial touch-manipulation hover:scale-105 transition-transform"
                          onClick={captureAndSendReport}
                          disabled={isCapturing}
                        >
                          {isCapturing ? (
                            <span className="loading loading-spinner loading-sm text-white" />
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              <span>Download Image</span>
                            </>
                          )}
                        </button>
                        <button
                          className="btn-gradient px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 flex-1 sm:flex-initial touch-manipulation hover:scale-105 transition-transform"
                          onClick={handleGenerateLink}
                          disabled={isCapturing}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                          <span>Generate Link</span>
                        </button>
                        <button
                          className="btn-gradient px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 flex-1 sm:flex-initial touch-manipulation hover:scale-105 transition-transform"
                          onClick={() => setIsSendModalOpen(true)}
                          disabled={isCapturing}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          <span>Send to Client</span>
                        </button>
                      </div>
                    </div>

                    {/* 7-Day Reference - Reference tool only, never captured */}
                    {!isCapturing && (
                      <SevenDayReference
                        data={selectedReport.report_data}
                        clientName={`${client?.first_name} ${client?.last_name}`}
                        dateRangeStart={selectedReport.date_range_start}
                        dateRangeEnd={selectedReport.date_range_end}
                      />
                    )}

                    <div id="report-container" className={`space-y-8 ${isCapturing ? 'p-8 rounded-lg' : ''}`}>
                      <ReportVisualization
                        data={selectedReport.report_data}
                        onDeleteWorkout={handleDeleteWorkout}
                        onDeleteExercise={handleDeleteExercise}
                        isScreenshotMode={isCapturing}
                        clientName={`${client?.first_name} ${client?.last_name}`}
                        dateRangeStart={selectedReport.date_range_start}
                        dateRangeEnd={selectedReport.date_range_end}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-lg text-gray-400">
                      {reports.length > 0
                        ? 'Select a report to view details'
                        : 'No saved reports. Create a live report and save it as a snapshot!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      <dialog id="delete-all-modal" className="modal modal-bottom sm:modal-middle">
        <div className="card-elevated max-w-md">
          <h3 className="font-bold text-lg text-white">Delete All Reports</h3>
          <p className="py-4 text-gray-300">
            Are you sure you want to delete all reports for {client?.first_name} {client?.last_name}?
            This will delete {reports.length} report{reports.length !== 1 ? 's' : ''} and cannot be undone.
          </p>
          <div className="modal-action">
            <button
              className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all"
              onClick={cancelDeleteAll}
              disabled={isDeletingAll}
            >
              Cancel
            </button>
            <button
              className="glass border border-red-500/50 hover:border-red-500 text-red-400 px-4 py-2 rounded-lg transition-all font-medium"
              onClick={confirmDeleteAll}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <span className="loading loading-spinner loading-sm text-white" />
              ) : (
                'Delete All Reports'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog id="delete-modal" className="modal modal-bottom sm:modal-middle">
        <div className="card-elevated max-w-md">
          <h3 className="font-bold text-lg text-white">Confirm Delete</h3>
          <p className="py-4 text-gray-300">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button
              className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all"
              onClick={cancelDelete}
              disabled={isDeleting !== null}
            >
              Cancel
            </button>
            <button
              className="glass border border-red-500/50 hover:border-red-500 text-red-400 px-4 py-2 rounded-lg transition-all font-medium"
              onClick={confirmDelete}
              disabled={isDeleting !== null}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-sm text-white" />
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Send Report Modal */}
      <SendReportModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        report={selectedReport}
        client={client}
        onSuccess={(delivery) => {
          toast.success(`Report sent successfully to ${delivery.clientName}!`);
          setIsSendModalOpen(false);
        }}
      />

      {/* Generate Link Modal */}
      <GenerateLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        report={selectedReport}
        client={client}
        onSuccess={() => {
          // Modal will handle its own success feedback
          // Optionally close the modal after a delay if desired
        }}
      />

      {/* Share Progress Modal */}
      <ShareProgressModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        reportData={liveReportData}
        clientName={client ? `${client.first_name} ${client.last_name}` : 'Client'}
        dateRangeStart={startDate?.toISOString() || ''}
        dateRangeEnd={endDate?.toISOString() || ''}
      />
    </div>
  );
} 