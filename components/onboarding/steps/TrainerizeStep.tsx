"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

interface Trainer {
  firstName: string;
  id: string;
}

interface TrainerizeStepProps {
  onNext: (_newStatus?: string) => void;
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
      const response = await fetch("/api/trainerize/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid credentials");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          trainerize_username: formData.username,
          trainerize_password: formData.password,
          trainerize_id: formData.trainerId,
          onboarding_status: "credentials_setup",
        })
        .select();

      if (error) throw error;

      setVerificationStatus("success");
      toast.success("Credentials verified and saved!");

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
      <div className="card p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Connect Trainerize
        </h2>
        <p className="text-gray-500">
          Enter your Trainerize credentials to securely access client data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Trainerize Username
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="your-username"
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Trainerize Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Trainer ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="trainerId"
              value={formData.trainerId}
              onChange={handleChange}
              placeholder="Enter or fetch your trainer ID"
              className="input-field flex-1"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={fetchTrainerList}
              className="btn-secondary px-4 py-2.5 rounded-lg font-medium whitespace-nowrap"
              disabled={
                isLoadingTrainerList ||
                isLoading ||
                !formData.username ||
                !formData.password
              }
            >
              {isLoadingTrainerList ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                "Find ID"
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Click &quot;Find ID&quot; to fetch your trainer ID automatically
          </p>
        </div>

        {showTrainerList && trainerList.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Select Your Trainer Profile:</h4>
            <div className="space-y-2">
              {trainerList.map((trainer) => (
                <button
                  key={trainer.id}
                  type="button"
                  onClick={() => selectTrainer(trainer.id)}
                  className="w-full text-left p-3 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <span className="font-medium text-gray-900">{trainer.firstName}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ID: {trainer.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {verificationStatus === "success" && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <span className="text-green-700 text-sm">Credentials verified successfully!</span>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">Invalid credentials. Please check and try again.</span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onBack} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
            Back
          </button>
          <button
            type="submit"
            className="btn-primary flex-1 px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
