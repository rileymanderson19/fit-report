"use client";

import React, { useState } from "react";
import { createClient } from "@/libs/supabase/client";
import toast from "react-hot-toast";

export default function TrainerizeConfigPage() {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    trainerId: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVerificationStatus("idle");

    try {
      // First verify the credentials
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
      toast.success("Credentials verified and saved successfully!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while saving your credentials");
      setVerificationStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Trainerize Configuration</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <p className="mb-6 text-base-content/80">Configure your Trainerize integration settings here</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="form-control w-full">
              <label htmlFor="username" className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="Enter your Trainerize username"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-control w-full">
              <label htmlFor="password" className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="Enter your Trainerize password"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-control w-full">
              <label htmlFor="trainerId" className="label">
                <span className="label-text">Trainer ID</span>
              </label>
              <input
                type="text"
                id="trainerId"
                name="trainerId"
                value={formData.trainerId}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="Enter your Trainer ID"
                disabled={isLoading}
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Save Configuration'}
              </button>
            </div>

            {verificationStatus === "success" && (
              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Credentials verified and saved successfully!</span>
              </div>
            )}

            {verificationStatus === "error" && (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Invalid credentials. Please check and try again.</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
} 