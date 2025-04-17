"use client";

import React, { useState } from "react";

export default function TrainerizeConfigPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    trainerId: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would handle the API call to save the Trainerize credentials
    console.log("Saving Trainerize credentials:", formData);
    // You could add an API call here to save the data
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
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 