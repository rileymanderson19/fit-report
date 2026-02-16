'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';

import { DateRangePicker } from '@/components/DateRangePicker';
import { useBrandConfig } from '@/hooks/useBrandConfig';
import ClientSearchBar from '@/components/ClientSearchBar';
import { ShareProgressModal, ShareWeeklyHighlightsCard, ShareWeightProgressChart } from '@/components/shareable';
import { useReportAnalytics, DailyData, WeeklyAverage } from '@/hooks/useReportAnalytics';
import { toast } from 'sonner';
import { RefreshCw, Share2, ChevronLeft, ChevronRight, Copy, Check, Camera, X, AlertTriangle, XCircle } from 'lucide-react';


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
  secondLatestPhoto: ProgressPhoto | null;
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

// Week-over-week trend helpers
function splitIntoWeeks(startDate: Date, endDate: Date): Array<{ start: Date; end: Date; label: string }> {
  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  const current = new Date(startDate);
  while (current < endDate) {
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + 6);
    const actualEnd = weekEnd > endDate ? new Date(endDate) : weekEnd;
    weeks.push({
      start: new Date(current),
      end: actualEnd,
      label: `${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${actualEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function calculateWeekAvg(
  data: Array<{ date: string; value: number }>,
  weekStart: Date,
  weekEnd: Date
): number | null {
  const values = data.filter(d => {
    const date = new Date(d.date);
    return date >= weekStart && date <= weekEnd && d.value > 0;
  });
  if (values.length === 0) return null;
  return values.reduce((s, d) => s + d.value, 0) / values.length;
}

export default function ClientReportsClient({
  clientId,
  initialClient = null,
  initialReports: _initialReports = [],
  initialError = null,
  initialLiveReportData = null,
  initialLiveReportMetadata = null
}: ClientReportsClientProps) {
  const supabase = createClient();
  const { brand } = useBrandConfig();
  const mountTimeRef = React.useRef<number>(performance.now());

  // Live report state
  const [liveReportData, setLiveReportData] = useState<any>(initialLiveReportData);
  const [liveReportMetadata, setLiveReportMetadata] = useState<any>(initialLiveReportMetadata);
  const [isGeneratingLive, setIsGeneratingLive] = useState(false);
  const [_isRefreshing, setIsRefreshing] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [minReps, _setMinReps] = useState<number>(6);
  const [maxReps, _setMaxReps] = useState<number>(10);
  const [reportTemplate, _setReportTemplate] = useState<'daily' | 'enhanced'>('enhanced');

  // Client navigation state
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [nextClient, setNextClient] = useState<Client | null>(null);
  const [prevClient, setPrevClient] = useState<Client | null>(null);

  // Shared state
  const [client, setClient] = useState<Client | null>(initialClient);
  const [isLoading, setIsLoading] = useState(!initialClient);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Progress photos state
  const [_progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [photoSummary, setPhotoSummary] = useState<ProgressPhotoSummary>({ firstPhoto: null, latestPhoto: null, poseComparisons: {} });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [selectedPoseComparison, setSelectedPoseComparison] = useState<PoseComparison | null>(null);
  const [isSettingBaseline, setIsSettingBaseline] = useState(false);
  const [isSyncingAllPhotos, setIsSyncingAllPhotos] = useState(false);

  // Full Report copy state
  const [isFullReportCopied, setIsFullReportCopied] = useState(false);

  // Process report data for Full Report card
  const processedData = React.useMemo(() => {
    if (!liveReportData) return { dailyData: [], weeklyAverages: [] };

    const todayStr = new Date().toISOString().split('T')[0];
    const dailyMap = new Map<string, DailyData>();

    // Process nutrition data — exclude today (partial day)
    liveReportData.nutritionData?.nutrition?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (date === todayStr) return;
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

    // Process health data (steps) — exclude today (partial day)
    liveReportData.healthData?.healthData?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (date === todayStr) return;
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

    // Process sleep data — exclude today (partial day)
    liveReportData.sleepData?.sleepData?.forEach((item: any) => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (date === todayStr) return;
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

  // Set default date range: last 14 days ending today
  useEffect(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    setStartDate(fourteenDaysAgo);
    setEndDate(today);

    // Hydrate from localStorage if no initial data and localStorage is available
    if (!initialLiveReportData && typeof window !== 'undefined' && window.localStorage) {
      try {
        const localStorageKey = `liveReport_${clientId}_${fourteenDaysAgo.toISOString()}_${today.toISOString()}_enhanced_6-10`;
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
      const fetchClient = async () => {
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

          const fetchTime = performance.now() - fetchStart;
          const totalTime = performance.now() - mountTimeRef.current;
          console.log('[PERF CLIENT] Client loaded (client-side):', {
            fetchTime: `${fetchTime.toFixed(2)}ms`,
            totalFromMount: `${totalTime.toFixed(2)}ms`
          });
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to fetch client data');
        } finally {
          setIsLoading(false);
        }
      };

      fetchClient();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, clientId, initialClient, initialLiveReportData, initialLiveReportMetadata]);

  // Auto-generate live report on load (but only if no cached data from server)
  useEffect(() => {
    if (startDate && endDate && client && !liveReportData) {
      generateLiveReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, client]);

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

  // Fetch progress photos when date range active
  useEffect(() => {
    if (!client || !startDate || !endDate || !client.trainerize_id) return;

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
  }, [client, startDate, endDate, clientId]);

  // Baseline photo handlers
  const _handleSetBaseline = async (photo: ProgressPhoto) => {
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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{initialError}</span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">Client not found</span>
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

      {/* Report Content */}
      <div className="space-y-6">
          {/* Report Configuration */}
          <div className="card p-6">
            {/* Date Range */}
            <div className="mb-6">
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                className="btn-primary px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 flex-1 hover:-translate-y-0.5 hover:shadow-md transition-all"
                onClick={generateLiveReport}
                disabled={isGeneratingLive || !startDate || !endDate}
              >
                {isGeneratingLive ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>

              {liveReportData && (
                <button
                  className="btn-secondary px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-md transition-all border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <Share2 className="w-5 h-5" />
                  <span>Share Progress</span>
                </button>
              )}
            </div>
          </div>

          {/* Client Navigation */}
          {allClients.length > 1 && (
            <div className="flex gap-3">
              {prevClient && (
                <a
                  href={`/dashboard/clients/${prevClient.id}/reports`}
                  className="card-hover px-6 py-3 flex items-center gap-2 flex-1 group"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:-translate-x-1 transition-transform" />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-gray-400">Previous</span>
                    <span className="text-sm font-medium text-gray-700">{prevClient.first_name} {prevClient.last_name}</span>
                  </div>
                </a>
              )}
              {nextClient && (
                <a
                  href={`/dashboard/clients/${nextClient.id}/reports`}
                  className="card-hover px-6 py-3 flex items-center gap-2 flex-1 group ml-auto justify-end"
                >
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-400">Next</span>
                    <span className="text-sm font-medium text-gray-700">{nextClient.first_name} {nextClient.last_name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </a>
              )}
            </div>
          )}

          {/* Status message when no data */}
          {!liveReportData && !isGeneratingLive && (
            <div className="card p-6 text-center">
              <p className="text-gray-400">
                Click &quot;Generate Report&quot; to load data for this period
              </p>
            </div>
          )}

          {/* Full Report Card Section */}
          {liveReportData && startDate && endDate && client && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Full Report</h2>
                <button
                  onClick={handleCopyFullReport}
                  className="btn-ghost text-sm px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {isFullReportCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
              <div
                id="full-report-card"
                className="bg-white rounded-2xl shadow-lg overflow-hidden p-8 border border-gray-100"
              >
                {/* Header */}
                <div className="mb-6">
                  <div className="h-1 w-16 rounded-full mb-4" style={{ background: `linear-gradient(to right, ${brand?.primary_color || '#2563EB'}, ${brand?.accent_color || '#1D4ED8'})` }} />
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
                      brand={brand}
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
                      brand={brand}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Progress Photos Section */}
          <div className="card p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Progress Photos</h2>
                <p className="text-sm text-gray-500 mt-1">Visual progress for this report period</p>
              </div>
              {client?.trainerize_id && (
                <button
                  className="btn-ghost text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  onClick={handleSyncAllPhotos}
                  disabled={isSyncingAllPhotos}
                  title="Fetch all photos from Trainerize to find the true first photo"
                >
                  {isSyncingAllPhotos ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync All Photos</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isLoadingPhotos ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : photosError ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <span className="text-yellow-700 text-sm">{photosError}</span>
              </div>
            ) : Object.keys(photoSummary.poseComparisons).length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">No progress photos available yet for this client.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(photoSummary.poseComparisons)
                  .filter(([pose, comp]) => pose !== 'unknown' && (comp.baselinePhoto || comp.latestPhoto))
                  .sort(([a], [b]) => {
                    const order = ['front', 'side', 'back'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([pose, comparison]) => (
                      <button
                        key={pose}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all text-left"
                        onClick={() => setSelectedPoseComparison(comparison)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                            {pose}
                          </span>
                          {comparison.baselinePhoto?.isManualBaseline && (
                            <span
                              className="text-[10px] text-gray-400 hover:text-red-500 underline"
                              onClick={(e) => { e.stopPropagation(); handleClearBaseline(pose); }}
                              role="button"
                            >
                              Reset
                            </span>
                          )}
                        </div>

                        {/* 3-column grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Initial (baseline) */}
                          <div>
                            <p className="text-[10px] text-gray-400 text-center mb-1">Initial</p>
                            {comparison.baselinePhoto ? (
                              <div className="w-full aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg">
                                <img
                                  src={comparison.baselinePhoto.url}
                                  alt={`${pose} initial`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-[10px] text-gray-400">No photo</span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 text-center mt-1">
                              {comparison.baselinePhoto ? new Date(comparison.baselinePhoto.takenAt).toLocaleDateString() : '—'}
                            </p>
                          </div>

                          {/* Second Latest */}
                          <div>
                            <p className="text-[10px] text-gray-400 text-center mb-1">Previous</p>
                            {comparison.secondLatestPhoto ? (
                              <div className="w-full aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg">
                                <img
                                  src={comparison.secondLatestPhoto.url}
                                  alt={`${pose} previous`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-[10px] text-gray-400">No photo</span>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 text-center mt-1">
                              {comparison.secondLatestPhoto ? new Date(comparison.secondLatestPhoto.takenAt).toLocaleDateString() : '—'}
                            </p>
                          </div>

                          {/* Latest */}
                          <div>
                            <p className="text-[10px] text-gray-400 text-center mb-1">Latest</p>
                            {comparison.latestPhoto ? (
                              <div className="w-full aspect-[3/4] overflow-hidden bg-gray-100 rounded-lg">
                                <img
                                  src={comparison.latestPhoto.url}
                                  alt={`${pose} latest`}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-[10px] text-gray-400">No photo</span>
                              </div>
                            )}
                            <p className="text-[10px] text-green-600 text-center mt-1">
                              {comparison.latestPhoto ? new Date(comparison.latestPhoto.takenAt).toLocaleDateString() : '—'}
                            </p>
                          </div>
                        </div>
                      </button>
                  ))}
              </div>
            )}
          </div>

          {/* Photo Comparison Lightbox */}
          {selectedPoseComparison && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedPoseComparison(null)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="relative bg-white rounded-2xl shadow-xl max-w-6xl w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
                    {selectedPoseComparison.pose}
                  </h3>
                  <button
                    className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => setSelectedPoseComparison(null)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Initial */}
                  <div>
                    <p className="text-xs text-gray-500 text-center mb-2">Initial</p>
                    {selectedPoseComparison.baselinePhoto ? (
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={selectedPoseComparison.baselinePhoto.url}
                          alt={`${selectedPoseComparison.pose} initial`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-gray-400">No photo</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {selectedPoseComparison.baselinePhoto ? new Date(selectedPoseComparison.baselinePhoto.takenAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {/* Previous */}
                  <div>
                    <p className="text-xs text-gray-500 text-center mb-2">Previous</p>
                    {selectedPoseComparison.secondLatestPhoto ? (
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={selectedPoseComparison.secondLatestPhoto.url}
                          alt={`${selectedPoseComparison.pose} previous`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-gray-400">No photo</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 text-center mt-2">
                      {selectedPoseComparison.secondLatestPhoto ? new Date(selectedPoseComparison.secondLatestPhoto.takenAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  {/* Latest */}
                  <div>
                    <p className="text-xs text-gray-500 text-center mb-2">Latest</p>
                    {selectedPoseComparison.latestPhoto ? (
                      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={selectedPoseComparison.latestPhoto.url}
                          alt={`${selectedPoseComparison.pose} latest`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm text-gray-400">No photo</span>
                      </div>
                    )}
                    <p className="text-xs text-green-600 text-center mt-2">
                      {selectedPoseComparison.latestPhoto ? new Date(selectedPoseComparison.latestPhoto.takenAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Period Trends Section */}
          {liveReportData && startDate && endDate && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Period Trends
                <span className="text-sm font-normal text-gray-400 ml-2">
                  ({startDate.toLocaleDateString()} – {endDate.toLocaleDateString()})
                </span>
              </h2>
              {(() => {
                const weeks = splitIntoWeeks(startDate, endDate);
                const formatSteps = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : Math.round(n).toString();

                // Exclude today's partial data for non-weight metrics
                const todayStr = new Date().toISOString().split('T')[0];
                const nutritionData = (liveReportData?.nutritionData?.nutrition || []).filter((n: any) => new Date(n.date).toISOString().split('T')[0] !== todayStr);
                const healthData = (liveReportData?.healthData?.healthData || []).filter((h: any) => new Date(h.date).toISOString().split('T')[0] !== todayStr);

                const metrics: Array<{
                  key: string;
                  label: string;
                  unit: string;
                  decimals: number;
                  data: Array<{ date: string; value: number }>;
                  goodDirection: 'up' | 'down' | null;
                  format?: (_n: number) => string;
                }> = [
                  { key: 'weight', label: 'Weight', unit: ' lb', decimals: 1,
                    data: (liveReportData?.bodyStats?.bodyStats || []).map((w: any) => ({ date: w.date, value: w.weight || 0 })),
                    goodDirection: 'down' },
                  { key: 'calories', label: 'Calories', unit: '', decimals: 0,
                    data: nutritionData.map((n: any) => ({ date: n.date, value: n.calories || 0 })),
                    goodDirection: null },
                  { key: 'protein', label: 'Protein', unit: 'g', decimals: 0,
                    data: nutritionData.map((n: any) => ({ date: n.date, value: n.proteinGrams || 0 })),
                    goodDirection: 'up' },
                  { key: 'carbs', label: 'Carbs', unit: 'g', decimals: 0,
                    data: nutritionData.map((n: any) => ({ date: n.date, value: n.carbsGrams || 0 })),
                    goodDirection: null },
                  { key: 'fats', label: 'Fats', unit: 'g', decimals: 0,
                    data: nutritionData.map((n: any) => ({ date: n.date, value: n.fatGrams || 0 })),
                    goodDirection: null },
                  { key: 'steps', label: 'Steps', unit: '', decimals: 0,
                    data: healthData.map((h: any) => ({ date: h.date, value: h.data?.steps || 0 })),
                    goodDirection: 'up', format: formatSteps },
                ];

                // Pre-compute week averages for each metric
                const metricWeekData = metrics.map(m => ({
                  ...m,
                  weekAvgs: weeks.map(w => calculateWeekAvg(m.data, w.start, w.end)),
                }));

                const formatVal = (m: typeof metrics[0], v: number | null) => {
                  if (v === null) return '—';
                  if (m.format) return m.format(v);
                  if (m.decimals > 0) return v.toFixed(m.decimals) + m.unit;
                  return Math.round(v).toLocaleString() + m.unit;
                };

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-4 text-xs text-gray-400 uppercase tracking-wide font-medium"></th>
                          {metrics.map(m => (
                            <th key={m.key} className="text-center py-2 px-2 text-xs text-gray-400 uppercase tracking-wide font-medium">
                              {m.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weeks.map((week, wi) => (
                          <tr key={wi} className="border-b border-gray-100">
                            <td className="py-2.5 pr-4">
                              <p className="text-xs text-gray-600 font-semibold">
                                {weeks.length <= 3 ? `Week ${wi + 1}` : `Wk ${wi + 1}`}
                              </p>
                              <p className="text-[10px] text-gray-400">{week.label}</p>
                            </td>
                            {metricWeekData.map(m => (
                              <td key={m.key} className="py-2.5 px-2 text-center text-sm text-gray-900 font-medium">
                                {formatVal(m, m.weekAvgs[wi])}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {/* Avg summary row */}
                        <tr className="border-t border-gray-200">
                          <td className="py-2.5 pr-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Avg</td>
                          {metricWeekData.map(m => {
                            const nonNull = m.weekAvgs.filter((v): v is number => v !== null);
                            const avg = nonNull.length > 0 ? nonNull.reduce((s, v) => s + v, 0) / nonNull.length : null;
                            return (
                              <td key={m.key} className="py-2.5 px-2 text-center text-sm text-gray-500 font-medium">
                                {formatVal(m, avg)}
                              </td>
                            );
                          })}
                        </tr>
                        {/* delta absolute change row */}
                        <tr>
                          <td className="py-2.5 pr-4 text-xs text-gray-500 uppercase tracking-wide font-semibold">Change</td>
                          {metricWeekData.map(m => {
                            const firstVal = m.weekAvgs.find(v => v !== null);
                            const lastVal = [...m.weekAvgs].reverse().find(v => v !== null);
                            if (firstVal == null || lastVal == null) {
                              return <td key={m.key} className="py-2.5 px-2 text-center text-sm text-gray-400 font-medium">—</td>;
                            }
                            const diff = lastVal - firstVal;
                            const direction = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'stable';
                            const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
                            let colorClass = 'text-gray-400';
                            if (m.goodDirection && direction !== 'stable') {
                              colorClass = direction === m.goodDirection ? 'text-green-600' : 'text-orange-500';
                            }
                            const absDiff = Math.abs(diff);
                            let formatted: string;
                            if (m.format) formatted = m.format(absDiff);
                            else if (m.decimals > 0) formatted = absDiff.toFixed(m.decimals) + m.unit;
                            else formatted = Math.round(absDiff).toLocaleString() + m.unit;
                            return (
                              <td key={m.key} className={`py-2.5 px-2 text-center text-sm font-medium ${colorClass}`}>
                                {`${arrow} ${formatted}`}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Recent Workouts Section - Grouped by workout type */}
          {liveReportData?.workoutData?.workouts?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Workouts</h2>
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

                // Sort each group by date (newest first), take last 2, then reverse so most recent is on right
                const groupedWorkouts = Array.from(workoutsByType.entries()).map(([name, sessions]) => ({
                  name,
                  sessions: sessions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 2)
                    .reverse()
                }));

                return (
                  <div className="space-y-6">
                    {groupedWorkouts.map(({ name, sessions }) => (
                      <div key={name} className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-white">
                          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase">
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
                                  <tr key={exName} className="border-b border-gray-100">
                                    <td className="py-3 px-4 text-gray-700 font-medium">{exName}</td>
                                    {exercisesBySessions.map((exercise, sIdx) => (
                                      <td key={sIdx} className="py-3 px-4 text-right">
                                        {exercise ? (
                                          exercise.stats && exercise.stats.length > 0 ? (
                                            <div className="space-y-1">
                                              {exercise.stats.map((stat: any, statIdx: number) => (
                                                <div key={statIdx} className="text-gray-600 whitespace-nowrap text-sm">
                                                  {stat.reps && <span>{stat.reps}</span>}
                                                  {stat.weight && <span> × {stat.weight} lbs</span>}
                                                  {stat.time && !stat.reps && <span>{stat.time}s</span>}
                                                </div>
                                              ))}
                                            </div>
                                          ) : exercise.sets && exercise.sets.length > 0 ? (
                                            <div className="space-y-1">
                                              {exercise.sets.map((set: any, setIdx: number) => (
                                                <div key={setIdx} className="text-gray-600 whitespace-nowrap text-sm">
                                                  {set.reps && <span>{set.reps}</span>}
                                                  {set.weight && <span> × {set.weight} lbs</span>}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">—</span>
                                          )
                                        ) : (
                                          <span className="text-gray-300">—</span>
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
          )}
        </div>

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
