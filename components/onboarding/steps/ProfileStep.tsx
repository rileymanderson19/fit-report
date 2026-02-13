"use client";

import React, { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

interface ProfileStepProps {
  onNext: (_newStatus?: string) => void;
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

      window.dispatchEvent(new CustomEvent("profile-updated"));
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
    <div className="card p-8 md:p-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">👋</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
          What&apos;s your name?
        </h2>
        <p className="text-xl text-gray-500 max-w-xl mx-auto">
          Let&apos;s personalize your experience.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            className="input-field"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Last Name (optional)
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className="input-field"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onBack} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
            Back
          </button>
          <button
            type="submit"
            className="btn-primary flex-1 px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
            disabled={isLoading || !firstName.trim()}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
