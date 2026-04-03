"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Star,
  Search,
} from "lucide-react";
import { CHECKIN_TEMPLATES } from "@/lib/checkin-templates";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  goal: "fat_loss" | "maintenance" | "muscle_gain" | null;
  status: string | null;
}

interface CheckinResult {
  clientId: string;
  clientName: string;
  message: string | null;
  error?: string;
  generatedAt?: string;
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  on_track: CheckCircle2,
  watch: AlertTriangle,
  needs_attention: AlertCircle,
  new: Star,
};

const STATUS_COLORS: Record<string, string> = {
  on_track: "text-green-500",
  watch: "text-yellow-500",
  needs_attention: "text-red-500",
  new: "text-blue-500",
};

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Fat Loss",
  maintenance: "Maintenance",
  muscle_gain: "Muscle Gain",
};

export default function BatchCheckinsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState(CHECKIN_TEMPLATES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<CheckinResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [missingProfile, setMissingProfile] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, goal, status")
        .eq("active", true)
        .order("first_name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to fetch clients");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const toggleClient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredClients = clients.filter((c) => {
    if (!searchQuery) return true;
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return;

    setIsGenerating(true);
    setResults([]);

    try {
      const res = await fetch("/api/ai/batch-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: Array.from(selectedIds),
          templateId,
        }),
      });

      if (res.status === 429) {
        toast.error("Too many requests. Please wait a moment and try again.");
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to generate check-ins");
        return;
      }

      const data = await res.json();
      setResults(data.results);
      setMissingProfile(data.missingProfile);

      if (data.stats.failed > 0) {
        toast.warning(
          `Generated ${data.stats.succeeded} of ${data.stats.total} messages. ${data.stats.failed} failed.`
        );
      } else {
        toast.success(`Generated ${data.stats.succeeded} check-in messages!`);
      }
    } catch (error) {
      console.error("Error generating check-ins:", error);
      toast.error("Failed to generate check-ins");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (clientId: string, message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(clientId);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      try {
        const textarea = document.createElement("textarea");
        textarea.value = message;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(clientId);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error("Failed to copy. Please select and copy manually.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-500" />
          Batch Check-ins
        </h1>
        <p className="text-gray-500 mt-1">
          Generate personalized check-in messages for multiple clients at once.
        </p>
      </div>

      {/* Missing profile banner */}
      {missingProfile && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              No coaching profile set up
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Messages are using a neutral tone.{" "}
              <a
                href="/dashboard/coaching-profile"
                className="underline hover:text-amber-800"
              >
                Set up your coaching profile
              </a>{" "}
              for personalized messages.
            </p>
          </div>
        </div>
      )}

      {/* Template selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Check-in Template
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isGenerating}
        >
          {CHECKIN_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Client selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Select Clients
          </label>
          <button
            onClick={toggleAll}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={isGenerating}
          >
            {selectedIds.size === filteredClients.length
              ? "Deselect All"
              : `Select All (${filteredClients.length})`}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          />
        </div>

        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>{searchQuery ? "No clients match your search." : "No clients found. Import clients from Trainerize first."}</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {filteredClients.map((client) => {
              const isSelected = selectedIds.has(client.id);
              const statusKey = client.status || "new";
              const StatusIcon = STATUS_ICONS[statusKey] || Star;
              const statusColor = STATUS_COLORS[statusKey] || "text-gray-400";

              return (
                <label
                  key={client.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? "bg-blue-50/50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClient(client.id)}
                    disabled={isGenerating}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </span>
                  </div>
                  <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                  {client.goal && (
                    <span className="text-xs text-gray-500">
                      {GOAL_LABELS[client.goal] || client.goal}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="mb-8">
        <button
          onClick={handleGenerate}
          disabled={selectedIds.size === 0 || isGenerating}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {selectedIds.size} check-in
              {selectedIds.size !== 1 ? "s" : ""}...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              Generate {selectedIds.size} Check-in
              {selectedIds.size !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generated Messages
          </h2>
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.clientId}
                className={`border rounded-lg overflow-hidden ${
                  result.error
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-medium text-gray-900">
                    {result.clientName}
                  </span>
                  {result.message && (
                    <button
                      onClick={() =>
                        handleCopy(result.clientId, result.message!)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      {copiedId === result.clientId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="px-4 py-3">
                  {result.error ? (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
