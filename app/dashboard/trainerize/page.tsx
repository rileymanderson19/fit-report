"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import toast from "react-hot-toast";

interface Trainer {
  firstName: string;
  id: string;
}

export default function TrainerizeConfigPage() {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    trainerId: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasBeenModified, setHasBeenModified] = useState(false);
  
  // New state for trainer list functionality
  const [isLoadingTrainerList, setIsLoadingTrainerList] = useState(false);
  const [trainerList, setTrainerList] = useState<Trainer[]>([]);
  const [showTrainerList, setShowTrainerList] = useState(false);

  // Load saved credentials when the page loads
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("You must be logged in to access this page");
          return;
        }

        // Get the user's profile with saved credentials
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("trainerize_username, trainerize_password, trainerize_id")
          .eq("id", user.id)
          .single();

        if (error) {
          throw error;
        }

        if (profile?.trainerize_username) {
          setFormData({
            username: profile.trainerize_username || "",
            password: profile.trainerize_password || "",
            trainerId: profile.trainerize_id || ""
          });
          // Don't set verification status for existing credentials
        }
      } catch (error) {
        console.error("Error loading saved credentials:", error);
        toast.error("Failed to load saved credentials");
      } finally {
        setIsInitializing(false);
      }
    };

    loadSavedCredentials();
  }, [supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasBeenModified(true);
    setVerificationStatus("idle");
    
    // Clear trainer list when credentials change
    if (name === "username" || name === "password") {
      setTrainerList([]);
      setShowTrainerList(false);
    }
  };

  const verifyCredentials = async (username: string, password: string, trainerId: string) => {
    try {
      const response = await fetch("/api/trainerize/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          trainerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      return true;
    } catch (error) {
      console.error("Verification error:", error);
      return false;
    }
  };

  // New function to fetch trainer list
  const fetchTrainerList = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Please enter username and password first");
      return;
    }

    setIsLoadingTrainerList(true);
    
    try {
      const response = await fetch("/api/trainerize/trainer-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
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
      toast.error(error instanceof Error ? error.message : "Failed to fetch trainer list");
      setTrainerList([]);
      setShowTrainerList(false);
    } finally {
      setIsLoadingTrainerList(false);
    }
  };

  // Function to copy trainer ID to clipboard
  const copyToClipboard = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Trainer ID copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If credentials haven't been modified, no need to verify or save
    if (!hasBeenModified) {
      toast.success("No changes to save");
      return;
    }

    setIsLoading(true);
    setVerificationStatus("idle");

    try {
      // Only verify if credentials have been modified
      const isValid = await verifyCredentials(formData.username, formData.password, formData.trainerId);
      
      if (!isValid) {
        setVerificationStatus("error");
        toast.error("Invalid credentials. Please check and try again.");
        return;
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to save credentials");
        return;
      }

      // Store the credentials in Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          trainerize_username: formData.username,
          trainerize_password: formData.password,
          trainerize_id: formData.trainerId
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setVerificationStatus("success");
      setHasBeenModified(false);
      // Clear trainer list on successful save
      setTrainerList([]);
      setShowTrainerList(false);
      toast.success("Credentials verified and saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while saving your credentials");
      setVerificationStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-accent-purple"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 gradient-text font-display">Trainerize Configuration</h1>
      <div className="card-elevated">
        <div className="card-body">
          <p className="mb-6 text-gray-300">Configure your Trainerize integration settings here</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="form-control w-full">
              <label htmlFor="username" className="label">
                <span className="text-gray-300">Username</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                placeholder="Enter your Trainerize username"
                disabled={isLoading}
              />
            </div>

            <div className="form-control w-full">
              <label htmlFor="password" className="label">
                <span className="text-gray-300">Password</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                placeholder="Enter your Trainerize password"
                disabled={isLoading}
              />
            </div>

            <div className="form-control w-full">
              <label htmlFor="trainerId" className="label">
                <span className="text-gray-300">Trainer ID</span>
              </label>
              <input
                type="text"
                id="trainerId"
                name="trainerId"
                value={formData.trainerId}
                onChange={handleChange}
                className="bg-bg-secondary border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-purple rounded-lg px-4 py-2 w-full"
                placeholder="Enter your Trainer ID"
                disabled={isLoading}
              />
            </div>
            
            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className={`btn-gradient ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || isLoadingTrainerList}
              >
                {isLoading ? 'Verifying...' : (hasBeenModified ? 'Save Changes' : 'Saved')}
              </button>

              <button
                type="button"
                onClick={fetchTrainerList}
                className={`glass border border-white/10 hover:border-accent-purple/50 text-white px-4 py-2 rounded-lg transition-all ${isLoadingTrainerList ? 'loading' : ''}`}
                disabled={isLoadingTrainerList || isLoading || !formData.username || !formData.password}
              >
                {isLoadingTrainerList ? 'Loading...' : 'Get Trainer ID'}
              </button>
            </div>

            {verificationStatus === "success" && hasBeenModified && (
              <div className="glass border border-green-500/30 bg-green-500/10 p-4 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-gray-300">Credentials verified and saved successfully!</span>
              </div>
            )}

            {verificationStatus === "error" && (
              <div className="glass border border-red-500/30 bg-red-500/10 p-4 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-gray-300">Invalid credentials. Please check and try again.</span>
              </div>
            )}
          </form>

          {/* Trainer List Display */}
          {showTrainerList && trainerList.length > 0 && (
            <div className="mt-6 max-w-md">
              <div className="card-elevated">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="card-title text-lg text-white">Available Trainers</h3>
                    <button
                      onClick={() => setShowTrainerList(false)}
                      className="glass border border-white/10 hover:border-red-500/50 text-white p-2 rounded transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {trainerList.map((trainer) => (
                      <div
                        key={trainer.id}
                        className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">{trainer.firstName}</p>
                          <p className="text-sm text-gray-400">ID: {trainer.id}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(trainer.id)}
                          className="glass border border-white/10 hover:border-accent-purple/50 text-white p-2 rounded transition-all"
                          title="Copy ID to clipboard"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-sm text-gray-400">
                    Click the copy icon to copy a Trainer ID to your clipboard, then paste it into the Trainer ID field above.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 