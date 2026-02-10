"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { CheckCircle, ArrowRight } from "lucide-react";

interface Client {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
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
  const [importSuccess, setImportSuccess] = useState(false);
  const [justImportedCount, setJustImportedCount] = useState(0);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/trainerize/fetch-clients");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch clients");
        }

        setAvailableClients(data.clients || []);

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
      const clientsToImport = availableClients.filter(client =>
        selectedClients.has(client.id)
      );

      const response = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clients: clientsToImport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import clients");
      }

      toast.success(`Successfully imported ${clientsToImport.length} clients!`);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_status: "clients_imported" })
          .eq("id", user.id);
      }

      setImportSuccess(true);
      setJustImportedCount(clientsToImport.length);
    } catch (error) {
      console.error("Error importing clients:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import clients"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleContinue = () => {
    onNext("clients_imported");
  };

  const handleSkip = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_status: "clients_imported" })
        .eq("id", user.id);
    }
    onNext("clients_imported");
  };

  if (importSuccess) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
            Clients Imported!
          </h2>
          <p className="text-gray-500 mb-8">
            Successfully imported {justImportedCount} client{justImportedCount !== 1 ? "s" : ""}.
            You can now generate reports for them.
          </p>
          <button
            onClick={handleContinue}
            className="btn-primary px-8 py-3 rounded-lg font-medium text-lg inline-flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card p-8 flex justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading clients from Trainerize...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Import Your Clients
        </h2>
        <p className="text-gray-500">
          Select the clients you want to track and generate reports for.
        </p>
        {importedCount > 0 && (
          <p className="text-sm text-blue-600 mt-2">
            You already have {importedCount} client(s) imported.
          </p>
        )}
      </div>

      {availableClients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            No clients found in your Trainerize account.
          </p>
          <button onClick={onBack} className="btn-secondary px-6 py-2.5 rounded-lg font-medium">
            Go Back
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={selectAll} className="btn-ghost text-sm px-3 py-1.5 rounded-lg">
              {selectedClients.size === availableClients.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-sm text-gray-500">
              {selectedClients.size} of {availableClients.length} selected
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
            {availableClients.map((client) => (
              <label
                key={client.id}
                className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-colors border ${
                  selectedClients.has(client.id)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedClients.has(client.id)}
                  onChange={() => toggleClient(client.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {client.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.photoUrl} alt={client.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-medium text-gray-600">
                      {client.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{client.displayName}</p>
                  {client.email && (
                    <p className="text-sm text-gray-500">{client.email}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button onClick={onBack} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
                Back
              </button>
              <button
                onClick={handleImport}
                className="btn-primary flex-1 px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
                disabled={isImporting || selectedClients.size === 0}
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${selectedClients.size} Client${
                    selectedClients.size !== 1 ? "s" : ""
                  }`
                )}
              </button>
            </div>
            {importedCount > 0 && (
              <button
                onClick={handleContinue}
                className="btn-secondary w-full px-6 py-2.5 rounded-lg font-medium"
              >
                Continue with {importedCount} existing client{importedCount !== 1 ? "s" : ""}
              </button>
            )}
            <button
              onClick={handleSkip}
              className="btn-ghost text-sm px-4 py-2 rounded-lg text-gray-400"
            >
              Skip for now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
