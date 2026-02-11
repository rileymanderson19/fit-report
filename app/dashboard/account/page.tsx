"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/libs/supabase/client";
import { toast } from "sonner";

export default function AccountPage() {
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Broadcast name changes to other components for real-time preview
  const broadcastNameChange = useCallback((first: string, last: string) => {
    const fullName = `${first.trim()} ${last.trim()}`.trim();
    window.dispatchEvent(new CustomEvent("profile-updated", { detail: { fullName } }));
  }, []);

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    broadcastNameChange(value, lastName);
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    broadcastNameChange(firstName, value);
  };

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        const nameParts = profile.full_name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
      }

      // Check if user has a password set
      try {
        const res = await fetch("/api/auth/change-password");
        if (res.ok) {
          const data = await res.json();
          setHasPassword(data.hasPassword);
        }
      } catch {
        // Ignore — default to no password
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Use upsert in case profile doesn't exist yet
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
        });

      if (error) throw error;

      // Notify other components (like ButtonAccount) to refresh
      window.dispatchEvent(new CustomEvent("profile-updated"));

      toast.success("Profile updated!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (hasPassword && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save password");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
      toast.success("Password saved!");
    } catch (error) {
      console.error("Error setting password:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save password"
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and account settings</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              className="input-field opacity-60 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Email cannot be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="John"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Doe"
              className="input-field"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="btn-primary px-6 py-2.5 rounded-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Password</h2>
        <p className="text-sm text-gray-500 mb-6">
          {hasPassword
            ? "Update your password."
            : "Set a password so you can sign in with your email and password."}
        </p>

        <div className="space-y-5">
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className="input-field"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handlePasswordSave}
              className="btn-primary px-6 py-2.5 rounded-lg"
              disabled={isSavingPassword || !newPassword}
            >
              {isSavingPassword ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Password"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
