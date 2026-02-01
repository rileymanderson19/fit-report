"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  trainerize_client_id: string;
  display_name: string;
}

interface SampleReportStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function SampleReportStep({
  onNext,
  onBack,
  onSkip,
}: SampleReportStepProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportPreview, setReportPreview] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: clientList } = await supabase
          .from("clients")
          .select("id, trainerize_client_id, display_name")
          .eq("trainer_id", user.id)
          .limit(10);

        if (clientList && clientList.length > 0) {
          setClients(clientList);
          setSelectedClient(clientList[0].trainerize_client_id);
        }
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [supabase]);

  const generateSampleReport = async () => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    setIsGenerating(true);

    try {
      // Get defaults from localStorage
      const defaults = JSON.parse(
        localStorage.getItem("fitreport_defaults") || "{}"
      );

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient,
          startDate: new Date(
            Date.now() - (defaults.defaultReportRange || 7) * 24 * 60 * 60 * 1000
          ).toISOString(),
          endDate: new Date().toISOString(),
          minReps: defaults.minReps || 8,
          maxReps: defaults.maxReps || 12,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      setReportGenerated(true);
      setReportPreview(data.reportUrl || data.previewUrl);
      toast.success("Sample report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate report"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card-elevated rounded-2xl p-8 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="card-elevated rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          No Clients Found
        </h2>
        <p className="text-gray-400 mb-6">
          You need to import clients before generating a sample report.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onBack} className="btn btn-outline">
            Go Back
          </button>
          <button onClick={onSkip} className="btn btn-ghost">
            Skip This Step
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Generate a Sample Report
        </h2>
        <p className="text-gray-400">
          See what FitReport can do by generating a report for one of your
          clients.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {!reportGenerated ? (
          <>
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Select a Client</span>
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="select select-bordered w-full"
                disabled={isGenerating}
              >
                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.trainerize_client_id}
                  >
                    {client.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-base-300/50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-white mb-2">What to expect:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Workout summary with exercise progress</li>
                <li>• Body measurements trends (if available)</li>
                <li>• Health data overview (sleep, steps, etc.)</li>
                <li>• Personalized insights and achievements</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={onBack} className="btn btn-ghost">
                Back
              </button>
              <button
                onClick={generateSampleReport}
                className="btn btn-primary flex-1"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Generating...
                  </>
                ) : (
                  "Generate Sample Report"
                )}
              </button>
            </div>

            <button
              onClick={onSkip}
              className="btn btn-ghost btn-sm w-full mt-4"
            >
              Skip this step
            </button>
          </>
        ) : (
          <>
            <div className="alert alert-success mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Your sample report is ready!</span>
            </div>

            {reportPreview && (
              <div className="mb-6">
                <a
                  href={reportPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline w-full"
                >
                  View Report
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}

            <button onClick={onNext} className="btn btn-primary w-full">
              Continue to Final Step
            </button>
          </>
        )}
      </div>
    </div>
  );
}
