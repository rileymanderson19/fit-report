"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

interface Trainer {
  firstName: string;
  id: string;
}

interface TrainerizeStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TrainerizeStep({ onNext, onBack }: TrainerizeStepProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    trainerId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [isLoadingTrainerList, setIsLoadingTrainerList] = useState(false);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);
  const [showTrainerList, setShowTrainerList] = useState(false);

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("trainerize_username, trainerize_password, trainerize_id")
          .eq("id", user.id)
          .single();

        if (profile?.trainerize_username) {
          setFormData({
            username: profile.trainerize_username || "",
            password: profile.trainerize_password || "",
            trainerId: profile.trainerize_id || "",
          });
          // If credentials exist, set as verified
          if (profile.trainerize_id) {
            setVerificationStatus("success");
          }
        }
      } catch (error) {
        console.error("Error loading credentials:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadSavedCredentials();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setVerificationStatus("idle");

    if (name === "username" || name === "password") {
      setTrainerList([]);
      setShowTrainerList(false);
    }
  };

  const fetchTrainerList = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Please enter username and password first");
      return;
    }

    setIsLoadingTrainerList(true);

    try {
      const response = await fetch("/api/trainerize/trainer-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
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
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch trainer list"
      );
      setTrainerList([]);
      setShowTrainerList(false);
    } finally {
      setIsLoadingTrainerList(false);
    }
  };

  const selectTrainer = (trainerId: string) => {
    setFormData((prev) => ({ ...prev, trainerId }));
    setShowTrainerList(false);
    toast.success("Trainer ID selected");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password || !formData.trainerId) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setVerificationStatus("idle");

    try {
      // Verify credentials
      const response = await fetch("/api/trainerize/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid credentials");
      }

      // Save to database
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      console.log("[TrainerizeStep] Saving credentials for user:", user.id);
      console.log("[TrainerizeStep] Username:", formData.username);
      console.log("[TrainerizeStep] Has password:", !!formData.password);
      console.log("[TrainerizeStep] Trainer ID:", formData.trainerId);

      const { error, data } = await supabase
        .from("profiles")
        .update({
          trainerize_username: formData.username,
          trainerize_password: formData.password,
          trainerize_id: formData.trainerId,
          onboarding_status: "credentials_setup",
        })
        .eq("id", user.id)
        .select();

      console.log("[TrainerizeStep] Update result - error:", error, "data:", data);

      if (error) throw error;

      setVerificationStatus("success");
      toast.success("Credentials verified and saved!");

      // Move to next step
      setTimeout(() => {
        onNext("credentials_setup");
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      setVerificationStatus("error");
      toast.error(
        error instanceof Error ? error.message : "Failed to verify credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="card-elevated rounded-2xl p-8 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🔗</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Connect Trainerize
        </h2>
        <p className="text-gray-400">
          Enter your Trainerize credentials to securely access client data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Trainerize Username</span>
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="your-username"
            className="input input-bordered w-full"
            disabled={isLoading}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Trainerize Password</span>
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="input input-bordered w-full"
            disabled={isLoading}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Trainer ID</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="trainerId"
              value={formData.trainerId}
              onChange={handleChange}
              placeholder="Enter or fetch your trainer ID"
              className="input input-bordered flex-1"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={fetchTrainerList}
              className="btn btn-outline"
              disabled={
                isLoadingTrainerList ||
                isLoading ||
                !formData.username ||
                !formData.password
              }
            >
              {isLoadingTrainerList ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Find ID"
              )}
            </button>
          </div>
          <label className="label">
            <span className="label-text-alt text-gray-500">
              Click &quot;Find ID&quot; to fetch your trainer ID automatically
            </span>
          </label>
        </div>

        {/* Trainer List */}
        {showTrainerList && trainerList.length > 0 && (
          <div className="bg-base-300/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Select Your Trainer Profile:</h4>
            <div className="space-y-2">
              {trainerList.map((trainer) => (
                <button
                  key={trainer.id}
                  type="button"
                  onClick={() => selectTrainer(trainer.id)}
                  className="w-full text-left p-3 bg-base-200 hover:bg-base-100 rounded-lg transition-colors"
                >
                  <span className="font-medium">{trainer.firstName}</span>
                  <span className="text-gray-400 text-sm ml-2">
                    ID: {trainer.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="alert alert-success">
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
            <span>Credentials verified successfully!</span>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="alert alert-error">
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
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Invalid credentials. Please check and try again.</span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
