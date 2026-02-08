"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/libs/supabase/client";
import { User } from "@supabase/supabase-js";
import { useBrandConfig, BrandConfig } from "@/hooks/useBrandConfig";
import { Upload, Trash2, Palette } from "lucide-react";

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
  default_subject: "Your Fitness Report - {date}",
  default_message: "Hi {clientName},\n\nI've attached your latest progress report. If you have any questions about the data or want to discuss adjustments to your program, feel free to reach out.\n\nView your report: {reportUrl}",
  signature: "Best regards,\n{trainerName}",
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
  const [previewMode, setPreviewMode] = useState(false);
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

  const saveConfig = async () => {
    if (!config || !user) return;

    setSaving(true);
    setMessage("");

    try {
      const configData = {
        trainer_id: user.id,
        default_subject: config.default_subject,
        default_message: config.default_message,
        signature: config.signature,
        include_workouts_default: config.include_workouts_default,
        include_nutrition_default: config.include_nutrition_default,
        include_progress_default: config.include_progress_default,
        excluded_workout_names: config.excluded_workout_names || [],
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from('report_configurations')
          .update(configData)
          .eq('id', config.id);

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

      setMessage("✅ Configuration saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setMessage("❌ Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm("Reset all settings to defaults? This will overwrite your current configuration.")) {
      setConfig({
        ...config,
        ...defaultConfig,
      } as ReportConfig);
    }
  };

  const generatePreview = () => {
    if (!config) return "";

    const sampleData = {
      clientName: "John Smith",
      date: new Date().toLocaleDateString(),
      trainerName: user?.user_metadata?.full_name || "Your Name",
      reportUrl: "https://jdxybubfszksqlgparua.supabase.co/storage/v1/object/public/temp-images/sample-report.png"
    };

    let preview = config.default_message;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });

    if (config.signature) {
      preview += "\n\n" + config.signature.replace(/\{trainerName\}/g, sampleData.trainerName);
    }

    return preview;
  };

  const addExcludedWorkout = async () => {
    const workoutName = newExcludedWorkout.trim();
    if (!workoutName) return;

    // Check for duplicates (case-insensitive)
    const excludedNames = config?.excluded_workout_names || [];
    if (excludedNames.some(name => name.toLowerCase() === workoutName.toLowerCase())) {
      setMessage("❌ This workout is already excluded");
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

        setMessage("✅ Workout excluded and saved!");
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        console.error('Save error:', error);
        setMessage("❌ Error saving exclusion");
        setTimeout(() => setMessage(""), 3000);
      } finally {
        setSaving(false);
      }
    }
  };

  const removeExcludedWorkout = (index: number) => {
    setConfig(prev => prev ? {
      ...prev,
      excluded_workout_names: prev.excluded_workout_names.filter((_, i) => i !== index)
    } : null);
  };

  const saveBrandSettings = async () => {
    setBrandSaving(true);
    setBrandMessage("");
    try {
      await updateBrand({
        business_name: localBrand.business_name || null,
        primary_color: localBrand.primary_color || "#8B5CF6",
        accent_color: localBrand.accent_color || "#7C3AED",
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
          <span className="loading loading-spinner loading-lg text-accent-purple"></span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="card-elevated">
          <div className="card-body">
            <h2 className="card-title text-red-500 text-white">Error Loading Configuration</h2>
            <p className="text-gray-300">Unable to load your report configuration. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text font-display">Report Settings</h1>
          <p className="text-gray-300 mt-2">
            Customize your brand, messaging, and report defaults
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            className="glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </button>
          <button
            className={`btn-gradient px-6 py-3 rounded-lg font-medium ${saving ? "loading" : ""}`}
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`${message.includes("✅") ? "glass border border-green-500/30 bg-green-500/10" : "glass border border-red-500/30 bg-red-500/10"} p-4 rounded-lg mb-6`}>
          <span className="text-gray-300">{message}</span>
        </div>
      )}

      {/* Brand Settings Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-accent-purple" />
          <h2 className="text-xl font-bold text-white">Brand Settings</h2>
        </div>

        {brandMessage && (
          <div className={`${brandMessage.includes("Error") ? "glass border border-red-500/30 bg-red-500/10" : "glass border border-green-500/30 bg-green-500/10"} p-3 rounded-lg mb-4`}>
            <span className="text-gray-300 text-sm">{brandMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo & Business Name */}
          <div className="card-elevated">
            <div className="card-body">
              <h3 className="font-medium text-white mb-4">Logo & Identity</h3>

              {/* Logo Upload */}
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-2 block">Logo</label>
                <div className="flex items-center gap-4">
                  {localBrand.logo_url ? (
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-white/10">
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
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 hover:border-accent-purple/50 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {logoUploading ? (
                        <span className="loading loading-spinner loading-sm text-accent-purple" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="text-sm text-accent-purple hover:underline"
                    >
                      {localBrand.logo_url ? "Change logo" : "Upload logo"}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, or WebP. Max 2MB.</p>
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

              {/* Business Name */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Business Name</label>
                <input
                  type="text"
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                  value={localBrand.business_name || ""}
                  onChange={(e) => setLocalBrand(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Peak Performance Coaching"
                />
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="card-elevated">
            <div className="card-body">
              <h3 className="font-medium text-white mb-4">Brand Colors</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={localBrand.primary_color || "#8B5CF6"}
                      onChange={(e) => setLocalBrand(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={localBrand.primary_color || "#8B5CF6"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          setLocalBrand(prev => ({ ...prev, primary_color: val }));
                        }
                      }}
                      className="bg-bg-secondary border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-accent-purple rounded-lg px-3 py-2 w-28"
                      placeholder="#8B5CF6"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={localBrand.accent_color || "#7C3AED"}
                      onChange={(e) => setLocalBrand(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={localBrand.accent_color || "#7C3AED"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          setLocalBrand(prev => ({ ...prev, accent_color: val }));
                        }
                      }}
                      className="bg-bg-secondary border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-accent-purple rounded-lg px-3 py-2 w-28"
                      placeholder="#7C3AED"
                    />
                  </div>
                </div>

                {/* Color preview bar */}
                <div className="mt-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${localBrand.primary_color || "#8B5CF6"}, ${localBrand.accent_color || "#7C3AED"})`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer & Badge */}
          <div className="card-elevated">
            <div className="card-body">
              <h3 className="font-medium text-white mb-4">Report Footer</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Footer Text</label>
                  <textarea
                    className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 h-20 w-full"
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
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                  <label className="text-sm text-gray-300">
                    Show &quot;Powered by FitReport&quot; badge
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Preview + Save */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mini live preview */}
            <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3">
              {localBrand.logo_url && (
                <img src={localBrand.logo_url} alt="" className="w-6 h-6 object-contain" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {localBrand.business_name || "Your Business"}
              </span>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: localBrand.primary_color || "#8B5CF6" }}
              />
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: localBrand.accent_color || "#7C3AED" }}
              />
            </div>
            <span className="text-xs text-gray-500">Preview of how your brand appears in reports</span>
          </div>

          <button
            onClick={saveBrandSettings}
            disabled={brandSaving}
            className={`btn-gradient px-6 py-3 rounded-lg font-medium ${brandSaving ? "loading" : ""}`}
          >
            {brandSaving ? "Saving..." : "Save Brand Settings"}
          </button>
        </div>
      </div>

      <hr className="border-white/10 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          <div className="card-elevated">
            <div className="card-body">
              <h2 className="card-title mb-4 text-white">Message Settings</h2>

              {/* Subject Line */}
              <div className="form-control">
                <label className="label">
                  <span className="text-gray-300 font-medium">Default Subject Line</span>
                </label>
                <input
                  type="text"
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                  value={config.default_subject}
                  onChange={(e) => setConfig({
                    ...config,
                    default_subject: e.target.value
                  })}
                  placeholder="Your Fitness Report - {date}"
                />
                <label className="label">
                  <span className="text-gray-400 text-xs">Use {`{date}`} for current date</span>
                </label>
              </div>

              {/* Message Body */}
              <div className="form-control">
                <label className="label">
                  <span className="text-gray-300 font-medium">Default Message</span>
                </label>
                <textarea
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 h-40"
                  value={config.default_message}
                  onChange={(e) => setConfig({
                    ...config,
                    default_message: e.target.value
                  })}
                  placeholder="Enter your default message..."
                />
                <label className="label">
                  <span className="text-gray-400 text-xs">
                    Available variables: {`{clientName}, {date}, {reportUrl}, {trainerName}`}
                  </span>
                </label>
              </div>

              {/* Signature */}
              <div className="form-control">
                <label className="label">
                  <span className="text-gray-300 font-medium">Signature</span>
                </label>
                <textarea
                  className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 h-20"
                  value={config.signature}
                  onChange={(e) => setConfig({
                    ...config,
                    signature: e.target.value
                  })}
                  placeholder="Best regards,\n{trainerName}"
                />
                <label className="label">
                  <span className="text-gray-400 text-xs">Use {`{trainerName}`} for your name</span>
                </label>
              </div>
            </div>
          </div>

          {/* Workout Exclusions */}
          <div className="card-elevated">
            <div className="card-body">
              <h2 className="card-title mb-4 text-white">Workout Exclusions</h2>
              <p className="text-sm text-gray-400 mb-4">
                Add workout names to exclude from all reports. This is useful for removing warm-up activities like Zone 2 Cardio or Walking from your reports.
              </p>

              {/* Add new exclusion */}
              <div className="form-control">
                <label className="label">
                  <span className="text-gray-300 font-medium">Exclude Workouts</span>
                </label>
                <div className="join w-full">
                  <input
                    type="text"
                    className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 join-item flex-1"
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
                    className="btn-gradient px-6 py-3 rounded-lg font-medium join-item"
                    onClick={addExcludedWorkout}
                    disabled={!newExcludedWorkout.trim()}
                  >
                    Add
                  </button>
                </div>
                <label className="label">
                  <span className="text-gray-400 text-xs">
                    Matching is case-insensitive and must match the exact workout name
                  </span>
                </label>
              </div>

              {/* List of excluded workouts */}
              {config.excluded_workout_names && config.excluded_workout_names.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2 text-white">Currently Excluded:</h3>
                  <div className="space-y-2">
                    {config.excluded_workout_names.map((workoutName, index) => (
                      <div key={index} className="flex items-center justify-between bg-bg-secondary p-3 rounded-lg">
                        <span className="text-sm text-white">{workoutName}</span>
                        <button
                          type="button"
                          className="glass border border-red-500/50 hover:border-red-500 text-red-400 px-2 py-1 rounded transition-all"
                          onClick={() => removeExcludedWorkout(index)}
                                                     title={`Remove ${workoutName} from exclusions`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!config.excluded_workout_names || config.excluded_workout_names.length === 0) && (
                <div className="text-center py-4 text-gray-400">
                  No workouts are currently excluded from reports
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Preview */}
        <div className="card-elevated h-fit">
          <div className="card-body">
            <h2 className="card-title mb-4 text-white">Message Preview</h2>

            <div className="bg-bg-secondary border border-white/10 rounded-lg p-4">
              <div className="border-b border-white/10 pb-2 mb-4">
                <div className="font-medium text-white">Subject: {config.default_subject.replace('{date}', new Date().toLocaleDateString())}</div>
                <div className="text-sm text-gray-400">To: John Smith</div>
              </div>

              <div className="whitespace-pre-line text-sm text-gray-300">
                {generatePreview()}
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              * This preview uses sample data to show how your message will appear to clients
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 