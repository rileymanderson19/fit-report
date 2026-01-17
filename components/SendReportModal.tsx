"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/libs/supabase/client';

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

// Helper function for variable substitution
const substituteVariables = (text: string, variables: Record<string, string>): string => {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
};

export default function SendReportModal({ 
  isOpen, 
  onClose, 
  report, 
  client,
  onSuccess 
}: SendReportModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [includeWorkouts, setIncludeWorkouts] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeProgress, setIncludeProgress] = useState(true);
  const [signature, setSignature] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);

  const supabase = createClient();

  const loadTrainerConfiguration = async () => {
    setIsLoadingConfig(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: config, error } = await supabase
        .from('report_configurations')
        .select('*')
        .eq('trainer_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading configuration:', error);
        return;
      }

      if (config && client) {
        // Prepare variables for substitution (excluding reportUrl which will be done in API)
        const variables = {
          clientName: `${client.first_name} ${client.last_name}`,
          date: new Date().toLocaleDateString(),
          trainerName: user.user_metadata?.full_name || 'Your Trainer'
        };

        // Apply configuration with variable substitution (leave {reportUrl} for API)
        setSubject(substituteVariables(config.default_subject, variables));
        setCustomMessage(substituteVariables(config.default_message, variables));
        setSignature(substituteVariables(config.signature || '', variables));
        setIncludeWorkouts(config.include_workouts_default);
        setIncludeNutrition(config.include_nutrition_default);
        setIncludeProgress(config.include_progress_default);
        
        setConfigLoaded(true);
      } else {
        // No saved configuration - use defaults with basic variable substitution
        if (client) {
          const variables = {
            clientName: `${client.first_name} ${client.last_name}`,
            date: new Date().toLocaleDateString(),
            trainerName: user.user_metadata?.full_name || 'Your Trainer'
          };

          setSubject(`Your Fitness Report - ${variables.date}`);
          setCustomMessage(`Hi ${variables.clientName},\n\nYour latest fitness report is ready! Please find it attached.\n\nView your report: {reportUrl}\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\n${variables.trainerName}`);
        }
        setConfigLoaded(true);
      }
    } catch (error) {
      console.error('Error loading trainer configuration:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Load trainer's configuration when modal opens
  useEffect(() => {
    if (isOpen && client && !configLoaded) {
      loadTrainerConfiguration();
    }
  }, [isOpen, client, configLoaded, loadTrainerConfiguration]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfigLoaded(false);
      setCustomMessage('');
      setSubject('');
      setSignature('');
      // Reset to defaults
      setIncludeWorkouts(true);
      setIncludeNutrition(true);
      setIncludeProgress(true);
    }
  }, [isOpen]);

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
        // Import mobile optimization utilities
        const { captureReportImageData } = await import('@/utils/mobileImageCapture');
        
        // Use mobile-optimized capture to get image data only
        imageData = await captureReportImageData('report-container');
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
          signature: signature.trim() || undefined,
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

        {isLoadingConfig && (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="ml-2">Loading your configuration...</span>
          </div>
        )}

        {!isLoadingConfig && (
          <div className="space-y-4">
            {/* Subject */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Subject</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder={`Your Fitness Report - ${new Date().toLocaleDateString()}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isSending}
              />
            </div>

            {/* Custom Message */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Message</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder="Enter your message to the client..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                disabled={isSending}
              />
            </div>

            {/* Signature */}
            {signature && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Signature</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-20"
                  placeholder="Your signature..."
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  disabled={isSending}
                />
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isSending || isLoadingConfig}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSendReport}
            disabled={isSending || isLoadingConfig || !report || !client}
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