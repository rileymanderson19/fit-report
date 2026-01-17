"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { User } from "@supabase/supabase-js";

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
          <h1 className="text-3xl font-bold gradient-text font-display">Report Configuration</h1>
          <p className="text-gray-300 mt-2">
            Customize your default messaging when sending fitness reports to clients
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
            className={`btn-gradient ${saving ? "loading" : ""}`}
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
                    className="btn-gradient join-item"
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