"use client";

import React, { useState } from 'react';
import { toast } from 'sonner';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  trainerize_id: number;
}

interface Report {
  id: string;
  client_id: string;
  report_data: any;
  created_at: string;
}

interface SendReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  client: Client | null;
  onSuccess?: (delivery: any) => void;
}

export default function SendReportModal({ 
  isOpen, 
  onClose, 
  report, 
  client,
  onSuccess 
}: SendReportModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [includeWorkouts, setIncludeWorkouts] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeProgress, setIncludeProgress] = useState(true);

  const handleSendReport = async () => {
    if (!report || !client) {
      toast.error('Report or client data is missing');
      return;
    }

    setIsSending(true);
    try {
      // Capture the report image using the same method as Download Image
      let imageData: string | undefined;
      
      try {
        // Get the report element
        const reportElement = document.getElementById('report-container');
        if (reportElement) {
          // Apply optimized styles for capture (same as Download Image functionality)
          const captureStyles = document.createElement('style');
          captureStyles.textContent = `
            #report-container {
              background: white !important;
              padding: 40px !important;
              color: #1a1a1a !important;
              font-size: 16px !important;
            }
            #report-container h3 {
              color: #1a1a1a !important;
              font-size: 24px !important;
              font-weight: 600 !important;
              margin-bottom: 20px !important;
            }
            #report-container .card {
              background: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
              margin-bottom: 24px !important;
            }
            #report-container .card-body {
              padding: 24px !important;
            }
            #report-container table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 16px !important;
              background: white !important;
            }
            #report-container th {
              background: #f1f5f9 !important;
              color: #1a1a1a !important;
              font-weight: 600 !important;
              text-align: left !important;
              padding: 12px 16px !important;
              border-bottom: 2px solid #e2e8f0 !important;
            }
            #report-container td {
              padding: 12px 16px !important;
              border-bottom: 1px solid #e2e8f0 !important;
              color: #1a1a1a !important;
            }
            #report-container tr:nth-child(even) {
              background: #f8fafc !important;
            }
            #report-container .text-base-content {
              color: #1a1a1a !important;
            }
            #report-container .text-base-content\\/80 {
              color: #64748b !important;
            }
                         #report-container .text-primary {
               color: #2563eb !important;
             }
             #report-container .overflow-x-auto::-webkit-scrollbar {
               display: none !important;
             }
             #report-container .overflow-x-auto {
               -ms-overflow-style: none !important;
               scrollbar-width: none !important;
             }
             #report-container .overflow-y-auto::-webkit-scrollbar {
               display: none !important;
             }
             #report-container .overflow-y-auto {
               -ms-overflow-style: none !important;
               scrollbar-width: none !important;
             }
             #report-container *::-webkit-scrollbar {
               display: none !important;
             }
             #report-container * {
               -ms-overflow-style: none !important;
               scrollbar-width: none !important;
             }
             /* Hide all delete/trash buttons and edit controls */
             #report-container button {
               display: none !important;
             }
             #report-container .btn {
               display: none !important;
             }
             #report-container [data-delete] {
               display: none !important;
             }
             #report-container .delete-btn {
               display: none !important;
             }
             #report-container .trash-icon {
               display: none !important;
             }
             #report-container svg[data-icon="trash"] {
               display: none !important;
             }
             #report-container .text-error {
               display: none !important;
             }
             #report-container .btn-error {
               display: none !important;
             }
             #report-container .cursor-pointer[onclick] {
               display: none !important;
             }
           `;
          document.head.appendChild(captureStyles);

          // Wait for styles to apply
          await new Promise(resolve => setTimeout(resolve, 100));

          // Use html-to-image to capture the report
          const canvas = await import('html-to-image');
          imageData = await canvas.toPng(reportElement, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            style: {
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          });

          // Clean up styles
          document.head.removeChild(captureStyles);
        }
      } catch (captureError) {
        console.warn('Failed to capture report image, will use server-side fallback:', captureError);
        // Continue without image data - server will use fallback
      }

      const response = await fetch('/api/trainerize/send-fitness-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          reportId: report.id,
          subject: subject.trim() || undefined,
          customMessage: customMessage.trim() || undefined,
          includeWorkouts,
          includeNutrition,
          includeProgress,
          imageData // Include the captured image data
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send report');
      }

      toast.success(`Report sent successfully to ${data.data.clientName}!`);
      onSuccess?.(data.data);
      onClose();
      
      // Reset form
      setCustomMessage('');
      setSubject('');
      setIncludeWorkouts(true);
      setIncludeNutrition(true);
      setIncludeProgress(true);

    } catch (error) {
      console.error('Error sending report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          Send Fitness Report to {client?.first_name} {client?.last_name}
        </h3>

        <div className="space-y-4">
          {/* Report Info */}
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 className="font-semibold">Report Details</h4>
              <p className="text-sm">
                Created: {report ? new Date(report.created_at).toLocaleDateString() : 'Unknown'}
                <br />
                This will be sent as an image via Trainerize messaging
              </p>
            </div>
          </div>

          {/* Subject */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Subject (optional)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder={`Your Fitness Report - ${new Date().toLocaleDateString()}`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
            <label className="label">
              <span className="label-text-alt">Leave empty to use default subject</span>
            </label>
          </div>

          {/* Report Sections */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Include in Report</span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={includeProgress}
                  onChange={(e) => setIncludeProgress(e.target.checked)}
                  disabled={isSending}
                />
                <span className="label-text ml-2">Progress Overview</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={includeNutrition}
                  onChange={(e) => setIncludeNutrition(e.target.checked)}
                  disabled={isSending}
                />
                <span className="label-text ml-2">Nutrition Summary</span>
              </label>
              <label className="label cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={includeWorkouts}
                  onChange={(e) => setIncludeWorkouts(e.target.checked)}
                  disabled={isSending}
                />
                <span className="label-text ml-2">Workout Details</span>
              </label>
            </div>
          </div>

          {/* Custom Message */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Personal Message (optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Add a personal note to your client..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              disabled={isSending}
            />
            <label className="label">
              <span className="label-text-alt">This will be included in the message body</span>
            </label>
          </div>

          {/* Preview */}
          <div className="alert">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 className="font-semibold">Message Preview</h4>
              <p className="text-sm">
                Your client will receive a professional message with a link to view their fitness report image.
                The message will be sent directly through Trainerize.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSendReport}
            disabled={isSending || !report || !client}
          >
            {isSending ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Sending Report...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Send to {client?.first_name}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 