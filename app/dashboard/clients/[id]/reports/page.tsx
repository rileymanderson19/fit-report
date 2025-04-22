'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { ReportVisualization } from '@/components/ReportVisualization';
import Link from 'next/link';
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
  active: boolean;
}

export default function ClientReportsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const fetchClientAndReports = async () => {
      try {
        // Fetch client details
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', params.id)
          .single();

        if (clientError) throw clientError;
        setClient(clientData);

        // Fetch reports for this client
        const { data: reportsData, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .eq('client_id', params.id)
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;
        setReports(reportsData || []);

        // Set the first report as selected if available
        if (reportsData && reportsData.length > 0) {
          setSelectedReport(reportsData[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch client reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientAndReports();
  }, [supabase, params.id]);

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
      // Wait for re-render with screenshot mode
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the report element
      const reportElement = document.getElementById('report-container');
      if (!reportElement) throw new Error('Report container not found');

      // Apply dark theme styles
      const darkThemeStyles = document.createElement('style');
      darkThemeStyles.textContent = `
        #report-container {
          background: #1d232a !important;
        }
        #report-container .card {
          background-color: #191e24 !important;
        }
        #report-container .overflow-x-auto::-webkit-scrollbar {
          display: none !important;
        }
        #report-container .overflow-x-auto {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        #report-container tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        #report-container .border-base-300 {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `;
      document.head.appendChild(darkThemeStyles);

      // Use html-to-image to capture the report
      const canvas = await import('html-to-image');
      const dataUrl = await canvas.toPng(reportElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1d232a'
      });

      // Clean up styles
      document.head.removeChild(darkThemeStyles);

      // Create a download link
      const link = document.createElement('a');
      link.download = `${client.first_name}_${client.last_name}_report_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Report captured successfully');
    } catch (error) {
      console.error('Error capturing report:', error);
      toast.error('Failed to capture report');
    } finally {
      setIsCapturing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Client not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Reports List Sidebar */}
        <div className="w-full lg:w-1/4 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Reports</h2>
            <Link
              href={`/dashboard/clients/${params.id}/reports/new`}
              className="btn btn-primary btn-sm"
            >
              New Report
            </Link>
          </div>
          
          <div className="grid gap-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {reports.map((report) => (
              <div
                key={report.id}
                className={`group relative flex flex-col p-4 rounded-xl transition-all duration-200 ${
                  selectedReport?.id === report.id 
                    ? 'bg-primary/10 border-2 border-primary shadow-lg' 
                    : 'bg-base-200 hover:bg-base-300 border border-base-300'
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-base">
                      {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-base-content/60 mt-1">
                      Created: {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className={`btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReport(report);
                    }}
                    disabled={isDeleting === report.id}
                  >
                    {isDeleting === report.id ? (
                      <span className="loading loading-spinner loading-xs" />
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
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-6">
              {selectedReport ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-bold">
                      Report for {client?.first_name} {client?.last_name}
                    </h2>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={captureAndSendReport}
                      disabled={isCapturing}
                    >
                      {isCapturing ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        'Capture Report'
                      )}
                    </button>
                  </div>
                  
                  <div id="report-container" className={`space-y-8 ${isCapturing ? 'p-8 rounded-lg' : ''}`}>
                    <ReportVisualization
                      data={selectedReport.report_data}
                      onDeleteWorkout={handleDeleteWorkout}
                      onDeleteExercise={handleDeleteExercise}
                      isScreenshotMode={isCapturing}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-base-content/70">
                    {reports.length > 0
                      ? 'Select a report to view details'
                      : 'No reports available'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <dialog id="delete-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Confirm Delete</h3>
          <p className="py-4">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={cancelDelete} disabled={isDeleting !== null}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={confirmDelete}
              disabled={isDeleting !== null}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-sm" />
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
    </div>
  );
} 