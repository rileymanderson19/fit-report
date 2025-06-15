'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/libs/supabase/client';
import { ReportVisualization } from '@/components/ReportVisualization';
import { SevenDayReference } from '@/components/SevenDayReference';
import ClientSearchBar from '@/components/ClientSearchBar';
import SendReportModal from '@/components/SendReportModal';
import GenerateLinkModal from '@/components/GenerateLinkModal';

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
  trainerize_id: number;
  active: boolean;
}

interface ClientReportsClientProps {
  clientId: string;
}

export default function ClientReportsClient({ clientId }: ClientReportsClientProps) {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  useEffect(() => {
    const fetchClientAndReports = async () => {
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
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch client reports');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientAndReports();
  }, [supabase, clientId]);

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
      {/* Client Search Bar */}
      <div className="mb-6">
        <ClientSearchBar 
          currentClientId={clientId}
          placeholder="Search clients to quickly navigate..."
          className="max-w-lg"
        />
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Reports List Sidebar */}
        <div className="w-full lg:w-1/4 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Reports</h2>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/clients/${clientId}/reports/new`}
                className="btn btn-primary btn-sm"
              >
                New Report
              </Link>
              {reports.length > 0 && (
                <button
                  onClick={handleDeleteAllReports}
                  className="btn btn-error btn-sm"
                  disabled={isDeletingAll}
                >
                  {isDeletingAll ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    'Delete All'
                  )}
                </button>
              )}
            </div>
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
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button
                        className="btn btn-primary btn-md sm:btn-sm w-full sm:w-auto min-h-[44px] touch-manipulation"
                        onClick={captureAndSendReport}
                        disabled={isCapturing}
                      >
                        {isCapturing ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-2">Download Image</span>
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-primary btn-md sm:btn-sm w-full sm:w-auto min-h-[44px] touch-manipulation"
                        onClick={handleGenerateLink}
                        disabled={isCapturing}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-2">Generate Link</span>
                      </button>
                      <button
                        className="btn btn-primary btn-md sm:btn-sm w-full sm:w-auto min-h-[44px] touch-manipulation"
                        onClick={() => setIsSendModalOpen(true)}
                        disabled={isCapturing}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                        <span className="ml-2">Send to Client</span>
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

      {/* Delete All Confirmation Modal */}
      <dialog id="delete-all-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete All Reports</h3>
          <p className="py-4">
            Are you sure you want to delete all reports for {client?.first_name} {client?.last_name}? 
            This will delete {reports.length} report{reports.length !== 1 ? 's' : ''} and cannot be undone.
          </p>
          <div className="modal-action">
            <button 
              className="btn btn-ghost" 
              onClick={cancelDeleteAll} 
              disabled={isDeletingAll}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={confirmDeleteAll}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? (
                <span className="loading loading-spinner loading-sm" />
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
        onSuccess={(linkData) => {
          // Modal will handle its own success feedback
          // Optionally close the modal after a delay if desired
        }}
      />
    </div>
  );
} 