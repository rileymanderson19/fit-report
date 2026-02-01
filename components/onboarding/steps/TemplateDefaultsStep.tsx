"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

interface TemplateDefaultsStepProps {
  onNext: (newStatus?: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TemplateDefaultsStep({
  onNext,
  onBack,
}: TemplateDefaultsStepProps) {
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    minReps: 8,
    maxReps: 12,
    weightUnit: "lbs",
    measurementUnit: "inches",
    defaultReportRange: 7,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Try to load existing coach profile settings
        const { data: coachProfile } = await supabase
          .from("coach_profiles")
          .select("*")
          .eq("trainer_id", user.id)
          .single();

        if (coachProfile) {
          // Map any existing settings
          setSettings((prev) => ({
            ...prev,
            // Add any existing settings from coach_profiles here
          }));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: name.includes("Reps") || name.includes("Range")
        ? parseInt(value)
        : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Store settings in localStorage for now (can be expanded to DB later)
      localStorage.setItem("fitreport_defaults", JSON.stringify(settings));

      toast.success("Default settings saved!");
      onNext();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card-elevated rounded-2xl p-8 flex justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Set Your Defaults
        </h2>
        <p className="text-gray-400">
          Configure your preferred settings for report generation.
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Rep Range */}
        <div className="bg-base-300/50 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3">Default Rep Range</h3>
          <p className="text-sm text-gray-400 mb-4">
            Exercises within this rep range will be highlighted in reports.
          </p>
          <div className="flex items-center gap-4">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-sm">Min Reps</span>
              </label>
              <input
                type="number"
                name="minReps"
                value={settings.minReps}
                onChange={handleChange}
                min={1}
                max={50}
                className="input input-bordered w-full"
              />
            </div>
            <div className="text-gray-400 pt-8">to</div>
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-sm">Max Reps</span>
              </label>
              <input
                type="number"
                name="maxReps"
                value={settings.maxReps}
                onChange={handleChange}
                min={1}
                max={50}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        {/* Units */}
        <div className="bg-base-300/50 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3">Unit Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Weight Unit</span>
              </label>
              <select
                name="weightUnit"
                value={settings.weightUnit}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Measurement Unit</span>
              </label>
              <select
                name="measurementUnit"
                value={settings.measurementUnit}
                onChange={handleChange}
                className="select select-bordered w-full"
              >
                <option value="inches">Inches</option>
                <option value="cm">Centimeters</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Range */}
        <div className="bg-base-300/50 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3">Default Report Range</h3>
          <p className="text-sm text-gray-400 mb-4">
            How many days of data to include in reports by default.
          </p>
          <select
            name="defaultReportRange"
            value={settings.defaultReportRange}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              "Save & Continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
