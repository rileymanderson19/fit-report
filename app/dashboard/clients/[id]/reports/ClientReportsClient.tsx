'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/libs/supabase/client';
import { SevenDayReference } from '@/components/SevenDayReference';
import { DateRangePicker } from '@/components/DateRangePicker';
import ClientSearchBar from '@/components/ClientSearchBar';
import SendReportModal from '@/components/SendReportModal';
import GenerateLinkModal from '@/components/GenerateLinkModal';
import { ShareProgressModal } from '@/components/shareable';
import { toast } from 'sonner';

// Lazy-load ReportVisualization to reduce initial bundle size
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
}

interface ProgressPhotoSummary {
  firstPhoto: ProgressPhoto | null;
  latestPhoto: ProgressPhoto | null;
}

interface ClientReportsClientProps {
  clientId: string;
  initialClient?: Client | null;
  initialReports?: Report[];
  initialError?: string | null;
  initialLiveReportData?: any;
  initialLiveReportMetadata?: any;
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

  // Last 7 days report state (for calendar view)
  const [last7ReportData, setLast7ReportData] = useState<any>(null);
  const [isLoadingLast7, setIsLoadingLast7] = useState(false);

  // Action plan state
  const [clientTasks, setClientTasks] = useState<any[]>([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

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
  const [photoSummary, setPhotoSummary] = useState<ProgressPhotoSummary>({ firstPhoto: null, latestPhoto: null });
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

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

  const fetchClientTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('client_tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const generateActionPlan = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select a date range first');
      return;
    }

    setIsGeneratingTasks(true);
    try {
      const response = await fetch('/api/automations/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString()
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate action plan');
      }

      const data = await response.json();
      setClientTasks(data.tasks || []);
      toast.success(`Generated ${data.tasks.length} action items`);
    } catch (error) {
      console.error('Error generating action plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate action plan');
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('client_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setClientTasks(tasks =>
        tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      toast.success('Task updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Fetch last 7 days report for calendar view
  const fetchLast7DaysReport = async () => {
    if (!client) return;

    setIsLoadingLast7(true);
    try {
      // Calculate last 7 days ending today
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Try cache-only first for fast load
      let response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          dateRange: {
            from: sevenDaysAgo.toISOString(),
            to: today.toISOString()
          },
          template: 'enhanced',
          repRange: {
            min: minReps,
            max: maxReps
          },
          mode: 'cache-only'
        })
      });

      // If no cache, generate
      if (response.status === 202) {
        response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            dateRange: {
              from: sevenDaysAgo.toISOString(),
              to: today.toISOString()
            },
            template: 'enhanced',
            repRange: {
              min: minReps,
              max: maxReps
            }
          })
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.reportData) {
          setLast7ReportData(data.reportData);
        }
      }
    } catch (error) {
      console.error('Error fetching last 7 days report:', error);
      // Silent failure - this is a nice-to-have feature
    } finally {
      setIsLoadingLast7(false);
    }
  };

  // Load tasks when tab is active
  useEffect(() => {
    if (activeTab === 'live' && client) {
      fetchClientTasks();
    }
  }, [activeTab, client]);

  // Fetch last 7 days report when client is loaded
  useEffect(() => {
    if (client && activeTab === 'live') {
      fetchLast7DaysReport();
    }
  }, [client, activeTab]);

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

          {/* Live Report Display */}
          {liveReportData && (
            <div className="card-elevated">
              <div className="card-body p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Live Report for {client?.first_name} {client?.last_name}
                    </h2>
                    {liveReportMetadata?.cached && liveReportMetadata?.generatedAt && (
                      <p className="text-sm text-gray-400 mt-1">
                        Last refreshed: {new Date(liveReportMetadata.generatedAt).toLocaleString()}
                        {liveReportMetadata.fromLocalStorage && ' (from local cache)'}
                        {' · '}
                        <button
                          onClick={generateLiveReport}
                          className="text-accent-purple hover:underline"
                          disabled={isGeneratingLive || isRefreshing}
                        >
                          {isRefreshing ? 'Checking...' : 'Refresh now'}
                        </button>
                      </p>
                    )}
                  </div>
                </div>

                <div id="report-container" className="space-y-8">
                  <ReportVisualization
                    data={liveReportData}
                    onDeleteWorkout={() => {}}
                    onDeleteExercise={() => {}}
                    isScreenshotMode={false}
                    clientName={`${client?.first_name} ${client?.last_name}`}
                    dateRangeStart={startDate?.toISOString() || ''}
                    dateRangeEnd={endDate?.toISOString() || ''}
                    last7ReportData={last7ReportData}
                  />
                </div>
              </div>
            </div>
          )}

          {!liveReportData && !isGeneratingLive && (
            <div className="card-elevated">
              <div className="card-body p-6">
                <div className="text-center py-12">
                  <p className="text-lg text-gray-400">
                    Click &quot;Generate Report&quot; to create a live report
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Photos Section */}
          <div className="card-elevated">
            <div className="card-body p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-purple" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  Progress Photos
                </h2>
                <p className="text-sm text-gray-400 mt-1">Visual changes for this report period and all-time snapshots</p>
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
              ) : progressPhotos.length === 0 && !photoSummary.firstPhoto && !photoSummary.latestPhoto ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No progress photos available yet for this client.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Range Photos */}
                  {progressPhotos.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">This Period</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {progressPhotos.map((photo) => (
                          <button
                            key={photo.id}
                            className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-accent-purple/50 transition-all cursor-pointer"
                            onClick={() => setSelectedPhotoUrl(photo.url)}
                          >
                            <img
                              src={photo.url}
                              alt={`Progress photo ${new Date(photo.takenAt).toLocaleDateString()}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <span className="text-xs text-white">{new Date(photo.takenAt).toLocaleDateString()}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All-Time First vs Latest */}
                  {(photoSummary.firstPhoto || photoSummary.latestPhoto) && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">All-Time Progress</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {photoSummary.firstPhoto && (
                          <div className="glass border border-white/10 rounded-lg overflow-hidden">
                            <button
                              className="w-full aspect-[3/4] overflow-hidden cursor-pointer"
                              onClick={() => setSelectedPhotoUrl(photoSummary.firstPhoto!.url)}
                            >
                              <img
                                src={photoSummary.firstPhoto.url}
                                alt="First progress photo"
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            </button>
                            <div className="p-3">
                              <span className="text-xs font-semibold text-accent-purple uppercase">First Photo</span>
                              <p className="text-sm text-gray-300">{new Date(photoSummary.firstPhoto.takenAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )}
                        {photoSummary.latestPhoto && (
                          <div className="glass border border-white/10 rounded-lg overflow-hidden">
                            <button
                              className="w-full aspect-[3/4] overflow-hidden cursor-pointer"
                              onClick={() => setSelectedPhotoUrl(photoSummary.latestPhoto!.url)}
                            >
                              <img
                                src={photoSummary.latestPhoto.url}
                                alt="Latest progress photo"
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            </button>
                            <div className="p-3">
                              <span className="text-xs font-semibold text-green-400 uppercase">Most Recent</span>
                              <p className="text-sm text-gray-300">{new Date(photoSummary.latestPhoto.takenAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

          {/* Action Plan Section */}
          <div className="card-elevated">
            <div className="card-body p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Action Plan</h2>
                  <p className="text-gray-400 mt-1">AI-generated tasks and recommendations</p>
                </div>
                <button
                  className="btn-gradient px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  onClick={generateActionPlan}
                  disabled={isGeneratingTasks || !startDate || !endDate}
                >
                  {isGeneratingTasks ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                      <span>Generate Action Plan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tasks List */}
              {isLoadingTasks ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg text-accent-purple"></span>
                </div>
              ) : clientTasks.length > 0 ? (
                <div className="space-y-4">
                  {clientTasks.map((task) => (
                    <div
                      key={task.id}
                      className="glass border border-white/10 rounded-lg p-4 hover:border-accent-purple/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                              task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              task.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                              {task.category}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-gray-300 text-sm mb-2">{task.description}</p>
                          )}
                          {task.rationale && (
                            <p className="text-gray-400 text-xs italic">
                              <strong>Why:</strong> {task.rationale}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <select
                            className="bg-bg-secondary border border-white/10 text-white px-3 py-1 rounded text-sm focus:outline-none focus:border-accent-purple"
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    No action items yet. Click &quot;Generate Action Plan&quot; to create AI-powered recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
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