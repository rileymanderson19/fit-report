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
};

export default function ReportConfigPage() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  
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
        setConfig(data);
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

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-8 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">Error Loading Configuration</h2>
            <p>Unable to load your report configuration. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Report Configuration</h1>
          <p className="text-base-content/80 mt-2">
            Customize your default messaging when sending fitness reports to clients
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            className="btn btn-outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? "Edit" : "Preview"}
          </button>
          <button 
            className="btn btn-ghost"
            onClick={resetToDefaults}
          >
            Reset to Defaults
          </button>
          <button 
            className={`btn btn-primary ${saving ? "loading" : ""}`}
            onClick={saveConfig}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes("✅") ? "alert-success" : "alert-error"} mb-6`}>
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">Message Settings</h2>
              
              {/* Subject Line */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Default Subject Line</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={config.default_subject}
                  onChange={(e) => setConfig({
                    ...config,
                    default_subject: e.target.value
                  })}
                  placeholder="Your Fitness Report - {date}"
                />
                <label className="label">
                  <span className="label-text-alt">Use {`{date}`} for current date</span>
                </label>
              </div>

              {/* Message Body */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Default Message</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-40"
                  value={config.default_message}
                  onChange={(e) => setConfig({
                    ...config,
                    default_message: e.target.value
                  })}
                  placeholder="Enter your default message..."
                />
                <label className="label">
                  <span className="label-text-alt">
                    Available variables: {`{clientName}, {date}, {reportUrl}, {trainerName}`}
                  </span>
                </label>
              </div>

              {/* Signature */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Signature</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-20"
                  value={config.signature}
                  onChange={(e) => setConfig({
                    ...config,
                    signature: e.target.value
                  })}
                  placeholder="Best regards,\n{trainerName}"
                />
                <label className="label">
                  <span className="label-text-alt">Use {`{trainerName}`} for your name</span>
                </label>
              </div>
            </div>
          </div>


        </div>

        {/* Preview */}
        <div className="card bg-base-100 shadow-xl h-fit">
          <div className="card-body">
            <h2 className="card-title mb-4">Message Preview</h2>
            
            <div className="mockup-email bg-base-200 p-4 rounded-lg">
              <div className="border-b border-base-300 pb-2 mb-4">
                <div className="font-medium">Subject: {config.default_subject.replace('{date}', new Date().toLocaleDateString())}</div>
                <div className="text-sm text-base-content/60">To: John Smith</div>
              </div>
              
              <div className="whitespace-pre-line text-sm">
                {generatePreview()}
              </div>
            </div>

            <div className="mt-4 text-xs text-base-content/60">
              * This preview uses sample data to show how your message will appear to clients
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 