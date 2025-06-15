'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReportVisualization } from '@/components/ReportVisualization';

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
  isExpired: boolean;
}

export default function PublicReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [reportData, setReportData] = useState<PublicReportData | null>(null);
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

        const data = await response.json();
        setReportData(data);
      } catch (error) {
        console.error('Error fetching public report:', error);
        setError(error instanceof Error ? error.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      fetchPublicReport();
    }
  }, [reportId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4 text-base-content/70">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Unable to load report</h3>
              <div className="text-xs">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-base-content/70">Report not found</p>
        </div>
      </div>
    );
  }

  if (reportData.isExpired) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Link Expired</h3>
              <div className="text-xs">This report link has expired and is no longer accessible.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { report, client } = reportData;

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-base-content mb-2">
              Fitness Report
            </h1>
            <p className="text-lg text-base-content/70">
              {client.first_name} {client.last_name}
            </p>
          </div>

          {/* Report Content */}
          <div className="bg-base-100 rounded-lg shadow-xl p-6">
            <ReportVisualization
              data={report.report_data}
              onDeleteWorkout={() => {}} // No delete functionality in public view
              onDeleteExercise={() => {}} // No delete functionality in public view
              isScreenshotMode={false}
              clientName={`${client.first_name} ${client.last_name}`}
            />
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-base-content/60">
            <p>This report was generated using FitReport</p>
          </div>
        </div>
      </div>
    </div>
  );
} 