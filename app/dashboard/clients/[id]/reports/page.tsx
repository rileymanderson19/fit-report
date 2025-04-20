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
    <div className="p-8">
      {/* Delete Confirmation Modal */}
      <dialog id="delete-modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Report</h3>
          <p className="py-4">
            Are you sure you want to delete the report from{' '}
            {reportToDelete && (
              <span className="font-semibold">
                {new Date(reportToDelete.date_range_start).toLocaleDateString()} - {new Date(reportToDelete.date_range_end).toLocaleDateString()}
              </span>
            )}? 
            <br />
            <span className="text-error">This action cannot be undone.</span>
          </p>
          <div className="modal-action">
            <button 
              className="btn btn-ghost" 
              onClick={cancelDelete}
              disabled={isDeleting !== null}
            >
              Cancel
            </button>
            <button 
              className={`btn btn-error ${isDeleting ? 'loading' : ''}`}
              onClick={confirmDelete}
              disabled={isDeleting !== null}
            >
              {isDeleting ? 'Deleting...' : 'Delete Report'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button disabled={isDeleting !== null}>close</button>
        </form>
      </dialog>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/dashboard/clients" className="btn btn-ghost mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L4.414 9H17a1 1 0 110 2H4.414l5.293 5.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Clients
          </Link>
          <h1 className="text-3xl font-bold">{client.first_name} {client.last_name}'s Reports</h1>
          <p className="text-base-content/60">{client.email}</p>
        </div>
        <Link href="/dashboard/reports" className="btn btn-primary">
          Generate New Report
        </Link>
      </div>

      {/* Reports List and Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Available Reports</h2>
              
              {reports.length === 0 ? (
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>No reports available yet</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedReport?.id === report.id ? 'bg-primary/10 border-primary' : 'bg-base-100 border-base-300'
                      } hover:bg-base-200 transition-colors`}
                    >
                      <button
                        className="flex-1 text-left"
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="font-semibold">
                          {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                        </div>
                        <div className="text-sm opacity-70">
                          Generated: {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        className={`btn btn-sm btn-error btn-outline ml-2`}
                        onClick={() => handleDeleteReport(report)}
                        disabled={isDeleting !== null}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Visualization */}
        <div className="lg:col-span-3">
          {selectedReport ? (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Report Details</h2>
                <div className="text-sm text-base-content/60 mb-6">
                  <p>From: {new Date(selectedReport.date_range_start).toLocaleDateString()}</p>
                  <p>To: {new Date(selectedReport.date_range_end).toLocaleDateString()}</p>
                </div>
                <ReportVisualization 
                  data={selectedReport.report_data}
                  onDeleteWorkout={handleDeleteWorkout}
                  onDeleteExercise={handleDeleteExercise}
                />
              </div>
            </div>
          ) : (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Select a report to view details</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 