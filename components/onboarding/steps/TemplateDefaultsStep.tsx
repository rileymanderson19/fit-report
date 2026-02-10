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

        const { data: coachProfile } = await supabase
          .from("coach_profiles")
          .select("*")
          .eq("trainer_id", user.id)
          .single();

        if (coachProfile) {
          setSettings((prev) => ({
            ...prev,
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
      <div className="card p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚙️</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Set Your Defaults
        </h2>
        <p className="text-gray-500">
          Configure your preferred settings for report generation.
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Default Rep Range</h3>
          <p className="text-sm text-gray-500 mb-4">
            Exercises within this rep range will be highlighted in reports.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Min Reps
              </label>
              <input
                type="number"
                name="minReps"
                value={settings.minReps}
                onChange={handleChange}
                min={1}
                max={50}
                className="input-field"
              />
            </div>
            <div className="text-gray-400 pt-6">to</div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Max Reps
              </label>
              <input
                type="number"
                name="maxReps"
                value={settings.maxReps}
                onChange={handleChange}
                min={1}
                max={50}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Unit Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Weight Unit
              </label>
              <select
                name="weightUnit"
                value={settings.weightUnit}
                onChange={handleChange}
                className="input-field"
              >
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Measurement Unit
              </label>
              <select
                name="measurementUnit"
                value={settings.measurementUnit}
                onChange={handleChange}
                className="input-field"
              >
                <option value="inches">Inches</option>
                <option value="cm">Centimeters</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Default Report Range</h3>
          <p className="text-sm text-gray-500 mb-4">
            How many days of data to include in reports by default.
          </p>
          <select
            name="defaultReportRange"
            value={settings.defaultReportRange}
            onChange={handleChange}
            className="input-field"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onBack} className="btn-ghost px-4 py-2.5 rounded-lg font-medium">
            Back
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1 px-6 py-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
