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
                    <button
                      key={report.id}
                      className={`btn btn-block ${selectedReport?.id === report.id ? 'btn-primary' : 'btn-ghost'} justify-start`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="text-left">
                        <div className="font-semibold">
                          {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                        </div>
                        <div className="text-sm opacity-70">
                          Generated: {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Visualization */}
        <div className="lg:col-span-3">
          {selectedReport ? (
            <ReportVisualization data={selectedReport.report_data} />
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