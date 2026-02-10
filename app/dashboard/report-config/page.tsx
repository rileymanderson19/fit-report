"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/libs/supabase/client";
import { User } from "@supabase/supabase-js";
import { useBrandConfig, BrandConfig } from "@/hooks/useBrandConfig";
import { Upload, Trash2, Palette, FilterX, X } from "lucide-react";

interface ReportConfig {
  id?: string;
  trainer_id: string;
  default_subject: string;
  default_message: string;
  signature: string;
  include_workouts_default: boolean;
  include_nutrition_default: boolean;
  include_progress_default: boolean;
  excluded_workout_names: string[];
  created_at?: string;
  updated_at?: string;
}

const defaultConfig: Partial<ReportConfig> = {
  include_workouts_default: true,
  include_nutrition_default: true,
  include_progress_default: true,
  excluded_workout_names: [],
};

export default function ReportConfigPage() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newExcludedWorkout, setNewExcludedWorkout] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMessage, setBrandMessage] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { brand, loading: brandLoading, updateBrand, uploadLogo, removeLogo } = useBrandConfig();
  const [localBrand, setLocalBrand] = useState<Partial<BrandConfig>>({});

  // Sync local brand state when hook loads
  useEffect(() => {
    if (!brandLoading) {
      setLocalBrand(brand);
    }
  }, [brand, brandLoading]);

  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadConfig(user.id);
      }
    };
    getUser();
  }, []);

  const loadConfig = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('report_configurations')
        .select('*')
        .eq('trainer_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading config:', error);
        setMessage("Error loading configuration");
        return;
      }

      if (data) {
        // Ensure excluded_workout_names exists for backward compatibility
        setConfig({
          ...data,
          excluded_workout_names: data.excluded_workout_names || []
        });
      } else {
        // No config exists, use defaults
        setConfig({
          trainer_id: userId,
          ...defaultConfig,
        } as ReportConfig);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage("Error loading configuration");
    } finally {
      setLoading(false);
    }
  };

  const addExcludedWorkout = async () => {
    const workoutName = newExcludedWorkout.trim();
    if (!workoutName) return;

    // Check for duplicates (case-insensitive)
    const excludedNames = config?.excluded_workout_names || [];
    if (excludedNames.some(name => name.toLowerCase() === workoutName.toLowerCase())) {
      setMessage("This workout is already excluded");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const updatedConfig = config ? {
      ...config,
      excluded_workout_names: [...excludedNames, workoutName]
    } : null;

    setConfig(updatedConfig);
    setNewExcludedWorkout("");

    // Auto-save after adding exclusion
    if (updatedConfig && user) {
      setSaving(true);
      try {
        const configData = {
          trainer_id: user.id,
          default_subject: updatedConfig.default_subject,
          default_message: updatedConfig.default_message,
          signature: updatedConfig.signature,
          include_workouts_default: updatedConfig.include_workouts_default,
          include_nutrition_default: updatedConfig.include_nutrition_default,
          include_progress_default: updatedConfig.include_progress_default,
          excluded_workout_names: updatedConfig.excluded_workout_names || [],
          updated_at: new Date().toISOString(),
        };

        if (updatedConfig.id) {
          // Update existing
          const { error } = await supabase
            .from('report_configurations')
            .update(configData)
            .eq('id', updatedConfig.id);

          if (error) throw error;
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('report_configurations')
            .insert([{ ...configData, created_at: new Date().toISOString() }])
            .select()
            .single();

          if (error) throw error;
          setConfig(data);
        }

        setMessage("Workout excluded and saved!");
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        console.error('Save error:', error);
        setMessage("Error saving exclusion");
        setTimeout(() => setMessage(""), 3000);
      } finally {
        setSaving(false);
      }
    }
  };

  const removeExcludedWorkout = async (index: number) => {
    if (!config || !user) return;

    const updatedNames = config.excluded_workout_names.filter((_, i) => i !== index);
    const updatedConfig = { ...config, excluded_workout_names: updatedNames };
    setConfig(updatedConfig);

    setSaving(true);
    try {
      const configData = {
        trainer_id: user.id,
        default_subject: updatedConfig.default_subject,
        default_message: updatedConfig.default_message,
        signature: updatedConfig.signature,
        include_workouts_default: updatedConfig.include_workouts_default,
        include_nutrition_default: updatedConfig.include_nutrition_default,
        include_progress_default: updatedConfig.include_progress_default,
        excluded_workout_names: updatedNames,
        updated_at: new Date().toISOString(),
      };

      if (updatedConfig.id) {
        const { error } = await supabase
          .from('report_configurations')
          .update(configData)
          .eq('id', updatedConfig.id);
        if (error) throw error;
      }

      setMessage("Workout removed and saved!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setMessage("Error saving changes");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const saveBrandSettings = async () => {
    setBrandSaving(true);
    setBrandMessage("");
    try {
      await updateBrand({
        business_name: localBrand.business_name || null,
        primary_color: localBrand.primary_color || "#2563EB",
        accent_color: localBrand.accent_color || "#1D4ED8",
        footer_text: localBrand.footer_text || null,
        show_fitreport_badge: localBrand.show_fitreport_badge ?? true,
      });
      setBrandMessage("Brand settings saved!");
      setTimeout(() => setBrandMessage(""), 3000);
    } catch {
      setBrandMessage("Error saving brand settings");
    } finally {
      setBrandSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setBrandMessage("");
    try {
      const url = await uploadLogo(file);
      setLocalBrand(prev => ({ ...prev, logo_url: url }));
      setBrandMessage("Logo uploaded!");
      setTimeout(() => setBrandMessage(""), 3000);
    } catch (err: any) {
      setBrandMessage(err.message || "Error uploading logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleLogoRemove = async () => {
    if (!confirm("Remove your logo?")) return;
    try {
      await removeLogo();
      setLocalBrand(prev => ({ ...prev, logo_url: null }));
      setBrandMessage("Logo removed");
      setTimeout(() => setBrandMessage(""), 3000);
    } catch {
      setBrandMessage("Error removing logo");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-red-600">Error Loading Configuration</h2>
          <p className="text-gray-500 mt-2">Unable to load your report configuration. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 font-display">Report Settings</h1>
        <p className="text-gray-500 mt-2">
          Customize your brand and report defaults
        </p>
      </div>

      {message && (
        <div className={`${message.includes("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"} p-4 rounded-lg mb-6 text-sm`}>
          {message}
        </div>
      )}

      {/* Brand Settings Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <Palette className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Brand Settings</h2>
        </div>

        {brandMessage && (
          <div className={`${brandMessage.includes("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"} p-3 rounded-lg mb-4 text-sm`}>
            {brandMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo & Business Name */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 mb-4">Logo & Identity</h3>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Logo</label>
              <div className="flex items-center gap-4">
                {localBrand.logo_url ? (
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-200">
                      <img
                        src={localBrand.logo_url}
                        alt="Brand logo"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <button
                      onClick={handleLogoRemove}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    {logoUploading ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {localBrand.logo_url ? "Change logo" : "Upload logo"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WebP. Max 2MB.</p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Business Name</label>
              <input
                type="text"
                className="input-field"
                value={localBrand.business_name || ""}
                onChange={(e) => setLocalBrand(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Peak Performance Coaching"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 mb-4">Brand Colors</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localBrand.primary_color || "#2563EB"}
                    onChange={(e) => setLocalBrand(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 bg-white"
                  />
                  <input
                    type="text"
                    value={localBrand.primary_color || "#2563EB"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setLocalBrand(prev => ({ ...prev, primary_color: val }));
                      }
                    }}
                    className="input-field font-mono text-sm w-28"
                    placeholder="#2563EB"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localBrand.accent_color || "#1D4ED8"}
                    onChange={(e) => setLocalBrand(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 bg-white"
                  />
                  <input
                    type="text"
                    value={localBrand.accent_color || "#1D4ED8"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        setLocalBrand(prev => ({ ...prev, accent_color: val }));
                      }
                    }}
                    className="input-field font-mono text-sm w-28"
                    placeholder="#1D4ED8"
                  />
                </div>
              </div>

              <div className="mt-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${localBrand.primary_color || "#2563EB"}, ${localBrand.accent_color || "#1D4ED8"})`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer & Badge */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 mb-4">Report Footer</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Footer Text</label>
                <textarea
                  className="input-field h-20 resize-none"
                  value={localBrand.footer_text || ""}
                  onChange={(e) => setLocalBrand(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="Peak Performance Coaching&#10;www.yoursite.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localBrand.show_fitreport_badge ?? true}
                  onChange={(e) => setLocalBrand(prev => ({ ...prev, show_fitreport_badge: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-600">
                  Show &quot;Powered by FitReport&quot; badge
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Preview + Save */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              {localBrand.logo_url && (
                <img src={localBrand.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {localBrand.business_name || "Your Business"}
              </span>
              <div
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: localBrand.primary_color || "#2563EB" }}
              />
              <div
                className="w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: localBrand.accent_color || "#1D4ED8" }}
              />
            </div>
            <span className="text-xs text-gray-400">Preview of how your brand appears in reports</span>
          </div>

          <button
            onClick={saveBrandSettings}
            disabled={brandSaving}
            className="btn-primary px-6 py-2.5 rounded-lg font-medium"
          >
            {brandSaving ? "Saving..." : "Save Brand Settings"}
          </button>
        </div>
      </section>

      {/* Workout Exclusions Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <FilterX className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Workout Exclusions</h2>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-500 mb-6">
            Exclude specific workouts from all reports. Useful for filtering out warm-ups like Zone 2 Cardio or Walking.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Enter workout name (e.g., Zone 2 Cardio)"
              value={newExcludedWorkout}
              onChange={(e) => setNewExcludedWorkout(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addExcludedWorkout();
                }
              }}
            />
            <button
              type="button"
              className="btn-primary px-6 py-2.5 rounded-lg font-medium"
              onClick={addExcludedWorkout}
              disabled={!newExcludedWorkout.trim() || saving}
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            Case-insensitive, must match the exact workout name. Separate multiple with commas.
          </p>

          {config.excluded_workout_names && config.excluded_workout_names.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {config.excluded_workout_names.map((workoutName, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 text-sm text-gray-700 px-3 py-1.5 rounded-full"
                  >
                    {workoutName}
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => removeExcludedWorkout(index)}
                      title={`Remove ${workoutName}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(!config.excluded_workout_names || config.excluded_workout_names.length === 0) && (
            <div className="text-center py-8 text-gray-400">
              No workouts are currently excluded from reports
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
