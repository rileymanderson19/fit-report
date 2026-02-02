"use client";

import React, { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

interface ProfileStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function ProfileStep({ onNext, onBack }: ProfileStepProps) {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
        })
        .select();

      if (error) throw error;

      toast.success("Profile saved!");

      setTimeout(() => {
        onNext();
      }, 500);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-elevated rounded-2xl p-8 md:p-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-6">👋</div>
        <h2 className="text-3xl font-display font-bold text-white mb-4">
          What&apos;s your name?
        </h2>
        <p className="text-xl text-gray-300 max-w-xl mx-auto">
          Let&apos;s personalize your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text">First Name</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className="input input-bordered w-full"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Last Name (optional)</span>
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className="input input-bordered w-full"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isLoading || !firstName.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              <>
                Continue
                <svg
                  className="w-5 h-5 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
