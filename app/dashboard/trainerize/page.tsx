"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, X, Link2 } from "lucide-react";

interface Trainer {
  firstName: string;
  id: string;
}

export default function TrainerizeConfigPage() {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    trainerId: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasBeenModified, setHasBeenModified] = useState(false);

  // New state for trainer list functionality
  const [isLoadingTrainerList, setIsLoadingTrainerList] = useState(false);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);
  const [showTrainerList, setShowTrainerList] = useState(false);

  // Load saved credentials when the page loads
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          toast.error("You must be logged in to access this page");
          return;
        }

        // Get the user's profile with saved credentials
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("trainerize_username, trainerize_password, trainerize_id")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        if (profile?.trainerize_username) {
          setFormData({
            username: profile.trainerize_username || "",
            password: profile.trainerize_password || "",
            trainerId: profile.trainerize_id || ""
          });
          // Don't set verification status for existing credentials
        }
      } catch (error) {
        console.error("Error loading saved credentials:", error);
        toast.error("Failed to load saved credentials");
      } finally {
        setIsInitializing(false);
      }
    };

    loadSavedCredentials();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasBeenModified(true);
    setVerificationStatus("idle");

    // Clear trainer list when credentials change
    if (name === "username" || name === "password") {
      setTrainerList([]);
      setShowTrainerList(false);
    }
  };

  const verifyCredentials = async (username: string, password: string, trainerId: string) => {
    try {
      const response = await fetch("/api/trainerize/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          trainerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      return true;
    } catch (error) {
      console.error("Verification error:", error);
      return false;
    }
  };

  // New function to fetch trainer list
  const fetchTrainerList = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Please enter username and password first");
      return;
    }

    setIsLoadingTrainerList(true);

    try {
      const response = await fetch("/api/trainerize/trainer-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch trainer list");
      }

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

  // Function to use trainer ID (auto-fill)
  const selectTrainerId = (id: string) => {
    setFormData(prev => ({ ...prev, trainerId: id }));
    setHasBeenModified(true);
    setVerificationStatus("idle");
    toast.success("Trainer ID filled in");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If credentials haven't been modified, no need to verify or save
    if (!hasBeenModified) {
      toast.success("No changes to save");
      return;
    }

    setIsLoading(true);
    setVerificationStatus("idle");

    try {
      // Only verify if credentials have been modified
      const isValid = await verifyCredentials(formData.username, formData.password, formData.trainerId);

      if (!isValid) {
        setVerificationStatus("error");
        toast.error("Invalid credentials. Please check and try again.");
        return;
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to save credentials");
        return;
      }

      // Store the credentials in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          trainerize_username: formData.username,
          trainerize_password: formData.password,
          trainerize_id: formData.trainerId
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setVerificationStatus("success");
      setHasBeenModified(false);
      // Clear trainer list on successful save
      setTrainerList([]);
      setShowTrainerList(false);
      toast.success("Credentials verified and saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while saving your credentials");
      setVerificationStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link2 className="w-5 h-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 font-display">Trainerize</h1>
        </div>
        <p className="text-gray-500 text-sm">Configure your Trainerize integration settings</p>

        {/* Connection Status */}
        {verificationStatus !== "idle" && (
          <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            verificationStatus === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {verificationStatus === "success" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Connected
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Connection Failed
              </>
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your Trainerize username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your Trainerize password"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="trainerId" className="text-sm font-medium text-gray-700 mb-1.5 block">
              Trainer ID
            </label>
            <input
              type="text"
              id="trainerId"
              name="trainerId"
              value={formData.trainerId}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your Trainer ID"
              disabled={isLoading}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              disabled={isLoading || isLoadingTrainerList}
            >
              {isLoading ? 'Verifying...' : (hasBeenModified ? 'Save Changes' : 'Saved')}
            </button>

            <button
              type="button"
              onClick={fetchTrainerList}
              className="btn-secondary px-4 py-2.5 rounded-lg font-medium"
              disabled={isLoadingTrainerList || isLoading || !formData.username || !formData.password}
            >
              {isLoadingTrainerList ? 'Loading...' : 'Get Trainer ID'}
            </button>
          </div>

          {verificationStatus === "success" && hasBeenModified && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <span className="text-green-700 text-sm">Credentials verified and saved successfully!</span>
            </div>
          )}

          {verificationStatus === "error" && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span className="text-red-700 text-sm">Invalid credentials. Please check and try again.</span>
            </div>
          )}
        </form>

        {/* Trainer List Display */}
        {showTrainerList && trainerList.length > 0 && (
          <div className="mt-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Available Trainers</h3>
                <button
                  onClick={() => setShowTrainerList(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {trainerList.map((trainer) => (
                  <div
                    key={trainer.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{trainer.firstName}</p>
                      <p className="text-sm text-gray-500">ID: {trainer.id}</p>
                    </div>
                    <button
                      onClick={() => selectTrainerId(trainer.id)}
                      className="btn-primary text-sm px-3 py-1.5 rounded-lg"
                      title="Use this Trainer ID"
                    >
                      Use this ID
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Click &quot;Use this ID&quot; to auto-fill the Trainer ID field above.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
