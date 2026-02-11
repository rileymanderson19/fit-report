"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  User,
  Link2,
  Users,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  RotateCcw,
} from "lucide-react";

interface Trainer {
  firstName: string;
  id: string;
}

interface Client {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email?: string;
  photoUrl?: string;
}

type Step = "info" | "trainerize" | "clients" | "review" | "success";

export default function AdminSetupPage() {
  // Step state
  const [step, setStep] = useState<Step>("info");

  // Coach info
  const [coachEmail, setCoachEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Trainerize
  const [tzUsername, setTzUsername] = useState("");
  const [tzPassword, setTzPassword] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);
  const [showTrainerList, setShowTrainerList] = useState(false);
  const [isLoadingTrainerList, setIsLoadingTrainerList] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [isVerifying, setIsVerifying] = useState(false);

  // Clients
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isFetchingClients, setIsFetchingClients] = useState(false);
  const [clientsFetched, setClientsFetched] = useState(false);

  // Create account
  const [isCreating, setIsCreating] = useState(false);
  const [sendLoginLink, setSendLoginLink] = useState(true);
  const [loginLink, setLoginLink] = useState("");
  const [createdUserId, setCreatedUserId] = useState("");

  // Step indicators
  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Coach Info", icon: <User className="w-4 h-4" /> },
    { key: "trainerize", label: "Trainerize", icon: <Link2 className="w-4 h-4" /> },
    { key: "clients", label: "Clients", icon: <Users className="w-4 h-4" /> },
    { key: "review", label: "Review", icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  const stepOrder: Step[] = ["info", "trainerize", "clients", "review", "success"];
  const currentStepIndex = stepOrder.indexOf(step);

  // --- Handlers ---

  const handleInfoNext = () => {
    if (!coachEmail || !firstName) {
      toast.error("Email and first name are required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(coachEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStep("trainerize");
  };

  const fetchTrainerList = async () => {
    if (!tzUsername || !tzPassword) {
      toast.error("Please enter username and password first");
      return;
    }
    setIsLoadingTrainerList(true);
    try {
      const response = await fetch("/api/trainerize/trainer-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: tzUsername, password: tzPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch trainer list");

      setTrainerList(data.trainers || []);
      setShowTrainerList(true);
      if (data.trainers?.length === 0) {
        toast.error("No trainers found");
      } else {
        toast.success(`Found ${data.trainers.length} trainer(s)`);
      }
    } catch (error) {
      console.error("Error fetching trainer list:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch trainer list");
      setTrainerList([]);
      setShowTrainerList(false);
    } finally {
      setIsLoadingTrainerList(false);
    }
  };

  const selectTrainer = (id: string) => {
    setTrainerId(id);
    setShowTrainerList(false);
    setVerificationStatus("idle");
    toast.success("Trainer ID selected");
  };

  const verifyCredentials = async () => {
    if (!tzUsername || !tzPassword || !trainerId) {
      toast.error("Please fill in all Trainerize fields");
      return;
    }
    setIsVerifying(true);
    setVerificationStatus("idle");
    try {
      const response = await fetch("/api/trainerize/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: tzUsername, password: tzPassword, trainerId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid credentials");
      }
      setVerificationStatus("success");
      toast.success("Credentials verified!");
    } catch (error) {
      setVerificationStatus("error");
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTrainerizeNext = async () => {
    if (verificationStatus !== "success") {
      toast.error("Please verify credentials first");
      return;
    }
    // Auto-fetch clients when moving to clients step
    setStep("clients");
    if (!clientsFetched) {
      await fetchClients();
    }
  };

  const fetchClients = async () => {
    setIsFetchingClients(true);
    try {
      const response = await fetch("/api/admin/setup/fetch-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: tzUsername, password: tzPassword, trainerId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch clients");

      setAvailableClients(data.clients || []);
      setClientsFetched(true);
      // Select all by default
      setSelectedClients(new Set((data.clients || []).map((c: Client) => c.id)));
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch clients");
    } finally {
      setIsFetchingClients(false);
    }
  };

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

  const handleCreateAccount = async () => {
    setIsCreating(true);
    try {
      const clientsToImport = availableClients.filter((c) => selectedClients.has(c.id));

      const response = await fetch("/api/admin/setup/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: coachEmail,
          firstName,
          lastName,
          trainerize: {
            username: tzUsername,
            password: tzPassword,
            trainerId,
          },
          clients: clientsToImport,
          sendLoginLink,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create account");

      setCreatedUserId(data.userId);
      setLoginLink(data.loginLink || "");
      setStep("success");
      toast.success("Account created successfully!");
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create account");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep("info");
    setCoachEmail("");
    setFirstName("");
    setLastName("");
    setTzUsername("");
    setTzPassword("");
    setTrainerId("");
    setTrainerList([]);
    setShowTrainerList(false);
    setVerificationStatus("idle");
    setAvailableClients([]);
    setSelectedClients(new Set());
    setClientsFetched(false);
    setSendLoginLink(true);
    setLoginLink("");
    setCreatedUserId("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // --- Render ---

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900">Set Up Coach Account</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a fully configured account for a new coach.
        </p>
      </div>

      {/* Step Indicator */}
      {step !== "success" && (
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => {
            const isActive = s.key === step;
            const isPast = stepOrder.indexOf(s.key) < currentStepIndex;
            return (
              <React.Fragment key={s.key}>
                {i > 0 && (
                  <div className={`flex-1 h-px ${isPast ? "bg-blue-400" : "bg-gray-200"}`} />
                )}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : isPast
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isPast ? <CheckCircle className="w-3.5 h-3.5" /> : s.icon}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Step 1: Coach Info */}
      {step === "info" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Coach Information</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the basic details for the new coach account.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={coachEmail}
                onChange={(e) => setCoachEmail(e.target.value)}
                placeholder="coach@example.com"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleInfoNext}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Trainerize Credentials */}
      {step === "trainerize" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Trainerize Credentials</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter the coach&apos;s Trainerize login credentials.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Username</label>
              <input
                type="text"
                value={tzUsername}
                onChange={(e) => {
                  setTzUsername(e.target.value);
                  setVerificationStatus("idle");
                  setTrainerList([]);
                  setShowTrainerList(false);
                  setClientsFetched(false);
                }}
                placeholder="trainerize-username"
                className="input-field"
                disabled={isVerifying}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
              <input
                type="password"
                value={tzPassword}
                onChange={(e) => {
                  setTzPassword(e.target.value);
                  setVerificationStatus("idle");
                  setTrainerList([]);
                  setShowTrainerList(false);
                  setClientsFetched(false);
                }}
                placeholder="••••••••"
                className="input-field"
                disabled={isVerifying}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Trainer ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trainerId}
                  onChange={(e) => {
                    setTrainerId(e.target.value);
                    setVerificationStatus("idle");
                    setClientsFetched(false);
                  }}
                  placeholder="Enter or fetch trainer ID"
                  className="input-field flex-1"
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  onClick={fetchTrainerList}
                  className="btn-secondary px-4 py-2.5 rounded-lg font-medium whitespace-nowrap"
                  disabled={isLoadingTrainerList || isVerifying || !tzUsername || !tzPassword}
                >
                  {isLoadingTrainerList ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Find ID"
                  )}
                </button>
              </div>
            </div>

            {/* Trainer list */}
            {showTrainerList && trainerList.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 text-sm">Select Trainer Profile:</h4>
                <div className="space-y-2">
                  {trainerList.map((trainer) => (
                    <button
                      key={trainer.id}
                      type="button"
                      onClick={() => selectTrainer(trainer.id)}
                      className="w-full text-left p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <span className="font-medium text-gray-900">{trainer.firstName}</span>
                      <span className="text-gray-500 text-sm ml-2">ID: {trainer.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Verification status */}
            {verificationStatus === "success" && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-green-700 text-sm">Credentials verified</span>
              </div>
            )}
            {verificationStatus === "error" && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-red-700 text-sm">Invalid credentials</span>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep("info")}
              className="btn-ghost px-4 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex gap-3">
              {verificationStatus !== "success" && (
                <button
                  onClick={verifyCredentials}
                  className="btn-secondary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
                  disabled={isVerifying || !tzUsername || !tzPassword || !trainerId}
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Credentials"
                  )}
                </button>
              )}
              <button
                onClick={handleTrainerizeNext}
                className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
                disabled={verificationStatus !== "success"}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Client Selection */}
      {step === "clients" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Import Clients</h2>
          <p className="text-sm text-gray-500 mb-6">
            Select which clients to import into the coach&apos;s account.
          </p>

          {isFetchingClients ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 mt-4 text-sm">Loading clients from Trainerize...</p>
            </div>
          ) : availableClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No clients found in this Trainerize account.</p>
              <button onClick={fetchClients} className="btn-secondary px-4 py-2 rounded-lg text-sm">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={selectAll} className="btn-ghost text-sm px-3 py-1.5 rounded-lg">
                  {selectedClients.size === availableClients.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedClients.size} of {availableClients.length} selected
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
                {availableClients.map((client) => (
                  <label
                    key={client.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
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
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {client.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={client.photoUrl} alt={client.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {client.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{client.displayName}</p>
                      {client.email && (
                        <p className="text-xs text-gray-500 truncate">{client.email}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep("trainerize")}
              className="btn-ghost px-4 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep("review")}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              Review
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === "review" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & Create</h2>
          <p className="text-sm text-gray-500 mb-6">
            Confirm the details before creating the account.
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Coach</h3>
              <p className="font-medium text-gray-900">{firstName} {lastName}</p>
              <p className="text-sm text-gray-500">{coachEmail}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Trainerize</h3>
              <p className="text-sm text-gray-700">Username: <span className="font-medium">{tzUsername}</span></p>
              <p className="text-sm text-gray-700">Trainer ID: <span className="font-medium">{trainerId}</span></p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Clients</h3>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{selectedClients.size}</span> of {availableClients.length} clients will be imported
              </p>
            </div>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={sendLoginLink}
                onChange={(e) => setSendLoginLink(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Generate login link</p>
                <p className="text-xs text-gray-500">Create a magic link the coach can use to access their account</p>
              </div>
            </label>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("clients")}
              className="btn-ghost px-4 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCreateAccount}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {step === "success" && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Account Created!</h2>
          <p className="text-gray-500 mb-6">
            {firstName} {lastName}&apos;s account is ready at <span className="font-medium">{coachEmail}</span>.
            {selectedClients.size > 0 && ` ${selectedClients.size} client${selectedClients.size !== 1 ? "s" : ""} imported.`}
          </p>

          {loginLink && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Login Link</h3>
              <div className="flex items-center gap-2">
                <code className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-2 py-1.5 flex-1 overflow-x-auto">
                  {loginLink}
                </code>
                <button
                  onClick={() => copyToClipboard(loginLink)}
                  className="btn-secondary p-2 rounded-lg shrink-0"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Share this link with the coach so they can log in.
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetForm}
              className="btn-primary px-6 py-2.5 rounded-lg font-medium inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Set Up Another Coach
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
