"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  displayName: string;
  email?: string;
  photoUrl?: string;
}

interface ImportClientsStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function ImportClientsStep({ onNext, onBack }: ImportClientsStepProps) {
  const supabase = createClient();
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(
    new Set()
  );
  const [importedCount, setImportedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/trainerize/fetch-clients");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch clients");
        }

        setAvailableClients(data.clients || []);

        // Check how many are already imported
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { count } = await supabase
            .from("clients")
            .select("*", { count: "exact", head: true })
            .eq("trainer_id", user.id);

          setImportedCount(count || 0);
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients from Trainerize");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [supabase]);

  const toggleClient = (clientId: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(clientId)) {
      newSelected.delete(clientId);
    } else {
      newSelected.add(clientId);
    }
    setSelectedClients(newSelected);
  };

  const selectAll = () => {
    if (selectedClients.size === availableClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(availableClients.map((c) => c.id)));
    }
  };

  const handleImport = async () => {
    if (selectedClients.size === 0) {
      toast.error("Please select at least one client");
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: Array.from(selectedClients),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import clients");
      }

      toast.success(`Successfully imported ${data.imported} clients!`);

      // Update onboarding status
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_status: "clients_imported" })
          .eq("id", user.id);
      }

      // Move to next step
      setTimeout(() => {
        onNext("clients_imported");
      }, 1000);
    } catch (error) {
      console.error("Error importing clients:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import clients"
      );
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card-elevated rounded-2xl p-8 flex justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-gray-400 mt-4">Loading clients from Trainerize...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">👥</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Import Your Clients
        </h2>
        <p className="text-gray-400">
          Select the clients you want to track and generate reports for.
        </p>
        {importedCount > 0 && (
          <p className="text-sm text-accent-purple mt-2">
            You already have {importedCount} client(s) imported.
          </p>
        )}
      </div>

      {availableClients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            No clients found in your Trainerize account.
          </p>
          <button onClick={onBack} className="btn btn-outline">
            Go Back
          </button>
        </div>
      ) : (
        <>
          {/* Selection Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={selectAll} className="btn btn-ghost btn-sm">
              {selectedClients.size === availableClients.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-sm text-gray-400">
              {selectedClients.size} of {availableClients.length} selected
            </span>
          </div>

          {/* Client List */}
          <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
            {availableClients.map((client) => (
              <label
                key={client.id}
                className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedClients.has(client.id)
                    ? "bg-accent-purple/20 border border-accent-purple/50"
                    : "bg-base-300/50 hover:bg-base-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedClients.has(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="checkbox checkbox-primary"
                />
                <div className="avatar placeholder">
                  <div className="w-10 h-10 rounded-full bg-base-200">
                    {client.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={client.photoUrl} alt={client.displayName} />
                    ) : (
                      <span className="text-lg">
                        {client.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{client.displayName}</p>
                  {client.email && (
                    <p className="text-sm text-gray-400">{client.email}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onBack} className="btn btn-ghost">
              Back
            </button>
            <button
              onClick={handleImport}
              className="btn btn-primary flex-1"
              disabled={isImporting || selectedClients.size === 0}
            >
              {isImporting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Importing...
                </>
              ) : (
                `Import ${selectedClients.size} Client${
                  selectedClients.size !== 1 ? "s" : ""
                }`
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
