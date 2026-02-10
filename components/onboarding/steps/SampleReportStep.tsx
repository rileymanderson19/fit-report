"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { CheckCircle, ExternalLink } from "lucide-react";

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
      <div className="card p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          No Clients Found
        </h2>
        <p className="text-gray-500 mb-6">
          You need to import clients before generating a sample report.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onBack} className="btn-secondary px-6 py-2.5 rounded-lg font-medium">
            Go Back
          </button>
          <button onClick={onSkip} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
            Skip This Step
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Generate a Sample Report
        </h2>
        <p className="text-gray-500">
          See what FitReport can do by generating a report for one of your
          clients.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {!reportGenerated ? (
          <>
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Select a Client
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="input-field"
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

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">What to expect:</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Workout summary with exercise progress</li>
                <li>• Body measurements trends (if available)</li>
                <li>• Health data overview (sleep, steps, etc.)</li>
                <li>• Personalized insights and achievements</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button onClick={onBack} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
                Back
              </button>
              <button
                onClick={generateSampleReport}
                className="btn-primary flex-1 px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Sample Report"
                )}
              </button>
            </div>

            <button
              onClick={onSkip}
              className="btn-ghost text-sm w-full mt-4 px-4 py-2 rounded-lg text-gray-400"
            >
              Skip this step
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3 mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span className="text-green-700 text-sm">Your sample report is ready!</span>
            </div>

            {reportPreview && (
              <div className="mb-6">
                <a
                  href={reportPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
                >
                  View Report
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <button
              onClick={() => onNext()}
              className="btn-primary w-full px-6 py-2.5 rounded-lg font-medium"
            >
              Continue to Final Step
            </button>
          </>
        )}
      </div>
    </div>
  );
}
