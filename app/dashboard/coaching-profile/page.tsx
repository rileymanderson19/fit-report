"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";
import { Sparkles, Save, RotateCcw } from "lucide-react";

const TONE_OPTIONS = [
  "professional and motivating",
  "direct and no-nonsense",
  "warm and supportive",
  "data-driven and analytical",
  "casual and friendly",
];

const COMMUNICATION_STYLE_OPTIONS = [
  "direct and actionable",
  "supportive and encouraging",
  "data-driven",
  "casual",
];

const GOAL_OPTIONS = [
  { value: "fat loss", label: "Fat Loss" },
  { value: "maintenance", label: "Maintenance" },
  { value: "muscle gain", label: "Muscle Gain" },
];

const FOCUS_AREA_OPTIONS = [
  "strength",
  "nutrition",
  "recovery",
  "mindset",
  "lifestyle",
  "body composition",
  "sleep",
  "stress management",
  "cardiovascular fitness",
  "flexibility & mobility",
];

interface CoachProfile {
  coaching_voice: string;
  coaching_tone: string;
  preferred_goal: string;
  constraints: string;
  focus_areas: string[];
  communication_style: string;
}

const DEFAULT_PROFILE: CoachProfile = {
  coaching_voice: "",
  coaching_tone: "professional and motivating",
  preferred_goal: "fat loss",
  constraints: "",
  focus_areas: [],
  communication_style: "direct and actionable",
};

export default function CoachingProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<CoachProfile>(DEFAULT_PROFILE);
  const [savedProfile, setSavedProfile] = useState<CoachProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("coach_profiles")
        .select("*")
        .eq("trainer_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        const loaded: CoachProfile = {
          coaching_voice: data.coaching_voice || "",
          coaching_tone: data.coaching_tone || DEFAULT_PROFILE.coaching_tone,
          preferred_goal: data.preferred_goal || DEFAULT_PROFILE.preferred_goal,
          constraints: data.constraints || "",
          focus_areas: data.focus_areas || [],
          communication_style: data.communication_style || DEFAULT_PROFILE.communication_style,
        };
        setProfile(loaded);
        setSavedProfile(loaded);
        setHasExisting(true);
      }
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      toast.error("Failed to load coaching profile");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        trainer_id: user.id,
        coaching_voice: profile.coaching_voice || null,
        coaching_tone: profile.coaching_tone,
        preferred_goal: profile.preferred_goal,
        constraints: profile.constraints || null,
        focus_areas: profile.focus_areas,
        communication_style: profile.communication_style,
      };

      if (hasExisting) {
        const { error } = await supabase
          .from("coach_profiles")
          .update(payload)
          .eq("trainer_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("coach_profiles")
          .insert(payload);
        if (error) throw error;
        setHasExisting(true);
      }

      setSavedProfile({ ...profile });
      toast.success("Coaching profile saved");
    } catch (error) {
      console.error("Error saving coach profile:", error);
      toast.error("Failed to save coaching profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFocusArea = (area: string) => {
    setProfile(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-50">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Coaching AI Profile</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Configure how AI generates coaching notes, action items, and client recommendations.
          These settings shape the tone and focus of all AI-generated content.
        </p>
      </div>

      <div className="space-y-6">
        {/* Coaching Tone */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Coaching Tone</label>
          <p className="text-xs text-gray-500 mb-3">How should AI-generated content sound?</p>
          <select
            className="input-field text-sm"
            value={profile.coaching_tone}
            onChange={(e) => setProfile(p => ({ ...p, coaching_tone: e.target.value }))}
          >
            {TONE_OPTIONS.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Coaching Voice */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Coaching Voice</label>
          <p className="text-xs text-gray-500 mb-3">
            Describe your coaching personality in your own words. This helps the AI match your style.
          </p>
          <textarea
            className="input-field text-sm min-h-[100px] resize-y"
            placeholder={`e.g., "I like to lead with encouragement but I'm always honest about what needs to improve. I use humor to keep things light and always tie advice back to the client's specific goals."`}
            value={profile.coaching_voice}
            onChange={(e) => setProfile(p => ({ ...p, coaching_voice: e.target.value }))}
          />
        </div>

        {/* Communication Style */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Communication Style</label>
          <p className="text-xs text-gray-500 mb-3">How should action items and notes be phrased?</p>
          <div className="grid grid-cols-2 gap-2">
            {COMMUNICATION_STYLE_OPTIONS.map(style => (
              <button
                key={style}
                onClick={() => setProfile(p => ({ ...p, communication_style: style }))}
                className={`p-3 rounded-lg border text-sm text-left transition-all ${
                  profile.communication_style === style
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Default Goal Focus */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Default Goal Focus</label>
          <p className="text-xs text-gray-500 mb-3">
            When a client doesn&apos;t have a specific goal set, AI defaults to this focus.
          </p>
          <div className="flex gap-2">
            {GOAL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setProfile(p => ({ ...p, preferred_goal: value }))}
                className={`flex-1 p-3 rounded-lg border text-sm text-center transition-all ${
                  profile.preferred_goal === value
                    ? "border-blue-300 bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Focus Areas</label>
          <p className="text-xs text-gray-500 mb-3">
            Select areas you want AI to prioritize when generating coaching recommendations.
          </p>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREA_OPTIONS.map(area => {
              const isSelected = profile.focus_areas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => toggleFocusArea(area)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Constraints */}
        <div className="card p-5">
          <label className="text-sm font-semibold text-gray-900 block mb-1">Constraints & Rules</label>
          <p className="text-xs text-gray-500 mb-3">
            Any rules the AI should always follow when generating recommendations.
          </p>
          <textarea
            className="input-field text-sm min-h-[80px] resize-y"
            placeholder='e.g., "Always emphasize protein intake first. Never recommend fasted cardio. Always suggest at least 2 rest days per week."'
            value={profile.constraints}
            onChange={(e) => setProfile(p => ({ ...p, constraints: e.target.value }))}
          />
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            onClick={() => setProfile({ ...savedProfile })}
            disabled={!hasChanges}
            className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="btn-primary text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
